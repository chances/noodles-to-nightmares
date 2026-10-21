import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { AlertStore } from "./alerts.ts";
import { LOG_SOURCES, RULES_PATH } from "./config.ts";
import {
  type GameProcess,
  Monitor,
  type MonitorDeps,
  parseTasklist,
} from "./monitor.ts";
import { applyAbsentRules, applyRules, loadRules } from "./rules.ts";

const ids = LOG_SOURCES.map((source) => source.id);
const rules = await loadRules(RULES_PATH, ids);

async function fixture() {
  const dir = await Deno.makeTempDir();
  const game = join(dir, "game");
  await Deno.mkdir(join(game, "CLEO"), { recursive: true });
  await Deno.mkdir(join(game, "modloader"), { recursive: true });
  const store = new AlertStore(
    join(dir, "alerts.jsonl"),
    join(dir, "state.json"),
  );
  let processes: GameProcess[] = [];
  const deps: MonitorDeps = {
    settleMs: 0,
    listProcesses: () => Promise.resolve(processes),
    processStartStamp: (pid) => Promise.resolve(`stamp${pid}`),
  };
  const monitor = new Monitor(game, rules, store, deps);
  return {
    dir,
    game,
    store,
    monitor,
    setProcesses: (next: GameProcess[]) => (processes = next),
    write: (name: string, body: string) =>
      Deno.writeTextFile(join(game, name), body),
    append: (name: string, body: string) =>
      Deno.writeTextFile(join(game, name), body, { append: true }),
  };
}

Deno.test("tasklist parser finds gta3-game.exe and gta3.exe, ignores lookalikes", () => {
  const csv = [
    '"System","4","Services","0","144 K"',
    '"gta3-game.exe","4321","Console","1","210,000 K"',
    '"GTA3.EXE","99","Console","1","1 K"',
    '"gta3-launcher.exe","7","Console","1","1 K"',
    '"notgta3.exe","8","Console","1","1 K"',
  ].join("\r\n");
  assertEquals(parseTasklist(csv), [
    { name: "gta3-game.exe", pid: 4321 },
    { name: "GTA3.EXE", pid: 99 },
  ]);
});

Deno.test("shipped rules load and every source id is known", () => {
  assert(rules.length >= 8);
});

Deno.test("real-world baseline lines raise no findings", () => {
  const redux =
    "09:32:05 [WARN] The host version is unknown or unsupported.\n09:32:06 [WARN] Plugin attempted to register an unknown command IMGUI_LOAD_CUSTOM_FONT. Check\n";
  assertEquals(applyRules(rules, "cleo_redux", redux), []);
  const modloader =
    'Warning: Failed to startup plugin "gta3.std.bank", unloading it.\nStarting up plugin "gta3.std.asi"\n';
  assertEquals(applyRules(rules, "modloader", modloader), []);
  const cleo =
    "Loaded plugin III.IniFiles.cleo\n--Game Shutdown--\nUnloaded plugin TextLoader.cleo\n";
  assertEquals(applyRules(rules, "cleo", cleo), []);
  assertEquals(applyAbsentRules(rules, "cleo", cleo), []);
});

Deno.test("rules flag the known problems", () => {
  assertEquals(
    applyRules(rules, "debug_ini", "[Blips]\nVan=-1\nPayphone=131074\n").length,
    1,
  );
  assertEquals(
    applyRules(rules, "cleo", "Incorrect opcode ID: 0AF3\n").length,
    1,
  );
  const spam = "00019693&0: [034F] REMOVE_CHAR_ELEGANTLY\n".repeat(6);
  assertEquals(applyRules(rules, "scrlog", spam).map((f) => f.rule.id), [
    "scrlog-repeated-remove-elegantly",
  ]);
  assertEquals(applyAbsentRules(rules, "scrlog", "frames...\n").length, 1);
});

Deno.test("append logs: partial line waits, rewrite resets, repeats dedupe", async () => {
  const f = await fixture();
  f.setProcesses([{ name: "gta3.exe", pid: 7 }]);
  await f.write("cleo.log", "Loaded script ok\n");
  await f.monitor.tick();
  assertEquals(
    f.monitor.session,
    "7-stampstamp7".replace("stampstamp", "stamp"),
  );
  await f.append("cleo.log", "Incorrect opcode ID: 0AF3");
  await f.monitor.tick();
  assertEquals((await f.store.list()).length, 0);
  await f.append("cleo.log", "\n");
  await f.monitor.tick();
  assertEquals((await f.store.list()).length, 1);
  await f.write("cleo.log", "Incorrect opcode ID: 0AF3\n");
  await f.monitor.tick();
  assertEquals((await f.store.list()).length, 1);
});

Deno.test("snapshot INI and exit-only scrlog; exit without markers is critical", async () => {
  const f = await fixture();
  f.setProcesses([{ name: "gta3.exe", pid: 9 }]);
  await f.write("CLEO/debug.ini", "[Blips]\nVan=-1\n");
  await f.write("scrlog.log", "00001&0: [0001] WAIT\n");
  await f.write("cleo.log", "Game Init\n");
  await f.monitor.tick();
  assertEquals((await f.store.list()).map((a) => a.rule), [
    "debug-ini-negative-handle",
  ]);
  f.setProcesses([]);
  await f.monitor.tick();
  const rulesFired = (await f.store.list()).map((a) => a.rule).sort();
  assertEquals(rulesFired, [
    "cleo-no-clean-shutdown",
    "debug-ini-negative-handle",
    "game-exited",
    "scrlog-no-clean-shutdown",
  ]);
  assertEquals(f.monitor.running, false);
  assert(f.monitor.lastExit);
});

Deno.test("ack hides alerts; clear_logs refuses while running", async () => {
  const f = await fixture();
  f.setProcesses([{ name: "gta3.exe", pid: 3 }]);
  await f.write("cleo.log", "Incorrect opcode ID: 0AF3\n");
  await f.monitor.tick();
  assertEquals(await f.store.ack("all", f.monitor.session), 1);
  assertEquals((await f.store.list()).length, 0);
  assertEquals((await f.store.list({ includeAcked: true })).length, 1);
  await assertRejects(() => f.monitor.clearLogs(), Error, "running");
  f.setProcesses([]);
  await f.monitor.tick();
  assertEquals((await f.monitor.clearLogs()).includes("cleo"), true);
  assertEquals((await Deno.stat(join(f.game, "cleo.log"))).size, 0);
});

Deno.test("init with no game scans the last run under a stale session", async () => {
  const f = await fixture();
  await f.write("cleo.log", "Incorrect opcode ID: 0AF3\n");
  await f.monitor.init();
  assertEquals(f.monitor.session, "last-run");
  const rulesFired = (await f.store.list()).map((a) => a.rule);
  assert(rulesFired.includes("cleo-incorrect-opcode"));
  assert(rulesFired.includes("cleo-no-clean-shutdown"));
});
