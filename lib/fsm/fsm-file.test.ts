import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  assertReferences,
  docFromMission,
  listMissions,
  loadMission,
  parseFsmDoc,
  saveMission,
} from "./fsm-file.ts";
import { layout, NODE, transitions } from "./graph.ts";
import { defineMission } from "./types.ts";
import { cond, step } from "./vocabulary.ts";

const table = defineMission({
  header: ["Fixture"],
  start: "A",
  onFail: "LOSE",
  fail: [cond.playerDead()],
  states: {
    A: { beats: [{ do: [step.say("One", 1000)], wait: 500 }], next: "B" },
    B: {
      on: [{ when: [cond.playerBusted()], goto: "WIN" }, {
        when: [cond.playerDead()],
        goto: "A",
      }],
    },
    WIN: { finish: true },
    LOSE: { next: "A" },
  },
});

Deno.test("transitions lists next and on edges", () => {
  assertEquals(transitions(table), [
    { from: "A", to: "B", kind: "next" },
    { from: "B", to: "WIN", kind: "on" },
    { from: "B", to: "A", kind: "on" },
    { from: "LOSE", to: "A", kind: "next" },
  ]);
});

Deno.test("layout puts branches side by side in a row", () => {
  const branching = defineMission({
    header: ["Fixture"],
    start: "S",
    onFail: "S",
    fail: [],
    states: {
      S: {
        on: [{ when: [cond.playerDead()], goto: "X" }, {
          when: [cond.playerBusted()],
          goto: "Y",
        }],
      },
      X: { finish: true },
      Y: { finish: true },
    },
  });
  const column = NODE.width + NODE.gapX;
  const row = NODE.height + NODE.gapY;
  assertEquals(layout(branching), {
    S: { x: 0, y: 0 },
    X: { x: 0, y: row },
    Y: { x: column, y: row },
  });
});

Deno.test("layout stacks states by distance down the page and unreachable states in a column to the right", () => {
  const column = NODE.width + NODE.gapX;
  const row = NODE.height + NODE.gapY;
  assertEquals(layout(table), {
    A: { x: 0, y: 0 },
    B: { x: 0, y: row },
    WIN: { x: 0, y: 2 * row },
    LOSE: { x: column, y: 0 },
  });
});

Deno.test("a state that does not exist fails the reference check", () => {
  const broken = { ...table, states: { ...table.states, A: { next: "NOPE" } } };
  assertThrows(
    () => assertReferences(broken),
    Error,
    "A.next names unknown state NOPE",
  );
});

Deno.test("parseFsmDoc fills in layout for states the file leaves out", () => {
  const doc = parseFsmDoc({
    version: 1,
    mission: JSON.parse(JSON.stringify(table)),
    layout: { A: { x: 5, y: 6 } },
  });
  assertEquals(doc.layout.A, { x: 5, y: 6 });
  assertEquals(doc.layout.B, layout(table).B);
});

Deno.test("parseFsmDoc names the path of a bad field", () => {
  const mission = JSON.parse(JSON.stringify(table));
  mission.states.A.beats = [{ wait: "soon" }];
  assertThrows(
    () => parseFsmDoc({ version: 1, mission }),
    Error,
    "mission.states.A.beats.0.wait",
  );
});

Deno.test("loading reads a .fsm.json and lists it", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(dir, "7_demo.fsm.json"),
      JSON.stringify(docFromMission(table)),
    );
    assertEquals(await listMissions(dir), [{
      stem: "7_demo",
      source: "fsm.json",
    }]);
    const doc = await loadMission(dir, "7_demo");
    assertEquals(doc?.source, "fsm.json");
    assertEquals(Object.keys(doc!.mission.states), ["A", "B", "WIN", "LOSE"]);
    assertEquals(await loadMission(dir, "missing"), undefined);
    assertEquals(await loadMission(dir, "../escape"), undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("a folder that does not exist lists no missions", async () => {
  const dir = await Deno.makeTempDir();
  try {
    assertEquals(await listMissions(join(dir, "nope")), []);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("a .fsm.json wins over a .states.ts of the same stem", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const fsm = JSON.stringify(docFromMission(table));
    await Deno.writeTextFile(join(dir, "7_demo.fsm.json"), fsm);
    await Deno.writeTextFile(
      join(dir, "7_demo.states.ts"),
      `export default ${
        JSON.stringify({ ...table, header: ["From TypeScript"] })
      };`,
    );
    assertEquals(await listMissions(dir), [{
      stem: "7_demo",
      source: "fsm.json",
    }]);
    assertEquals((await loadMission(dir, "7_demo"))?.mission.header, [
      "Fixture",
    ]);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("saving writes a .fsm.json that loads back, and refuses an invalid table", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const edited = { ...table, header: ["Edited"] };
    const saved = await saveMission(dir, "7_demo", {
      version: 1,
      mission: edited,
      layout: { A: { x: 1, y: 2 } },
    });
    assertEquals(saved.source, "fsm.json");
    const loaded = await loadMission(dir, "7_demo");
    assertEquals(loaded?.mission.header, ["Edited"]);
    assertEquals(loaded?.layout.A, { x: 1, y: 2 });

    const dangling = {
      ...table,
      states: { ...table.states, A: { next: "NOPE" } },
    };
    await assertRejects(
      () => saveMission(dir, "7_demo", { version: 1, mission: dangling }),
      Error,
      "unknown state NOPE",
    );
    assertEquals((await loadMission(dir, "7_demo"))?.mission.header, [
      "Edited",
    ]);
    await assertRejects(
      () => saveMission(dir, "../escape", { version: 1, mission: edited }),
      Error,
      "invalid mission name",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("an invalid .fsm.json rejects with the reason", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(dir, "7_bad.fsm.json"), `{"version": 2}`);
    await assertRejects(
      () => loadMission(dir, "7_bad"),
      Error,
      "invalid .fsm.json",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
