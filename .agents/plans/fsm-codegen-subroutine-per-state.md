# FSM Codegen: Subroutine per State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `lib/fsm/generate.ts` emit one label subroutine per state, each with its own tick loop, so a mission pays no per-tick state dispatch or beat ladder.

**Architecture:** A dispatcher loop calls the routine of the current state. A routine runs its enter steps and beats, then ticks in its own loop until a transition holds; it sets `state` and `return`s. Watched states (monitors, or the mission fail check) wait out beats in `TIMERA` loops that run the watchers; other states use plain `wait`s.

**Tech Stack:** Deno, TypeScript, `@std/assert`, Sanny Builder (CLEO III `.cm` output).

**Spec:** [`../reports/fsm-codegen-patterns.md`](../reports/fsm-codegen-patterns.md). Rejected alternatives: [`../reports/rejected-fsm-codegen-options.md`](../reports/rejected-fsm-codegen-options.md).

## Global Constraints

- Routines are label subroutines (`:name` ending in `return`, called as `name()`), never `function`s, because a `function` cannot see the script's locals.
- The game keeps six `gosub` return addresses per script (`m_aGosubAddr[6]`). Generated code nests at most two deep (a state routine calling `failCheck`, `runMonitors`, or a `leave` routine), plus whatever a step calls.
- No new globals and no `goto`.
- No CLEO plugin.
- A script has 16 CLEO locals. The generator no longer declares `beat`.
- Run tests as `deno test lib/fsm` with no pipes.
- `missions/*.txt` that have a table are generated: regenerate with `deno task build:missions`, never edit by hand.
- Never run `git commit` or `git add`. The user alone commits.
- Docs record current state only: no dated logs, no "was:" history.

## File Structure

| File | Change | Responsibility |
| :--- | :--- | :--- |
| `lib/fsm/emit.ts` | Modify | Add `stateLabel`, `leaveLabel`, `whileBlock`; drop nothing |
| `lib/fsm/emit.test.ts` | Create | Tests for the three helpers |
| `lib/fsm/generate.ts` | Rewrite the body | Emit dispatcher, state routines, `leave` routines, `failCheck`, `runMonitors` |
| `lib/fsm/generate.test.ts` | Rewrite most tests | Assert the new shape |
| `lib/fsm/problems.ts` | Modify lines 242 and 267 | Local count loses `beat` |
| `lib/fsm/problems.test.ts` | Modify one test | Local-count boundary moves by one |
| `missions/*.txt` | Regenerate | Output of the new generator |
| `.agents/Memory.md` | Modify | Record the `gosub` depth |

---

### Task 1: Emit Helpers

**Files:**
- Modify: `lib/fsm/emit.ts` (append after `stateConst`, line 24)
- Create: `lib/fsm/emit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `stateLabel(id: string): string`, `leaveLabel(id: string): string`, `whileBlock(test: string, body: string[]): string[]`.

- [ ] **Step 1: Write the failing test**

Create `lib/fsm/emit.test.ts`:

```ts
import { assertEquals } from "@std/assert";
import { leaveLabel, stateLabel, whileBlock } from "./emit.ts";

Deno.test("state and leave labels camel-case the state id", () => {
  assertEquals(stateLabel("A"), "stateA");
  assertEquals(stateLabel("GO_HOME"), "stateGoHome");
  assertEquals(leaveLabel("GO_HOME"), "leaveGoHome");
});

Deno.test("whileBlock indents its body", () => {
  assertEquals(whileBlock("TIMERA < 500", ["wait 0", "foo()"]), [
    "while TIMERA < 500",
    "  wait 0",
    "  foo()",
    "end",
  ]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `deno test lib/fsm/emit.test.ts`
Expected: FAIL, the import of `stateLabel` has no export.

- [ ] **Step 3: Write the implementation**

Insert in `lib/fsm/emit.ts` after the `stateConst` function:

```ts
const pascal = (id: string) =>
  id.toLowerCase().split("_").map((word) =>
    word ? word[0].toUpperCase() + word.slice(1) : ""
  ).join("");

/** The label of a state's routine, e.g. `GO_HOME` becomes `stateGoHome`. */
export function stateLabel(id: string): string {
  return `state${pascal(id)}`;
}

/** The label of the routine that runs a state's `onExit` steps, e.g. `leaveGoHome`. */
export function leaveLabel(id: string): string {
  return `leave${pascal(id)}`;
}

/** A `while` loop. Its body must contain a `wait`. */
export function whileBlock(test: string, body: string[]): string[] {
  return [`while ${test}`, ...indent(body), "end"];
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `deno test lib/fsm/emit.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Stop after the diff and summary**

Do not run `git add` or `git commit`.

---

### Task 2: Generator Emits One Routine per State

**Files:**
- Modify: `lib/fsm/generate.ts` (replace the whole file)
- Modify: `lib/fsm/generate.test.ts` (replace the whole file)

**Interfaces:**
- Consumes: `cmp`, `ifBlock`, `indent`, `latchLocal`, `stateConst` (existing), `stateLabel`, `leaveLabel`, `whileBlock` (Task 1); `Beat`, `Cond`, `Const`, `Mission`, `State` from `types.ts`.
- Produces: `generate(mission: Mission, source: string): string`, same signature as today. The output has no `beat` local, no `enterState`, and no `exitState`.

- [ ] **Step 1: Write the failing tests**

Replace `lib/fsm/generate.test.ts` with:

```ts
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
  const lose = text.slice(text.indexOf(":stateLose"), text.indexOf(":failCheck"));
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
  assertThrows(() => generate(bad, "x"), Error, "finish with next, until, or on");
});

Deno.test("an onFail state the fail check watches is rejected", () => {
  const bad = {
    ...fixture,
    states: { ...fixture.states, LOSE: { next: "A" } },
  };
  assertThrows(() => generate(bad, "x"), Error, "onFail state LOSE must set fail: false");
});

Deno.test("the committed generated missions match their tables", async () => {
  const { stale } = await syncMissions(Deno.cwd(), { write: false });
  assertEquals(stale, []);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `deno test lib/fsm/generate.test.ts`
Expected: FAIL. The new dispatcher, `stateA`, and `failCheck` assertions fail; the "committed generated missions match" test also fails once the generator changes, until Task 4 regenerates them.

- [ ] **Step 3: Write the implementation**

Replace `lib/fsm/generate.ts` with:

```ts
// Turns a mission state table into the Sanny source of a CLEO mission script (`{$CLEO .cm}`).
//
// Shape of the output: the mission keeps `state`, one latch local per monitor, and scratch locals that
// conditions ask for. A dispatcher loop calls the routine of the current state. A routine runs the state's
// enter steps and beats, then ticks in its own loop until a transition holds; it sets `state` and returns to
// the dispatcher, so the dispatch compares run once per transition, not once per tick. A state that a monitor
// or the mission fail check watches waits out each beat in a `TIMERA` loop that runs the watchers; any other
// state uses plain `wait`s. Routines are label subroutines because a `function` cannot see the script's locals.
// The game keeps six `gosub` return addresses per script; a routine nests at most one level deeper
// (`failCheck`, `runMonitors`, or a `leave` routine), plus whatever its steps call.

import {
  cmp,
  ifBlock,
  indent,
  latchLocal,
  leaveLabel,
  stateConst,
  stateLabel,
  whileBlock,
} from "./emit.ts";
import type { Beat, Cond, Const, Mission, State } from "./types.ts";

const comments = (notes: string[] = []) => notes.map((note) => `// ${note}`);

function constLine(name: string, value: Const): string {
  return Array.isArray(value)
    ? `const ${name} = ${value[0]} // ${value[1]}`
    : `const ${name} = ${value}`;
}

/** `source` is the table's path relative to the repo root, named in the GENERATED header. */
export function generate(mission: Mission, source: string): string {
  const entries = Object.entries(mission.states) as [string, State][];
  const ids = entries.map(([id]) => id);
  const known = new Set(ids);
  const mustExist = (id: string, where: string) => {
    if (!known.has(id)) {
      throw new Error(`${source}: ${where} names unknown state ${id}`);
    }
  };
  mustExist(mission.start, "start");
  mustExist(mission.onFail, "onFail");
  for (const [id, state] of entries) {
    if (state.next) mustExist(state.next, `${id}.next`);
    for (const rule of state.on ?? []) mustExist(rule.goto, `${id}.on`);
    if (state.until && !state.next) {
      throw new Error(`${source}: ${id} has until but no next`);
    }
    if (state.finish && (state.next || state.until || state.on?.length)) {
      throw new Error(`${source}: ${id} has finish with next, until, or on`);
    }
  }
  const failable = (state: State) =>
    mission.fail.length > 0 && state.fail !== false;
  const failTarget = stateConst(mission.onFail);
  if (failable(mission.states[mission.onFail])) {
    throw new Error(
      `${source}: onFail state ${mission.onFail} must set fail: false`,
    );
  }

  const monitors = mission.monitors ?? [];
  const latches = monitors.map((m) => latchLocal(m.id));
  const hasFail = entries.some(([, state]) => failable(state));
  const leaves = new Set(
    entries.filter(([, state]) => state.onExit?.length).map(([id]) => id),
  );

  const scratch = new Set<string>();
  const track = (conds: Cond[] = []) => {
    for (const c of conds) {
      for (const local of c.locals ?? []) scratch.add(local);
    }
  };
  track(mission.fail);
  for (const m of monitors) track(m.when);
  for (const [, state] of entries) {
    track(state.until);
    for (const rule of state.on ?? []) track(rule.when);
    for (const beat of state.beats ?? []) track(beat.when);
  }

  /** Calls the routine that runs the state's `onExit` steps, when it has one. */
  const leave = (id: string) =>
    leaves.has(id) ? [`${leaveLabel(id)}()`] : [];

  /** Leaves `id` for `target` and returns to the dispatcher. */
  const go = (id: string, target: string): string[] => [
    ...leave(id),
    `state = ${stateConst(target)}`,
    "return",
  ];

  const watched = (state: State) => monitors.length > 0 || failable(state);

  /** What a tick checks besides the state's own transitions: the monitors, then the fail check. */
  const watch = (id: string, state: State): string[] => [
    ...(monitors.length ? ["runMonitors()"] : []),
    ...(failable(state)
      ? [
        "failCheck()",
        ...ifBlock([cmp("state", "==", failTarget)], [...leave(id), "return"]),
      ]
      : []),
  ];

  function beatLines(id: string, state: State, beat: Beat): string[] {
    const lines = [...comments(beat.notes), ...(beat.do ?? []).flat()];
    if (beat.wait) {
      lines.push(
        ...(watched(state)
          ? [
            "TIMERA = 0",
            ...whileBlock(`TIMERA < ${beat.wait}`, [
              "wait 0",
              ...watch(id, state),
            ]),
          ]
          : [`wait ${beat.wait}`]),
      );
    }
    return beat.when ? ifBlock(beat.when, lines) : lines;
  }

  function routine(id: string, state: State): string[] {
    const body = [
      ...comments(state.notes),
      "TIMERA = 0",
      ...(state.resetLatches ? latches.map((l) => `${l} = false`) : []),
      ...(state.onEnter ?? []).flat(),
      ...(state.beats ?? []).flatMap((beat) => beatLines(id, state, beat)),
    ];

    // The rules form an if/else chain, so the first one that holds wins and `until` and `next` are the last else
    let route: string[] = state.until
      ? ifBlock(state.until, go(id, state.next!))
      : state.next
      ? go(id, state.next)
      : [];
    for (const rule of [...(state.on ?? [])].reverse()) {
      route = ifBlock(rule.when, go(id, rule.goto), route);
    }

    if (state.finish) {
      body.push("finishMission()");
    } else if (state.next && !state.until) {
      // The route always fires, so the state needs no tick loop
      body.push(...route);
    } else {
      body.push(
        ...whileBlock("true", ["wait 0", ...watch(id, state), ...route]),
      );
    }
    if (body.at(-1) !== "return") body.push("return");
    return [`:${stateLabel(id)}`, ...indent(body)];
  }

  const dispatch = entries.flatMap(([id]) => [
    "",
    ...ifBlock([cmp("state", "==", stateConst(id))], [`${stateLabel(id)}()`]),
  ]);

  const width = Math.max(45, ...mission.header.map((line) => line.length + 3));
  const bar = `//${"=".repeat(width)}`;
  const out = [
    "{$CLEO .cm}",
    "{$INCLUDE ../variables.txt}",
    "{$INCLUDE ../constants.txt}",
    "{$INCLUDE ../utils/geography.txt}",
    "",
    `// GENERATED from ${source} by lib/fsm/generate.ts. Edit the table, then run \`deno task build\`.`,
    "",
    bar,
    ...mission.header.map((line) => `// ${line}`),
    bar,
    ...Object.entries(mission.consts ?? {}).map(([name, value]) =>
      constLine(name, value)
    ),
    "",
    ...ids.map((id, i) => `const ${stateConst(id)} = ${i}`),
    "",
    "// Mission-private state is CLEO locals, which need no global slot (16 per script)",
    `int state = ${stateConst(mission.start)}`,
    ...(mission.locals ?? []).map((l) =>
      l.value === undefined
        ? `${l.type} ${l.name}`
        : `${l.type} ${l.name} = ${l.value}`
    ),
    ...latches.map((l) => `int ${l} = false`),
    ...[...scratch].map((local) => `int ${local} = 0`),
    "",
    "$onMission = true",
    "",
    "while true",
    ...indent(["wait 0", ...dispatch]),
    "end",
    "",
    "// Never reached: the loop above runs until finishMission() terminates the thread",
    "05DC: terminate_custom_thread",
  ];
  for (const [id, state] of entries) out.push("", ...routine(id, state));
  for (const id of leaves) {
    out.push(
      "",
      `:${leaveLabel(id)}`,
      ...indent([...(mission.states[id].onExit ?? []).flat(), "return"]),
    );
  }
  if (hasFail) {
    out.push(
      "",
      ":failCheck",
      ...indent([
        ...ifBlock(mission.fail, [`state = ${failTarget}`], [], "or"),
        "return",
      ]),
    );
  }
  if (monitors.length) {
    const body = monitors.flatMap((m, i) =>
      ifBlock([...m.when, cmp(latches[i], "==", "false")], [
        `${latches[i]} = true`,
        ...m.once.flat(),
      ])
    );
    out.push("", ":runMonitors", ...indent([...body, "return"]));
  }
  out.push(
    "",
    ...(mission.includes ?? ["../utils/missions.txt"]).map((p) =>
      `{$INCLUDE ${p}}`
    ),
  );
  return out.join("\n") + "\n";
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `deno test lib/fsm/generate.test.ts`
Expected: PASS for every test except "the committed generated missions match their tables", which fails until Task 4. If a string assertion fails on the text a `cond` or `step` emits (for example `Player.IsDead($player)`), read the actual output and correct the expected string, not the generator.

- [ ] **Step 5: Format**

Run: `deno fmt lib/fsm`

- [ ] **Step 6: Stop after the diff and summary**

Do not run `git add` or `git commit`.

---

### Task 3: Local Count Loses `beat`

**Files:**
- Modify: `lib/fsm/problems.ts:242` and `lib/fsm/problems.ts:267`
- Modify: `lib/fsm/problems.test.ts:22-37`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `problems()` counts `1 + latches + declared + scratch` locals against 16.

- [ ] **Step 1: Write the failing test**

In `lib/fsm/problems.test.ts`, change the 15-local fixture of the test "locals are checked for names and the CLEO limit of 16" to 16 locals:

```ts
  const locals = Array.from({ length: 16 }, (_, i) => ({
```

The expected message stays `"The mission needs 17 locals, but a CLEO script has 16"`.

- [ ] **Step 2: Run it to see it fail**

Run: `deno test lib/fsm/problems.test.ts`
Expected: FAIL, the generator-side count is still `2 + 16 = 18`.

- [ ] **Step 3: Write the implementation**

In `lib/fsm/problems.ts` line 242 change the comment to:

```ts
  // CLEO gives a script 16 locals: `state`, a latch per monitor, the declared locals, and scratch locals
```

and at line 267 change `2 +` to `1 +`:

```ts
  const localCount = 1 + latches.size + (mission.locals?.length ?? 0) +
    scratch.size;
```

- [ ] **Step 4: Run it to see it pass**

Run: `deno test lib/fsm/problems.test.ts`
Expected: PASS.

- [ ] **Step 5: Stop after the diff and summary**

Do not run `git add` or `git commit`.

---

### Task 4: Regenerate the Missions and Record the Depth

**Files:**
- Regenerate: `missions/0_tutorial.txt`, `missions/1_shady_job.txt` (outputs of their tables)
- Modify: `.agents/Memory.md` (insert before the line starting `- **Debug Tools**`)

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces: generated missions in the new shape; a `Memory.md` entry for the `gosub` depth.

- [ ] **Step 1: Regenerate**

Run: `deno task build:missions`
Expected: both tables regenerate. If a table throws "finish with next, until, or on" or "must set fail: false", stop and report the table and the message to the user; do not edit the table.

- [ ] **Step 2: Compile the generated missions**

Run: `deno run --allow-all --env-file=.env scripts/check-compile.ts missions/1_shady_job.txt`
Expected: `compiled`, with no `compile.log` entry. Repeat for `missions/0_tutorial.txt`.

- [ ] **Step 3: Run the whole fsm suite**

Run: `deno test lib/fsm`
Expected: PASS, including "the committed generated missions match their tables".

- [ ] **Step 4: Measure and report**

Run: `wc -l missions/1_shady_job.txt` and compare with the 452 lines before. Report the new count and the output of the tests as observed. Do not declare the mission working: it has not been played.

- [ ] **Step 5: Record the depth in `Memory.md`**

Insert before `- **Debug Tools**` in `.agents/Memory.md`:

```markdown
- **Gosub Depth**: A script keeps six `gosub` return addresses (`m_aGosubAddr[6]` in `plugins/sockets/III.CLEO.h`). [`tests/stack-probe.txt`](../tests/stack-probe.txt) on `main.scm` entered seven nested `gosub`s and crashed on the eighth, so the seventh overran into the next field; six is the safe depth. A `return` inside a `while` inside a `gosub` works. A `.cm` thread is untested. The FSM generator nests at most two deep plus what a step calls. See [`reports/rejected-fsm-codegen-options.md`](reports/rejected-fsm-codegen-options.md).
```

Read the line back to confirm it sits between the CLEO Locals and Debug Tools entries.

- [ ] **Step 6: Stop after the diff and summary**

Do not run `git add` or `git commit`. Do not launch the game.

---

## Self-Review

| Spec requirement | Task |
| :--- | :--- |
| Dispatcher, no per-tick state dispatch | Task 2 (`dispatch`, `routine`) |
| Beat ladder gone | Task 2 (`beatLines`, no `beat` local) |
| Fail check only in failable states | Task 2 (`watch`, `failCheck`) |
| `enterState` / `exitState` gone | Task 2 (`leave`, `go`) |
| Label subroutines, no `goto`, no new globals | Global Constraints, Task 2 |
| Monitors run inside every tick loop | Task 2 (`watch`) |
| Depth within six | Global Constraints, Task 4 step 5 |
| Rejected options documented | [`../reports/rejected-fsm-codegen-options.md`](../reports/rejected-fsm-codegen-options.md) |
