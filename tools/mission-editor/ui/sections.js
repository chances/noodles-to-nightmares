// The Inspector's optional sections and the kinds that choose their defaults. Flow and Fail Check always show.

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
  { id: "beats", heading: "Beats", field: "beats" },
  { id: "onExit", heading: "Exit Steps", field: "onExit" },
  { id: "latches", heading: "Monitor Latches", field: "resetLatches" },
  { id: "notes", heading: "Notes", field: "notes" },
];

// Spawns, Reward, Control, Prompt, and Spot join these when the generator supports them.
export const KIND_SECTIONS = {
  cutscene: ["beats"],
  tutorial: ["beats"],
  objective: ["onEnter", "until"],
  interaction: ["until"],
  encounter: ["onEnter", "branches"],
  choice: ["branches"],
  ending: ["beats"],
};

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
