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
import { cutsceneRegions } from "./graph.ts";
import type { Beat, Cond, Const, Mission, State } from "./types.ts";

const comments = (notes: string[] = []) => notes.map((note) => `// ${note}`);

/** Entering a cutscene region sets the cutscene flag and letterbox; leaving it clears both. */
const CUTSCENE_ON = ["$onCutscene = true", "Hud.SwitchWidescreen(true)"];
const CUTSCENE_OFF = ["$onCutscene = false", "Hud.SwitchWidescreen(false)"];

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
    if (state.timeLimit !== undefined && !(state.timeLimit > 0)) {
      throw new Error(`${source}: ${id} has a time limit that is not above 0`);
    }
    if (state.timeLimit !== undefined && state.finish) {
      throw new Error(`${source}: ${id} has a time limit and finishes the mission`);
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
    entries
      .filter(([, state]) =>
        state.onExit?.length ||
        (state.timeLimit !== undefined && state.showTimer === true)
      )
      .map(([id]) => id),
  );
  const regionOf = new Map<string, number>();
  cutsceneRegions(mission).forEach((region, index) => {
    for (const id of region) regionOf.set(id, index);
  });

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
  const leave = (id: string) => leaves.has(id) ? [`${leaveLabel(id)}()`] : [];

  /** The cutscene lines a transition from `from` to `to` needs. The flag is on inside any region, so only a change of inside or outside writes it. */
  const flagsFor = (from: string, to: string): string[] => {
    const inside = regionOf.has(to);
    if (regionOf.has(from) === inside) return [];
    return inside ? CUTSCENE_ON : CUTSCENE_OFF;
  };

  /** Leaves `id` for `target` and returns to the dispatcher. */
  const go = (id: string, target: string): string[] => [
    ...leave(id),
    ...flagsFor(id, target),
    `state = ${stateConst(target)}`,
    "return",
  ];

  const watched = (state: State) =>
    monitors.length > 0 || failable(state) || state.timeLimit !== undefined;

  /** What a tick checks besides the state's own transitions: the monitors, the fail check, then the time limit. */
  const watch = (id: string, state: State): string[] => [
    ...(monitors.length ? ["runMonitors()"] : []),
    ...(failable(state)
      ? [
        "failCheck()",
        ...ifBlock(
          [cmp("state", "==", failTarget)],
          [...leave(id), ...flagsFor(id, mission.onFail), "return"],
        ),
      ]
      : []),
    ...(state.timeLimit === undefined
      ? []
      : ifBlock(
        [{ test: `TIMERB > ${state.timeLimit * 1000}` }],
        [
          ...leave(id),
          ...flagsFor(id, mission.onFail),
          `state = ${failTarget}`,
          "return",
        ],
      )),
  ];

  function beatLines(id: string, state: State, beat: Beat): string[] {
    // An await beat with no conditions has nothing to wait for, so the generator skips it (the checker warns)
    if (beat.await?.length === 0) return [];
    const lines = [...comments(beat.notes)];
    if (beat.await) {
      // Spin-waits in a tick loop, so the watchers still run; the condition is tested after them each tick
      lines.push(
        ...whileBlock("true", [
          "wait 0",
          ...watch(id, state),
          ...ifBlock(beat.await, ["break"]),
        ]),
      );
      return beat.when ? ifBlock(beat.when, lines) : lines;
    }
    lines.push(...(beat.do ?? []).flat());
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
      ...(state.timeLimit === undefined ? [] : ["TIMERB = 0"]),
      ...(state.timeLimit !== undefined && state.showTimer === true
        ? [
          `$hudTimer = ${state.timeLimit * 1000}`,
          "Hud.DisplayTimer($hudTimer)",
        ]
        : []),
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
      // Finishing leaves the mission from inside a region, so it clears the cutscene flags itself
      body.push(...(regionOf.has(id) ? CUTSCENE_OFF : []), "finishMission()");
    } else if (state.next && !state.until && state.timeLimit === undefined) {
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
    ...(regionOf.has(mission.start) ? CUTSCENE_ON : []),
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
      ...indent([
        ...(mission.states[id].timeLimit !== undefined &&
            mission.states[id].showTimer === true
          ? ["Hud.ClearTimer($hudTimer)"]
          : []),
        ...(mission.states[id].onExit ?? []).flat(),
        "return",
      ]),
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
