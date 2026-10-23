// deno-fmt-ignore-file
import { html } from "/vendor/preact.js";

/** A 14px outline icon from its SVG paths; the stroke follows the button's text color. */
const icon = (paths, props = {}) =>
  html`<svg viewBox="0 0 24 24" width=${props?.size ?? 14} height=${props?.size ?? 14} x=${props?.x} y=${props?.y} class=${props?.class} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/** A filled square: stop. */
export const StopIcon = () => html`<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>`;

/** Two bars: pause. */
export const PauseIcon = () => icon(html`<path d="M8 5v14M16 5v14" />`);

/** An arrow down into a dot: step into the call. */
export const StepInIcon = () => icon(html`<path d="M12 3v10M8 9l4 4 4-4" /><circle cx="12" cy="19" r="1.5" />`);

/** An arrow up out of a dot: step out of the call. */
export const StepOutIcon = () => icon(html`<path d="M12 14V4M8 8l4-4 4 4" /><circle cx="12" cy="19" r="1.5" />`);

/** An arc over a dot: step over the call. */
export const StepOverIcon = () => icon(html`<path d="M5 14a7 7 0 0 1 14 0" /><path d="M16.5 10.5L19 14l-3.5 1" /><circle cx="12" cy="19" r="1.5" />`);

/** A curved arrow back to the left. */
export const UndoIcon = () => icon(html`<path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />`);

/** The same arrow mirrored. */
export const RedoIcon = () => icon(html`<path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />`);

/** A classic funnel icon for filtering. */
export const FilterIcon = () => icon(html`<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />`);

/** Cutscene: film camera on a tripod. */
export const CutsceneIcon = (props) =>
  icon(html`<rect x="4" y="5" width="10" height="8" rx="1.5" /><circle cx="6.5" cy="3" r="1.5" /><circle cx="11.5" cy="3" r="1.5" /><polygon points="14 7 19.5 4 19.5 14 14 11" /><path d="M9 13v2.5M9 15.5L4.5 22M9 15.5l4.5 6.5M9 15.5v6.5" />`, props);

/** Tutorial: graduation cap. */
export const TutorialIcon = (props) =>
  icon(html`<polygon points="12 4 22 9 12 14 2 9" /><path d="M6 11v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5" /><path d="M20 10v7" />`, props);

/** Objective: bullseye target. */
export const ObjectiveIcon = (props) =>
  icon(html`<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />`, props);

/** Interaction: arcade joystick (world objects like payphones, pagers, cars). */
export const InteractionIcon = (props) =>
  icon(html`<circle cx="12" cy="5" r="3" /><path d="M12 8v7" /><rect x="3" y="15" width="18" height="6" rx="2" /><circle cx="17" cy="18" r="1" fill="currentColor" />`, props);

/** Encounter: crossed swords (combat and ambush confrontations). */
export const EncounterIcon = (props) =>
  icon(html`<path d="M4 4l11 11M11 16l4-4M14 14l5 5M20 4L9 15M13 16l-4-4M10 14L5 19" />`, props);

/** Choice: signpost with two diverging signs. */
export const ChoiceIcon = (props) =>
  icon(html`<path d="M12 2v20M12 4h6l3 3-3 3h-6V4zM12 12H6L3 15l3 3h6v-6z" />`, props);

/** Ending: trophy. */
export const EndingIcon = (props) =>
  icon(html`<path d="M6 4h12v5a6 6 0 0 1-12 0V4z" /><path d="M6 6H3.5a1.5 1.5 0 0 0-1.5 1.5v1a3.5 3.5 0 0 0 3.5 3.5H6M18 6h2.5a1.5 1.5 0 0 1 1.5 1.5v1a3.5 3.5 0 0 1-3.5 3.5H18" /><path d="M12 15v4M7 21h10" />`, props);

/** Icons for all state kinds. */
export const STATE_KIND_ICONS = {
  cutscene: CutsceneIcon,
  tutorial: TutorialIcon,
  objective: ObjectiveIcon,
  interaction: InteractionIcon,
  encounter: EncounterIcon,
  choice: ChoiceIcon,
  ending: EndingIcon,
};

/** Render a state kind's icon if one exists. */
export const stateKindIcon = (kind, props) => {
  const Component = STATE_KIND_ICONS[kind];
  return Component ? html`<${Component} ...${props} />` : null;
};
