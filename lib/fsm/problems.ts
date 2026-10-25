// What is wrong with a mission table. Errors stop the generator or produce Sanny that cannot compile; warnings are legal but suspicious.

import { latchLocal, stateConst } from "./emit.ts";
import { effectiveKind, transitions } from "./graph.ts";
import { describeMismatch, fieldUses, numberMismatches } from "./numeric.ts";
import type { NumberKind } from "./numeric.ts";
import { enumsFor } from "./enums.ts";
import type { EnumMember } from "./enums.ts";
import type { Cond, Mission, State, Step } from "./types.ts";

export interface Problem {
  severity: "error" | "warning";
  message: string;
  /** The state at fault; selecting it shows the problem in the Inspector. */
  state?: string;
}

/** A constant a Sanny file declares. */
export interface ConstInfo {
  /** int or float, from how the value is written; undefined for an expression. */
  kind?: NumberKind;
  /** The value as written, e.g. `20.0`. */
  value?: string;
  /** The `///` doc comment above the declaration. */
  comment?: string;
  /** Where it is declared: a file name, or `geography` for the generated spot constants. */
  source: string;
}

/** A global variable variables.txt declares. */
export interface GlobalInfo {
  /** The `$name: Type` declaration's type, e.g. `Blip`. */
  type?: string;
  /** The `Alloc($name, slot)` slot. A mission cannot use a global that has none. */
  slot?: number;
  /** The `///` doc comment above the `$name: Type` declaration. */
  doc?: string;
}

/** Names the project's Sanny files declare, which a table can use without declaring them itself. */
export interface Known {
  /** `const` names from variables.txt, constants.txt, the geography file, and the mission's includes. */
  constants: Map<string, ConstInfo>;
  /** Global names, with the `$`, from variables.txt. */
  globals: Map<string, GlobalInfo>;
  /** Functions the mission's includes define, with the file each comes from. Omitted when a caller has no includes. */
  functions?: Map<string, { source: string; signature: string; doc?: string }>;
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const LATCH_REF = /(?<![\w$])latch[A-Z]\w*/g;
const STATE_REF = /(?<![\w$.])STATE_\w+/g;
// An all-capitals word of three or more letters, apart from model names (`#BANSHEE`), members (`Hud.X`), and calls.
const CONST_REF = /(?<![\w$.#])[A-Z][A-Z0-9_]{2,}(?![\w(])/g;
const GLOBAL_REF = /\$[A-Za-z_]\w*/g;
const STRING = /"[^"]*"|'[^']*'/g;

/** `line` without string literals and `//` comments. */
const stripNonCode = (line: string) =>
  line.replace(STRING, '""').replace(/\/\/.*$/, "");


/** A problem message ends with a period, so the editor's "Go To" link after it reads as a new sentence. */
const sentence = (message: string) =>
  /[.!?]$/.test(message) ? message : `${message}.`;

/** Joins names with Oxford commas: "A", "A and B", "A, B, and C". */
const listOf = (names: string[]) =>
  names.length <= 2
    ? names.join(" and ")
    : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;

/** Every problem in `mission`, errors first. Pass `known` to also check constants and globals against the project's Sanny files. Pass `enums` for the project's game; GTA III's are the default. */
export function problems(
  mission: Mission,
  known?: Known,
  enums: Record<string, EnumMember[]> = enumsFor("gta3"),
): Problem[] {
  const found: Problem[] = [];
  const error = (message: string, state?: string) =>
    found.push({ severity: "error", message: sentence(message), state });
  const warn = (message: string, state?: string) =>
    found.push({ severity: "warning", message: sentence(message), state });

  // The names this table declares itself. Sanny rejects a `latch…` local or `STATE_…` constant that nothing declares.
  const latches = new Set(
    (mission.monitors ?? []).map((m) => latchLocal(m.id)),
  );
  const stateConsts = new Set(Object.keys(mission.states).map(stateConst));
  const consts = new Set(Object.keys(mission.consts ?? {}));
  const declaredLocals = new Set(
    (mission.locals ?? []).map((local) => local.name),
  );
  // A constant's number type, from how its value is written: the table's own, then the project's files.
  const kindOfName = (name: string): NumberKind | undefined => {
    const own = mission.consts?.[name];
    if (own !== undefined) {
      return Number.isInteger(Array.isArray(own) ? own[0] : own)
        ? "int"
        : "float";
    }
    return known?.constants.get(name)?.kind;
  };
  const reported = new Set<string>();
  const once = (key: string, report: () => void) => {
    if (!reported.has(key)) {
      reported.add(key);
      report();
    }
  };
  /** Reports every name in `lines` that nothing declares. Names in strings and comments are not code. */
  const reads = (lines: string[], state?: string) => {
    const code = lines.map(stripNonCode).join("\n");
    for (const ref of code.match(LATCH_REF) ?? []) {
      if (!latches.has(ref)) {
        once(
          `${state}:${ref}`,
          () => error(`${ref} is read or set, but no monitor makes it`, state),
        );
      }
    }
    for (const ref of code.match(STATE_REF) ?? []) {
      if (!stateConsts.has(ref)) {
        once(
          `${state}:${ref}`,
          () =>
            error(`${ref} is used, but the mission has no such state`, state),
        );
      }
    }
    for (const line of lines) {
      for (const m of numberMismatches(line, kindOfName)) {
        once(
          `${state}:${m.label}:${m.value}`,
          () => error(describeMismatch(m), state),
        );
      }
    }
    for (const line of lines) {
      for (const { field, value } of fieldUses(line)) {
        const members = field.enum && enums[field.enum];
        // A `sprite` field names a member only as `Enum.Member`; a bare name there is a constant or a local.
        const prefix = `${field.enum}.`;
        const named = field.type !== "sprite"
          ? value
          : value.startsWith(prefix)
          ? value.slice(prefix.length)
          : undefined;
        if (
          members && named !== undefined &&
          !members.some((m) => m.name === named)
        ) {
          once(
            `${state}:${field.enum}:${named}`,
            () => error(`${field.enum}.${named} does not exist`, state),
          );
        }
        if (
          members && named === undefined &&
          members.some((m) => m.name === value)
        ) {
          once(
            `${state}:${field.enum}:${value}`,
            () =>
              error(
                `${value} is a ${field.enum} member, so write ${prefix}${value}`,
                state,
              ),
          );
        }
      }
    }
    for (const line of lines) {
      for (const { field, value } of fieldUses(line)) {
        // A handle without a `$` is a mission local, so the mission must declare it.
        if (
          field.type === "handle" && !value.startsWith("$") &&
          !declaredLocals.has(value)
        ) {
          once(
            `${state}:local:${value}`,
            () => error(`${value} is used, but no local declares it`, state),
          );
        }
      }
    }
    // Names from the project's Sanny files are only checked when the caller says what those declare.
    if (!known) return;
    // A spot that is not in the geography is one mistake, not a missing `_X`, `_Y`, and `_Z` each.
    const badSpots: string[] = [];
    for (const line of lines) {
      for (const { field, value } of fieldUses(line)) {
        if (field.type === "spot" && !known.constants.has(`${value}_X`)) {
          badSpots.push(value);
          once(
            `${state}:spot:${value}`,
            () => error(`Spot ${value} is not in the geography`, state),
          );
        }
        const declared = field.varType && known.globals.get(value)?.type;
        if (declared && declared !== field.varType) {
          once(
            `${state}:${field.label}:${value}`,
            () =>
              error(
                `${field.label} needs a ${field.varType} variable, but ${value} is a ${declared}`,
                state,
              ),
          );
        }
      }
    }
    for (const ref of code.match(CONST_REF) ?? []) {
      if (badSpots.some((spot) => ref.startsWith(`${spot}_`))) continue;
      if (
        !consts.has(ref) && !stateConsts.has(ref) && !known.constants.has(ref)
      ) {
        once(
          `${state}:${ref}`,
          () =>
            error(
              `${ref} is used, but no constant or include declares it`,
              state,
            ),
        );
      }
    }
    for (const ref of code.match(GLOBAL_REF) ?? []) {
      const global = known.globals.get(ref);
      if (!global) {
        once(
          `${state}:${ref}`,
          () =>
            error(
              `${ref} is used, but variables.txt does not declare it`,
              state,
            ),
        );
      } else if (global.slot === undefined) {
        once(
          `${state}:${ref}`,
          () =>
            error(
              `${ref} has no Alloc pin in variables.txt, so it has no slot`,
              state,
            ),
        );
      }
    }
  };
  // `message` is the whole sentence, so each caller can phrase its subject in the right number.
  const conds = (list: Cond[] | undefined, message: string, state?: string) => {
    for (const c of list ?? []) {
      if (!c.test.trim()) error(message, state);
      reads([...(c.pre ?? []), c.test], state);
    }
  };
  const steps = (list: Step[] | undefined, message: string, state?: string) => {
    for (const s of list ?? []) {
      reads(s, state);
      if (!s.some((line) => line.trim())) error(message, state);
      // A conditional with no test line would emit an `if` Sanny cannot compile.
      const ifAt = s.findIndex((line) => /^if( and)?$/.test(line));
      if (ifAt !== -1 && s[ifAt + 1] === "then") {
        error("A conditional step has no condition", state);
      }
    }
  };

  const states = Object.entries(mission.states) as [string, State][];
  conds(mission.fail, "The mission's fail list has an empty condition");
  if (mission.fail.length === 0) {
    warn("The mission has no fail conditions, so it can never fail");
  }

  const seen = new Set<string>();
  for (const monitor of mission.monitors ?? []) {
    if (!NAME.test(monitor.id)) {
      error(`Monitor "${monitor.id}" needs a name that starts with a letter`);
    } else if (seen.has(monitor.id)) {
      error(`Two monitors are named ${monitor.id}`);
    }
    seen.add(monitor.id);
    conds(monitor.when, `Monitor ${monitor.id} has an empty condition`);
    steps(monitor.once, `Monitor ${monitor.id} has an empty step`);
  }
  for (const name of Object.keys(mission.consts ?? {})) {
    if (!NAME.test(name)) {
      error(`Constant "${name}" needs a name that starts with a letter`);
    }
  }

  const localNames = new Set<string>();
  for (const local of mission.locals ?? []) {
    if (!NAME.test(local.name)) {
      error(`Local "${local.name}" needs a name that starts with a letter`);
    } else if (localNames.has(local.name)) {
      error(`Two locals are named ${local.name}`);
    }
    localNames.add(local.name);
  }
  // CLEO gives a script 16 locals: `state`, a latch per monitor, the declared locals, and scratch locals
  const scratch = new Set<string>();
  for (
    const list of [
      mission.fail,
      ...(mission.monitors ?? []).map((m) => m.when),
    ]
  ) {
    for (const c of list) {
      for (const local of c.locals ?? []) scratch.add(local);
    }
  }
  for (const [, state] of states) {
    for (
      const list of [
        state.until,
        ...(state.on ?? []).map((r) => r.when),
        ...(state.beats ?? []).map((b) => b.when),
      ]
    ) {
      for (const c of list ?? []) {
        for (const local of c.locals ?? []) scratch.add(local);
      }
    }
  }
  const localCount = 1 + latches.size + (mission.locals?.length ?? 0) +
    scratch.size;
  if (localCount > 16) {
    error(`The mission needs ${localCount} locals, but a CLEO script has 16`);
  }

  const inbound = new Set(transitions(mission).map((edge) => edge.to));
  for (const [id, state] of states) {
    if (state.until && !state.next) {
      error(`${id} waits on a condition but has no Next state`, id);
    }
    conds(state.until, `${id}'s wait has an empty condition`, id);
    for (const rule of state.on ?? []) {
      conds(rule.when, `A branch in ${id} has an empty condition`, id);
    }
    for (const [index, beat] of (state.beats ?? []).entries()) {
      conds(beat.when, `A beat in ${id} has an empty condition`, id);
      if (beat.await) {
        conds(beat.await, `A beat in ${id} waits on an empty condition`, id);
        if (beat.await.length === 0) {
          warn(
            `${id} story beat ${
              index + 1
            } is asynchronous, but has no conditions`,
            id,
          );
        }
        if (beat.do?.length || beat.wait) {
          error(`A beat in ${id} waits and also runs steps or a duration`, id);
        }
      } else {
        steps(beat.do, `A beat in ${id} has an empty step`, id);
      }
    }
    steps(state.onEnter, `${id} has an empty enter step`, id);
    steps(state.onExit, `${id} has an empty exit step`, id);
    if (state.timeLimit !== undefined && !(state.timeLimit > 0)) {
      error(`${id}'s time limit must be above 0 seconds.`, id);
    }
    if (state.timeLimit !== undefined && state.finish) {
      error(`${id} has a time limit and finishes the mission.`, id);
    }
    if (state.showTimer && state.timeLimit === undefined) {
      warn(`${id} has a HUD timer enabled but no time limit`, id);
    }

    if (!state.next && !state.on?.length && !state.finish) {
      warn(`${id} has no way out and does not finish the mission`, id);
    }
    if (!inbound.has(id) && id !== mission.start && id !== mission.onFail) {
      warn(`Nothing leads to ${id}`, id);
    }
  }
  if (!states.some(([, state]) => state.finish)) {
    warn("No state finishes the mission");
  }

  // Linked states of one kind could share a state. Linking runs along transitions in either direction.
  const kinds = new Map(
    Object.entries(mission.states).map((
      [id, state],
    ) => [id, effectiveKind(state)]),
  );
  const links = new Map<string, Set<string>>();
  for (const { from, to } of transitions(mission)) {
    const kind = kinds.get(from);
    if (!kind || kind !== kinds.get(to)) continue;
    for (const [a, b] of [[from, to], [to, from]]) {
      const peers = links.get(a) ?? new Set<string>();
      peers.add(b);
      links.set(a, peers);
    }
  }
  const grouped = new Set<string>();
  for (const id of links.keys()) {
    if (grouped.has(id)) continue;
    const group = new Set([id]);
    for (const member of group) {
      for (const peer of links.get(member) ?? []) group.add(peer);
    }
    for (const member of group) grouped.add(member);
    const names = Object.keys(mission.states).filter((name) => group.has(name));
    const be = names.length === 2 ? "are both" : "are all";
    warn(
      `Consider simplifying states: ${listOf(names)} ${be} ${
        kinds.get(id)
      } states linked together`,
      names[0],
    );
  }

  return [
    ...found.filter((p) => p.severity === "error"),
    ...found.filter((p) => p.severity === "warning"),
  ];
}
