// The Script pane's optional sections and the kinds that choose their defaults. Flow and Fail Check always show.
//
// @remarks A state shows only the sections it holds data for, plus any the user opened and has not removed.
// `kind` is optional in the table: `kindOf` infers it from the sections present until the kind select writes it.
// Changing the kind opens the new kind's default sections and keeps the ones already filled.

export const KINDS = [
  ["cutscene", "Cutscene"],
  ["tutorial", "Tutorial"],
  ["objective", "Objective"],
  ["interaction", "Interaction"],
  ["encounter", "Encounter"],
  ["choice", "Choice"],
  ["ending", "Ending"],
];

/** The sections Add Section offers, in display order. `field` is the state field the section edits. */
export const SECTIONS = [
  { id: "onEnter", heading: "Enter Steps", field: "onEnter" },
  { id: "until", heading: "Wait Until", field: "until" },
  { id: "branches", heading: "Branches", field: "on" },
  { id: "onExit", heading: "Exit Steps", field: "onExit" },
  { id: "latches", heading: "Reset Monitors", field: "resetLatches" },
  { id: "notes", heading: "Notes", field: "notes" },
];

// Beats live in the Beat pane, so the kinds that script them (cutscene, tutorial, ending) add no section here.
// Spawns, Reward, Control, Prompt, and Spot join these when the generator supports them.
export const KIND_SECTIONS = {
  cutscene: [],
  tutorial: [],
  objective: ["onEnter", "until"],
  interaction: ["until"],
  encounter: ["onEnter", "branches"],
  choice: ["branches"],
  ending: [],
};

// Sections a state should open on its first render, keyed by state name: set by Add State, taken by the form.
const pending = new Map();

export function openOnShow(id, sectionIds) {
  pending.set(id, sectionIds);
}

/** The section ids waiting to open for `id`, as the form's `opened` map; they open once. */
export function takeOpened(id) {
  const ids = pending.get(id) ?? [];
  pending.delete(id);
  return Object.fromEntries(ids.map((s) => [`${id}:${s}`, true]));
}

/** Whether the state holds data for `section`. An emptied section stays open until it is removed. */
export function hasData(state, section) {
  const value = state[section.field];
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

/** A state's kind: the one it was given, else a guess from the sections it has, else "". */
export function kindOf(state) {
  if (state.kind) return state.kind;
  if (state.finish) return "ending";
  if (state.on?.length) return state.onEnter?.length ? "encounter" : "choice";
  if (state.until?.length) {
    return state.onEnter?.length ? "objective" : "interaction";
  }
  if (state.beats?.length) return "cutscene";
  return "";
}
