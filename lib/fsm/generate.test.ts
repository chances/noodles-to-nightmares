import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { generate } from "./generate.ts";
import { syncMissions } from "./sync.ts";
import { defineMission } from "./types.ts";
import { cond, step } from "./vocabulary.ts";

const fixture = defineMission({
  header: ["Fixture"],
  start: "A",
  onFail: "LOSE",
  fail: [cond.playerDead()],
  monitors: [{
    id: "hint",
    when: [cond.playerInCar()],
    once: [step.help("Hi")],
  }],
  states: {
    A: {
      beats: [{ do: [step.say("One", 1000)], wait: 500 }],
      until: [cond.playerBusted()],
      next: "B",
    },
    B: {
      fail: false,
      onEnter: [step.help("In B")],
      onExit: [step.help("Out of B")],
      finish: true,
    },
    LOSE: { fail: false, resetLatches: true, next: "A" },
  },
});

Deno.test("declares a numbered constant per state and the FSM locals", () => {
  const text = generate(fixture, "missions/fixture.states.ts");
  assertStringIncludes(text, "const STATE_A = 0");
  assertStringIncludes(text, "const STATE_LOSE = 2");
  assertStringIncludes(text, "int state = STATE_A");
  assertStringIncludes(text, "int beat = 0");
  assertStringIncludes(text, "int latchHint = false");
  assertStringIncludes(text, "GENERATED from missions/fixture.states.ts");
});

Deno.test("a beat runs its steps once, then waits on TIMERA", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    'Text.PrintString("One", 1000)\n      TIMERA = 0\n      beat = 1',
  );
  assertStringIncludes(text, "TIMERA >= 500");
});

Deno.test("fail check covers only states that allow it", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    "      state == STATE_A\n    then\n      exitState()\n      state = STATE_LOSE",
  );
  // Only state A allows the fail check, so it is a single condition, not an `or` of states
  assert(!text.includes("if or\n      state == STATE_A"));
});

Deno.test("transitions call exitState and enterState when a state has onExit", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    "exitState()\n        state = STATE_B\n        enterState()",
  );
  assertStringIncludes(text, ":exitState");
});

Deno.test("resetLatches clears every latch on entry", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    "state == STATE_LOSE\n  then\n    latchHint = false",
  );
});

Deno.test("a state with finish calls finishMission", () => {
  assertStringIncludes(generate(fixture, "x"), "finishMission()");
});

Deno.test("an unknown target state is rejected", () => {
  const bad = { ...fixture, onFail: "NOPE" } as unknown as typeof fixture;
  assertThrows(() => generate(bad, "x"), Error, "unknown state NOPE");
});

Deno.test("until without next is rejected", () => {
  const bad = {
    ...fixture,
    states: { ...fixture.states, A: { until: [cond.playerBusted()] } },
  };
  assertThrows(() => generate(bad, "x"), Error, "until but no next");
});

Deno.test("the committed generated missions match their tables", async () => {
  const { stale } = await syncMissions(Deno.cwd(), { write: false });
  assertEquals(stale, []);
});
