// Turns a mission state table into the Sanny source of a CLEO mission script (`{$CLEO .cm}`).
//
// Shape of the output: the mission keeps `state` and `beat` as locals, one latch local per monitor, and
// scratch locals that conditions ask for. TIMERA measures time in the current beat. A beat runs its `do`
// steps once, then waits; the beat counter counts a run phase and a wait phase per beat. A state that no fail
// check or monitor needs to watch (`fail: false` or no fail list, and no monitors) runs its beats as plain
// `wait`s instead, with `beat` only marking that they have run.

import { cmp, ifBlock, indent, latchLocal, stateConst } from "./emit.ts";
import type { Cond, Const, Mission, State } from "./types.ts";

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
  }

  const monitors = mission.monitors ?? [];
  const latches = monitors.map((m) => latchLocal(m.id));
  const hasExit = entries.some(([, state]) => state.onExit?.length);

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

  /** Leaves the current state and enters `target`. */
  const go = (target: string): string[] => [
    ...(hasExit ? ["exitState()"] : []),
    `state = ${stateConst(target)}`,
    "enterState()",
  ];

  function stateBlock(id: string, state: State): string[] {
    const body = comments(state.notes);
    const beats = state.beats ?? [];
    // Nothing needs a tick while this state's beats wait, so they run as straight-line `wait`s
    const straight = !monitors.length &&
      (state.fail === false || mission.fail.length === 0);
    let n = 0;
    for (const beat of straight ? [] : beats) {
      const run = n++;
      const wait = beat.wait ? n++ : undefined;
      const after = n;
      const start = [
        ...comments(beat.notes),
        ...(beat.do ?? []).flat(),
        ...(wait === undefined
          ? [`beat = ${after}`]
          : ["TIMERA = 0", `beat = ${wait}`]),
      ];
      body.push(
        ...ifBlock(
          [cmp("beat", "==", run)],
          beat.when ? ifBlock(beat.when, start, [`beat = ${after}`]) : start,
        ),
      );
      if (wait !== undefined) {
        body.push(
          ...ifBlock(
            [cmp("beat", "==", wait)],
            ifBlock([cmp("TIMERA", ">=", beat.wait!)], [`beat = ${after}`]),
          ),
        );
      }
    }

    if (straight && beats.length) {
      const run = beats.flatMap((beat) => {
        const start = [
          ...comments(beat.notes),
          ...(beat.do ?? []).flat(),
          ...(beat.wait ? [`wait ${beat.wait}`] : []),
        ];
        return beat.when ? ifBlock(beat.when, start) : start;
      });
      // The state block runs every tick, so `beat` keeps the beats from running again while `until` waits
      body.push(...ifBlock([cmp("beat", "==", 0)], [...run, "beat = 1"]));
    }

    // The rules form an if/else chain, so the first one that holds wins and `until` and `next` are the last else
    let route: string[] = state.until
      ? ifBlock(state.until, go(state.next!))
      : state.next
      ? go(state.next)
      : [];
    for (const rule of [...(state.on ?? [])].reverse()) {
      route = ifBlock(rule.when, go(rule.goto), route);
    }
    const exit = [...route];
    if (state.finish) exit.push("finishMission()");
    body.push(
      ...(n > 0 ? ifBlock([cmp("beat", ">=", n)], exit) : exit),
    );

    return ifBlock([cmp("state", "==", stateConst(id))], body);
  }

  // Main loop: monitors, then the fail check, then every state's block
  const loop = ["wait 0"];
  if (monitors.length) loop.push("", "runMonitors()");
  const failStates = entries.filter(([, state]) => state.fail !== false).map((
    [id],
  ) => id);
  if (mission.fail.length && failStates.length) {
    loop.push(
      "",
      ...ifBlock(
        mission.fail,
        ifBlock(
          failStates.map((id) => cmp("state", "==", stateConst(id))),
          go(mission.onFail),
          [],
          "or",
        ),
        [],
        "or",
      ),
    );
  }
  for (const [id, state] of entries) {
    const block = stateBlock(id, state);
    if (block.length) loop.push("", ...block);
  }

  // Label subroutines: a `function` cannot see this script's locals
  const enter = ["beat = 0", "TIMERA = 0"];
  const leave: string[] = [];
  for (const [id, state] of entries) {
    const onState = [cmp("state", "==", stateConst(id))];
    enter.push(
      ...ifBlock(onState, [
        ...(state.resetLatches ? latches.map((l) => `${l} = false`) : []),
        ...(state.onEnter ?? []).flat(),
      ]),
    );
    leave.push(...ifBlock(onState, (state.onExit ?? []).flat()));
  }

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
    "int beat = 0",
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
    "enterState()",
    "",
    "while true",
    ...indent(loop),
    "end",
    "",
    "// Never reached: finishMission() terminates the thread",
    "05DC: terminate_custom_thread",
    "",
    ":enterState",
    ...indent([...enter, "return"]),
  ];
  if (hasExit) out.push("", ":exitState", ...indent([...leave, "return"]));
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
