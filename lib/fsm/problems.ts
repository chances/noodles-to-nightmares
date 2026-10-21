// What is wrong with a mission table. Errors stop the generator or produce Sanny that cannot compile; warnings are legal but suspicious.

import { transitions } from "./graph.ts";
import type { Cond, Mission, State, Step } from "./types.ts";

export interface Problem {
  severity: "error" | "warning";
  message: string;
  /** The state at fault; selecting it shows the problem in the Inspector. */
  state?: string;
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Every problem in `mission`, errors first. */
export function problems(mission: Mission): Problem[] {
  const found: Problem[] = [];
  const error = (message: string, state?: string) =>
    found.push({ severity: "error", message, state });
  const warn = (message: string, state?: string) =>
    found.push({ severity: "warning", message, state });

  // `message` is the whole sentence, so each caller can phrase its subject in the right number.
  const conds = (list: Cond[] | undefined, message: string, state?: string) => {
    for (const c of list ?? []) if (!c.test.trim()) error(message, state);
  };
  const steps = (list: Step[] | undefined, message: string, state?: string) => {
    for (const s of list ?? []) {
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

  const inbound = new Set(transitions(mission).map((edge) => edge.to));
  for (const [id, state] of states) {
    if (state.until && !state.next) {
      error(`${id} waits on a condition but has no Next state`, id);
    }
    conds(state.until, `${id}'s wait has an empty condition`, id);
    for (const rule of state.on ?? []) {
      conds(rule.when, `A branch in ${id} has an empty condition`, id);
    }
    for (const beat of state.beats ?? []) {
      conds(beat.when, `A beat in ${id} has an empty condition`, id);
      steps(beat.do, `A beat in ${id} has an empty step`, id);
    }
    steps(state.onEnter, `${id} has an empty enter step`, id);
    steps(state.onExit, `${id} has an empty exit step`, id);

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

  return [
    ...found.filter((p) => p.severity === "error"),
    ...found.filter((p) => p.severity === "warning"),
  ];
}
