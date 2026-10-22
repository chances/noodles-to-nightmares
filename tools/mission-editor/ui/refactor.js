// Rewrites that keep a mission table consistent when something it names changes. The table stores Sanny text, so a
// monitor or state name also lives inside condition and step lines (`latchDriveHint`, `STATE_GO_HOME`). No DOM and
// no Preact, so the editor tests import it.

import { transitions } from "./mission-ops.js";

/** The local that latches a monitor, e.g. `driveHint` becomes `latchDriveHint`. Mirrors `latchLocal` in lib/fsm/emit.ts. */
export const latchLocal = (id) => `latch${id[0].toUpperCase()}${id.slice(1)}`;

/** The constant the generator declares for a state. Mirrors `stateConst` in lib/fsm/generate.ts. */
export const stateConst = (id) => `STATE_${id}`;

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `text` with the whole word `from` replaced by `to`, leaving string literals alone. */
export function swapWord(text, from, to) {
  const word = new RegExp(`(?<![\\w$])${escape(from)}(?!\\w)`, "g");
  // Splitting on a capturing group puts every string literal at an odd index.
  return text.split(/("[^"]*"|'[^']*')/).map((
    part,
    i,
  ) => (i % 2 ? part : part.replace(word, to))).join("");
}

/** Runs `fn` on every line of Sanny text in the mission and keeps what it returns. Changes `mission`. */
export function mapCode(mission, fn) {
  const conds = (list) => {
    for (const c of list ?? []) {
      c.test = fn(c.test);
      if (c.pre) c.pre = c.pre.map(fn);
    }
  };
  const steps = (list) => {
    for (const s of list ?? []) {
      s.forEach((line, i) => {
        s[i] = fn(line);
      });
    }
  };
  conds(mission.fail);
  for (const m of mission.monitors ?? []) {
    conds(m.when);
    steps(m.once);
  }
  for (const state of Object.values(mission.states)) {
    conds(state.until);
    for (const rule of state.on ?? []) conds(rule.when);
    for (const beat of state.beats ?? []) {
      conds(beat.when);
      steps(beat.do);
    }
    steps(state.onEnter);
    steps(state.onExit);
  }
}

/**
 * Renames monitor `from` to `to`, and every line that reads or sets its latch. Refuses, and returns false,
 * when `to` is another monitor's name, because the two latches would become one. Changes `mission`.
 */
export function renameMonitor(mission, from, to) {
  const monitors = mission.monitors ?? [];
  const monitor = monitors.find((m) => m.id === from);
  if (!monitor || !to || from === to) return false;
  if (monitors.some((m) => m.id === to)) return false;
  monitor.id = to;
  mapCode(mission, (line) => swapWord(line, latchLocal(from), latchLocal(to)));
  return true;
}

/** Rewrites `STATE_<from>` to `STATE_<to>` in every line of Sanny text. Changes `mission`. */
export function renameStateRefs(mission, from, to) {
  mapCode(mission, (line) => swapWord(line, stateConst(from), stateConst(to)));
}

/** The error to show under a state-name field, or "" when `name` can be used for `from`. */
export function nameError(name, mission, from) {
  if (!name) return "Enter a name for the state.";
  if (name !== from && name in mission.states) {
    return `A state named ${name} already exists.`;
  }
  return "";
}

/** Renames a state everywhere the table and the graph layout mention it. Changes `draft`. */
export function renameState(draft, from, to) {
  const { mission, layout } = draft;
  const swap = (id) => (id === from ? to : id);
  mission.states = Object.fromEntries(
    Object.entries(mission.states).map(([id, state]) => [swap(id), state]),
  );
  for (const state of Object.values(mission.states)) {
    if (state.next) state.next = swap(state.next);
    for (const rule of state.on ?? []) rule.goto = swap(rule.goto);
  }
  renameStateRefs(mission, from, to);
  mission.start = swap(mission.start);
  mission.onFail = swap(mission.onFail);
  draft.layout = Object.fromEntries(
    Object.entries(layout).map(([id, point]) => [swap(id), point]),
  );
}

/** What points at `id`: `{ from, kind }` for each Next and branch, plus whether it is the start or the fail state. */
export function inboundTo(mission, id) {
  return {
    edges: transitions(mission).filter((e) => e.to === id),
    isStart: mission.start === id,
    isOnFail: mission.onFail === id,
  };
}

/** Deletes a state and every Next and branch that pointed at it. The start and fail states cannot be deleted. Changes `draft`. */
export function deleteState(draft, id) {
  const { mission } = draft;
  delete mission.states[id];
  delete draft.layout[id];
  for (const state of Object.values(mission.states)) {
    if (state.next === id) delete state.next;
    if (state.on) state.on = state.on.filter((rule) => rule.goto !== id);
  }
}
