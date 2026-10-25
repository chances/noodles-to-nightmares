import { assert, assertEquals } from "@std/assert";
import type { Mission, Problem } from "@noodles/fsm";
import { ScriptWriter } from "./script-emit.ts";

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** A table that generates, with the header saying which save wrote it. */
const mission = (header: string) =>
  ({
    header: [header],
    start: "A",
    onFail: "LOSE",
    fail: [],
    states: {
      A: { next: "B" },
      B: { finish: true },
      LOSE: { fail: false, next: "A" },
    },
  }) as Mission;

const error: Problem = { severity: "error", message: "bad" };
const warning: Problem = { severity: "warning", message: "meh" };

Deno.test("a save with an error lint writes no .txt", async () => {
  const written: string[] = [];
  const emitter = new ScriptWriter(async (stem) => {
    written.push(stem);
  }, 5);
  emitter.schedule("1_test", "fsm.json", mission("Errs"), [error]);
  await sleep(40);
  assertEquals(written, []);
});

Deno.test("a save with only warning lints writes the .txt", async () => {
  const written: [string, string][] = [];
  const emitter = new ScriptWriter(async (stem, text) => {
    written.push([stem, text]);
  }, 5);
  emitter.schedule("1_test", "fsm.json", mission("Warns"), [warning]);
  await sleep(40);
  assertEquals(written.length, 1);
  assertEquals(written[0][0], "1_test");
  assert(written[0][1].includes("// GENERATED from missions/1_test.fsm.json"));
});

Deno.test("saves within the delay coalesce into one write of the last table", async () => {
  const written: string[] = [];
  const emitter = new ScriptWriter(async (_stem, text) => {
    written.push(text);
  }, 20);
  emitter.schedule("1_test", "fsm.json", mission("First"), []);
  emitter.schedule("1_test", "fsm.json", mission("Second"), []);
  emitter.schedule("1_test", "fsm.json", mission("Third"), []);
  await sleep(80);
  assertEquals(written.length, 1);
  assert(written[0].includes("Third"));
  assert(!written[0].includes("First"));
});

Deno.test("an error save cancels a write still waiting, so the .txt keeps its last valid text", async () => {
  const written: string[] = [];
  const emitter = new ScriptWriter(async (_stem, text) => {
    written.push(text);
  }, 20);
  emitter.schedule("1_test", "fsm.json", mission("Valid"), []);
  emitter.schedule("1_test", "fsm.json", mission("Broken"), [error]);
  await sleep(80);
  assertEquals(written, []);
});
