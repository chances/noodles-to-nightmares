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

  const conds = (list: Cond[] | undefined, where: string, state?: string) => {
    for (const c of list ?? []) {
      if (!c.test.trim()) error(`${where} has an empty condition`, state);
    }
  };
  const steps = (list: Step[] | undefined, where: string, state?: string) => {
    for (const s of list ?? []) {
      if (!s.some((line) => line.trim())) {
        error(`${where} has an empty step`, state);
      }
    }
  };

  const states = Object.entries(mission.states) as [string, State][];
  conds(mission.fail, "The mission's fail list");
  if (mission.fail.length === 0) {
    warn("The mission has no fail conditions, so it can never fail");
  }

  const seen = new Set<string>();
  for (const monitor of mission.monitors ?? []) {
    if (!NAME.test(monitor.id)) {
      error(
        `Monitor "${monitor.id}" needs a name made of letters, digits, and underscores`,
      );
    } else if (seen.has(monitor.id)) {
      error(`Two monitors are named ${monitor.id}`);
    }
    seen.add(monitor.id);
    conds(monitor.when, `Monitor ${monitor.id}`);
    steps(monitor.once, `Monitor ${monitor.id}`);
  }
  for (const name of Object.keys(mission.consts ?? {})) {
    if (!NAME.test(name)) {
      error(
        `Constant "${name}" needs a name made of letters, digits, and underscores`,
      );
    }
  }

  const inbound = new Set(transitions(mission).map((edge) => edge.to));
  for (const [id, state] of states) {
    if (state.until && !state.next) {
      error(`${id} waits on a condition but has no Next state`, id);
    }
    conds(state.until, `${id}'s wait`, id);
    for (const rule of state.on ?? []) conds(rule.when, `${id}'s branch`, id);
    for (const beat of state.beats ?? []) {
      conds(beat.when, `A beat in ${id}`, id);
      steps(beat.do, `A beat in ${id}`, id);
    }
    steps(state.onEnter, `${id}'s enter steps`, id);
    steps(state.onExit, `${id}'s exit steps`, id);

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
