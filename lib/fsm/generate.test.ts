import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { generate } from "./generate.ts";
import { cutsceneRegions } from "./graph.ts";
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
  assertStringIncludes(text, "int latchHint = false");
  assertStringIncludes(text, "GENERATED from missions/fixture.states.ts");
  assert(!text.includes("int beat"));
  assert(!text.includes("enterState"));
});

Deno.test("a dispatcher calls the routine of the current state", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    "while true\n  wait 0\n\n  if\n    state == STATE_A\n  then\n    stateA()\n  end",
  );
  assertStringIncludes(text, ":stateA\n");
  assertStringIncludes(text, ":stateLose\n");
});

const awaiting = defineMission({
  header: ["Awaiting"],
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
      beats: [
        { await: [cond.playerBusted(), cond.playerInCar()] },
        { do: [step.say("Next", 1000)] },
      ],
      next: "B",
    },
    B: { fail: false, finish: true },
    LOSE: { fail: false, resetLatches: true, next: "A" },
  },
});

Deno.test("an await beat spin-waits with the watchers, then breaks out once every condition holds", () => {
  const text = generate(awaiting, "x");
  assertStringIncludes(
    text,
    [
      "  while true",
      "    wait 0",
      "    runMonitors()",
      "    failCheck()",
      "    if",
      "      state == STATE_LOSE",
      "    then",
      "      return",
      "    end",
      "    if and",
      "      Player.HasBeenArrested($player)",
      "      Player.IsInAnyCar($player)",
      "    then",
      "      break",
      "    end",
      "  end",
      '  Text.PrintString("Next", 1000)',
    ].join("\n"),
  );
});

Deno.test("an await beat with no conditions is skipped, steps and all", () => {
  const empty = defineMission({
    header: ["Empty"],
    start: "A",
    onFail: "B",
    fail: [],
    states: {
      A: {
        beats: [{ await: [], do: [step.say("Never", 1000)] }],
        next: "B",
      },
      B: { fail: false, finish: true },
    },
  });
  const text = generate(empty, "x");
  assert(!text.includes('"Never"'));
  assert(!text.includes("if and"));
});

Deno.test("a watched state waits out a beat in a TIMERA loop that runs the watchers", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    [
      '  Text.PrintString("One", 1000)',
      "  TIMERA = 0",
      "  while TIMERA < 500",
      "    wait 0",
      "    runMonitors()",
      "    failCheck()",
      "    if",
      "      state == STATE_LOSE",
      "    then",
      "      return",
      "    end",
      "  end",
    ].join("\n"),
  );
});

const timed = defineMission({
  header: ["Timed"],
  start: "A",
  onFail: "LOSE",
  fail: [cond.playerDead()],
  states: {
    A: { timeLimit: 90, onEnter: [step.help("In A")], next: "B" },
    B: { fail: false, finish: true },
    LOSE: { fail: false, next: "A" },
  },
});

Deno.test("a state with a time limit restarts TIMERB on entry and goes to the fail state when it passes", () => {
  const text = generate(timed, "x");
  assertStringIncludes(text, ":stateA\n  TIMERA = 0\n  TIMERB = 0\n");
  assertStringIncludes(
    text,
    [
      "    if",
      "      TIMERB > 90000",
      "    then",
      "      state = STATE_LOSE",
      "      return",
      "    end",
    ].join("\n"),
  );
});

Deno.test("a state with a time limit and showTimer displays and clears $hudTimer", () => {
  const mission = defineMission({
    header: ["Timed HUD"],
    start: "A",
    onFail: "LOSE",
    fail: [cond.playerDead()],
    states: {
      A: { timeLimit: 90, showTimer: true, onEnter: [step.help("In A")], next: "B" },
      B: { fail: false, finish: true },
      LOSE: { fail: false, next: "A" },
    },
  });
  const text = generate(mission, "x");
  assertStringIncludes(
    text,
    ":stateA\n  TIMERA = 0\n  TIMERB = 0\n  $hudTimer = 90000\n  Hud.DisplayTimer($hudTimer)\n",
  );
  assertStringIncludes(
    text,
    ":leaveA\n  Hud.ClearTimer($hudTimer)\n  return\n",
  );
});

Deno.test("a state without a time limit never reads TIMERB", () => {
  const text = generate(fixture, "x");
  assert(!text.includes("TIMERB"));
});

Deno.test("a time limit must be above 0 and cannot finish the mission", () => {
  assertThrows(() =>
    generate(
      defineMission({
        header: ["Bad"],
        start: "A",
        onFail: "LOSE",
        fail: [cond.playerDead()],
        states: {
          A: { timeLimit: 0, finish: true },
          LOSE: { fail: false, finish: true },
        },
      }),
      "x",
    )
  );
  assertThrows(() =>
    generate(
      defineMission({
        header: ["Bad"],
        start: "A",
        onFail: "LOSE",
        fail: [cond.playerDead()],
        states: {
          A: { timeLimit: 30, finish: true },
          LOSE: { fail: false, finish: true },
        },
      }),
      "x",
    )
  );
});

Deno.test("a state with until ticks in its own loop and leaves by return", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    [
      "  while true",
      "    wait 0",
      "    runMonitors()",
      "    failCheck()",
      "    if",
      "      state == STATE_LOSE",
      "    then",
      "      return",
      "    end",
      "    if",
      "      Player.HasBeenArrested($player)",
      "    then",
      "      state = STATE_B",
      "      return",
      "    end",
      "  end",
    ].join("\n"),
  );
});

Deno.test("failCheck sets the onFail state and only exists when a state can fail", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(
    text,
    ":failCheck\n  if\n    Player.IsDead($player)\n  then\n    state = STATE_LOSE\n  end\n  return",
  );
  // States with fail: false never call it
  const lose = text.slice(
    text.indexOf(":stateLose"),
    text.indexOf(":failCheck"),
  );
  assert(!lose.includes("failCheck()"));
});

Deno.test("a state with onExit calls its leave routine before it hands over", () => {
  const exiting = defineMission({
    header: ["Exit"],
    start: "A",
    onFail: "LOSE",
    fail: [],
    states: {
      A: { onExit: [step.help("Out of A")], next: "B" },
      B: { finish: true },
      LOSE: { next: "A" },
    },
  });
  const text = generate(exiting, "x");
  assertStringIncludes(text, "  leaveA()\n  state = STATE_B\n  return");
  assertStringIncludes(text, ":leaveA\n");
  assert(!text.includes("failCheck"));
});

Deno.test("resetLatches clears every latch when the state is entered", () => {
  const text = generate(fixture, "x");
  assertStringIncludes(text, ":stateLose\n  TIMERA = 0\n  latchHint = false");
});

Deno.test("a state with finish calls finishMission", () => {
  assertStringIncludes(generate(fixture, "x"), "finishMission()\n  return");
});

Deno.test("declared locals are emitted before the latches", () => {
  const text = generate(
    {
      ...fixture,
      locals: [
        { name: "sal", type: "Char" },
        { name: "heading", type: "float", value: "0.0" },
      ],
    },
    "missions/fixture.states.ts",
  );
  assertStringIncludes(text, "Char sal\nfloat heading = 0.0\nint latchHint");
});

Deno.test("branches are an if/else chain that ends in next", () => {
  const text = generate(
    {
      ...fixture,
      states: {
        ...fixture.states,
        A: {
          on: [{ when: [cond.playerBusted()], goto: "LOSE" }],
          next: "B",
        },
      },
    },
    "missions/fixture.states.ts",
  );
  assertStringIncludes(
    text,
    [
      "  if",
      "    Player.HasBeenArrested($player)",
      "  then",
      "    state = STATE_LOSE",
      "    return",
      "  else",
      "    state = STATE_B",
      "    return",
      "  end",
    ].join("\n"),
  );
});

Deno.test("a state nothing watches runs its beats as plain waits", () => {
  const quiet = defineMission({
    header: ["Quiet"],
    start: "A",
    onFail: "LOSE",
    fail: [cond.playerDead()],
    states: {
      A: {
        fail: false,
        beats: [
          { do: [step.say("One", 1000)], wait: 500 },
          {
            when: [cond.playerInCar()],
            do: [step.say("Two", 1000)],
            wait: 250,
          },
        ],
        until: [cond.playerBusted()],
        next: "WIN",
      },
      WIN: { fail: false, finish: true },
      LOSE: { fail: false, next: "A" },
    },
  });
  const text = generate(quiet, "missions/quiet.states.ts");
  assertStringIncludes(
    text,
    [
      '  Text.PrintString("One", 1000)',
      "  wait 500",
      "  if",
      "    Player.IsInAnyCar($player)",
      "  then",
      '    Text.PrintString("Two", 1000)',
      "    wait 250",
      "  end",
      "  while true",
      "    wait 0",
      "    if",
      "      Player.HasBeenArrested($player)",
    ].join("\n"),
  );
  assert(!text.includes("TIMERA <"));
  assert(!text.includes(":failCheck"));
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

Deno.test("finish with next is rejected", () => {
  const bad = {
    ...fixture,
    states: { ...fixture.states, B: { fail: false, finish: true, next: "A" } },
  };
  assertThrows(
    () => generate(bad, "x"),
    Error,
    "finish with next, until, or on",
  );
});

Deno.test("an onFail state the fail check watches is rejected", () => {
  const bad = {
    ...fixture,
    states: { ...fixture.states, LOSE: { next: "A" } },
  };
  assertThrows(
    () => generate(bad, "x"),
    Error,
    "onFail state LOSE must set fail: false",
  );
});

const scene = defineMission({
  header: ["Scene"],
  start: "A",
  onFail: "LOSE",
  fail: [],
  states: {
    A: { kind: "cutscene", next: "B" },
    B: { kind: "cutscene", next: "C" },
    C: { next: "D" },
    D: { finish: true },
    LOSE: { next: "A" },
  },
});

Deno.test("cutsceneRegions groups the cutscene states that link to each other", () => {
  assertEquals(cutsceneRegions(scene), [["A", "B"]]);
});

const beatScene = defineMission({
  header: ["Beat scene"],
  start: "A",
  onFail: "LOSE",
  fail: [],
  states: {
    A: { beats: [{ wait: 1000 }], next: "B" },
    B: { beats: [{ wait: 1000 }], next: "C" },
    C: { next: "D" },
    D: { finish: true },
    LOSE: { next: "A" },
  },
});

Deno.test("cutsceneRegions counts a state with beats and no kind as a cutscene, as the editor shows it", () => {
  assertEquals(cutsceneRegions(beatScene), [["A", "B"]]);
});

Deno.test("a cutscene region sets the flag and letterbox on entry and clears them on exit", () => {
  const text = generate(scene, "x");
  assertStringIncludes(
    text,
    "$onMission = true\n$onCutscene = true\nHud.SwitchWidescreen(true)\n",
  );
  // Inside the region a transition needs no cutscene lines
  assertStringIncludes(
    text,
    ":stateA\n  TIMERA = 0\n  state = STATE_B\n  return",
  );
  assertStringIncludes(
    text,
    "  $onCutscene = false\n  Hud.SwitchWidescreen(false)\n  state = STATE_C\n  return",
  );
  assertStringIncludes(
    text,
    "  $onCutscene = true\n  Hud.SwitchWidescreen(true)\n  state = STATE_A\n  return",
  );
});

Deno.test("a region that finishes the mission clears its flags first", () => {
  const ending = defineMission({
    header: ["Ending"],
    start: "A",
    onFail: "A",
    fail: [],
    states: { A: { kind: "cutscene", finish: true } },
  });
  assertStringIncludes(
    generate(ending, "x"),
    "  $onCutscene = false\n  Hud.SwitchWidescreen(false)\n  finishMission()",
  );
});

Deno.test("the committed generated missions match their tables", async () => {
  const { stale } = await syncMissions(Deno.cwd(), { write: false });
  assertEquals(stale, []);
});
