import { assertEquals } from "@std/assert";
import { problems } from "./problems.ts";
import { defineMission } from "./types.ts";
import { cond } from "./vocabulary.ts";

const ok = defineMission({
  header: ["Fixture"],
  start: "A",
  onFail: "LOSE",
  fail: [cond.playerDead()],
  states: {
    A: { next: "WIN" },
    WIN: { finish: true },
    LOSE: { next: "A" },
  },
});

Deno.test("a sound table has no problems", () => {
  assertEquals(problems(ok), []);
});

Deno.test("locals are checked for names and the CLEO limit of 16", () => {
  const locals = Array.from({ length: 15 }, (_, i) => ({
    name: `l${i}`,
    type: "int",
  }));
  assertEquals(problems({ ...ok, locals }).map((p) => p.message), [
    "The mission needs 17 locals, but a CLEO script has 16",
  ]);
  assertEquals(
    problems({
      ...ok,
      locals: [{ name: "a", type: "int" }, { name: "a", type: "int" }],
    })
      .map((p) => p.message),
    ["Two locals are named a"],
  );
});

Deno.test("a wait without a next state is an error on that state", () => {
  const broken = {
    ...ok,
    states: { ...ok.states, A: { until: [cond.playerDead()] } },
  };
  const found = problems(broken);
  assertEquals(found[0], {
    severity: "error",
    message: "A waits on a condition but has no Next state",
    state: "A",
  });
});

Deno.test("a latch no monitor makes is an error on the state that reads it", () => {
  const broken = {
    ...ok,
    states: {
      ...ok.states,
      A: { until: [cond.latchClear("driveHint")], next: "WIN" },
    },
  };
  assertEquals(problems(broken)[0], {
    severity: "error",
    message: "latchDriveHint is read or set, but no monitor makes it",
    state: "A",
  });
  const fixed = {
    ...broken,
    monitors: [{ id: "driveHint", when: [cond.playerDead()], once: [] }],
  };
  assertEquals(problems(fixed), []);
});

Deno.test("empty conditions and steps are errors", () => {
  const broken = {
    ...ok,
    fail: [{ test: " " }],
    states: { ...ok.states, A: { next: "WIN", onEnter: [[""]] } },
  };
  const messages = problems(broken).filter((p) => p.severity === "error").map((
    p,
  ) => p.message);
  assertEquals(messages, [
    "The mission's fail list has an empty condition",
    "A has an empty enter step",
  ]);
});

Deno.test("a conditional step with no condition is an error", () => {
  const broken = {
    ...ok,
    states: {
      ...ok.states,
      A: { next: "WIN", onEnter: [["if and", "then", "end"]] },
    },
  };
  assertEquals(
    problems(broken)[0].message,
    "A conditional step has no condition",
  );
});

Deno.test("warnings: stranded, unreachable, and no finish", () => {
  const warned = {
    ...ok,
    states: { ...ok.states, ORPHAN: {}, WIN: {} },
  };
  const messages = problems(warned).map((p) => p.message);
  assertEquals(messages, [
    "WIN has no way out and does not finish the mission",
    "ORPHAN has no way out and does not finish the mission",
    "Nothing leads to ORPHAN",
    "No state finishes the mission",
  ]);
});

Deno.test("monitor and constant names must be identifiers, and unique", () => {
  const broken = {
    ...ok,
    consts: { "bad name": 1 },
    monitors: [
      { id: "hint", when: [], once: [] },
      { id: "hint", when: [], once: [] },
    ],
  };
  const messages = problems(broken).map((p) => p.message);
  assertEquals(messages, [
    "Two monitors are named hint",
    'Constant "bad name" needs a name that starts with a letter',
  ]);
});
