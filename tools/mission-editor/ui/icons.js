// deno-fmt-ignore-file
import { html } from "/vendor/preact.js";

/** A 16px outline icon on a 16 pixel grid with 1 pixel strokes; the stroke follows the button's text color. */
const icon = (paths, props = {}) =>
  html`<svg viewBox="0 0 16 16" width=${props?.size ?? 16} height=${props?.size ?? 16} x=${props?.x} y=${props?.y} class=${props?.class} fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/** A filled square: stop. */
export const StopIcon = () => html`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" /></svg>`;

/** Two bars: pause. */
export const PauseIcon = () => icon(html`<path d="M5.5 3V14M11.5 3V14" />`);

/** An arrow down into a dot: step into the call. */
export const StepInIcon = () => icon(html`<path d="M8.5 2.5V10M5.5 7L8.5 10L11.5 7" /><circle cx="8.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />`);

/** An arrow up out of a dot: step out of the call. */
export const StepOutIcon = () => icon(html`<path d="M8.5 10.5V2.5M5.5 5.5L8.5 2.5L11.5 5.5" /><circle cx="8.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />`);

/** An arc over a dot: step over the call. */
export const StepOverIcon = () => icon(html`<path d="M4 11A4.5 4.5 0 0 1 13 11" /><path d="M11.5 10.5L13 12L14.5 10.5" /><circle cx="8.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />`);

/** A curved arrow back to the left. */
export const UndoIcon = () => icon(html`<path d="M7 5L3.5 8.5L7 12" /><path d="M3.5 8.5H9.5A3 3 0 0 1 9.5 14.5H7" />`);

/** The same arrow mirrored. */
export const RedoIcon = () => icon(html`<path d="M10 5L13.5 8.5L10 12" /><path d="M13.5 8.5H7.5A3 3 0 0 0 7.5 14.5H10" />`);

/** Three stacked layers: build. */
export const BuildIcon = () => icon(html`<path d="M8.5 2.5L14.5 5.5L8.5 8.5L2.5 5.5Z" /><path d="M2.5 8.5L8.5 11.5L14.5 8.5" /><path d="M2.5 11.5L8.5 14.5L14.5 11.5" />`);

/** A classic funnel icon for filtering. */
export const FilterIcon = () => icon(html`<path d="M2.5 3.5H14.5L9.5 9V13.5L7.5 14.5V9Z" />`);

/** A magnifier with a plus: zoom in. */
export const ZoomInIcon = () => icon(html`<circle cx="7.5" cy="7.5" r="4.5" /><path d="M10.8 10.8L14 14M7.5 5.5V9.5M5.5 7.5H9.5" />`);

/** A magnifier with a minus: zoom out. */
export const ZoomOutIcon = () => icon(html`<circle cx="7.5" cy="7.5" r="4.5" /><path d="M10.8 10.8L14 14M5.5 7.5H9.5" />`);

/** A circular arrow: reset the graph layout. */
export const ResetLayoutIcon = () => icon(html`<path d="M13.5 8.5A5 5 0 1 1 8.5 3.5C9.9 3.5 11.24 4.06 12.24 4.98L13.5 6.5" /><path d="M13.5 3.5V6.5H10.5" />`);

/** Cutscene: film camera on a tripod. */
export const CutsceneIcon = (props) =>
  icon(html`<circle cx="4.5" cy="4.5" r="2" /><circle cx="8.5" cy="4.5" r="2" /><rect x="2.5" y="8.5" width="8" height="6" rx="1" /><path d="M10.5 9.5L14.5 7.5V13.5L10.5 11.5" />`, props);

/** Tutorial: graduation cap. */
export const TutorialIcon = (props) =>
  icon(html`<path d="M8.5 3.5L14.5 6.5L8.5 9.5L2.5 6.5Z" /><path d="M5.5 8.5V11.5C5.5 12.5 7 13.5 8.5 13.5S11.5 12.5 11.5 11.5V8.5" /><path d="M14.5 6.5V10.5" />`, props);

/** Objective: bullseye target. */
export const ObjectiveIcon = (props) =>
  icon(html`<circle cx="8.5" cy="8.5" r="6" /><circle cx="8.5" cy="8.5" r="3.5" /><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />`, props);

/** Interaction: arcade joystick (world objects like payphones, pagers, cars). */
export const InteractionIcon = (props) =>
  icon(html`<circle cx="8.5" cy="4.5" r="2" /><path d="M8.5 6.5V10.5" /><rect x="3.5" y="10.5" width="10" height="4" rx="1.5" />`, props);

/** Encounter: crossed swords (combat and ambush confrontations). */
export const EncounterIcon = (props) =>
  icon(html`<path d="M3.5 3.5L10.5 10.5M11 11L13 13M9.59 12.41L12.41 9.59M13.5 3.5L6.5 10.5M6 11L4 13M4.59 9.59L7.41 12.41" />`, props);

/** Choice: signpost with two diverging signs. */
export const ChoiceIcon = (props) =>
  icon(html`<path d="M8.5 2.5V14.5" /><path d="M8.5 4H13.5L14.5 5.5L13.5 7H8.5" /><path d="M8.5 9H3.5L2.5 10.5L3.5 12H8.5" />`, props);

/** Ending: trophy. */
export const EndingIcon = (props) =>
  icon(html`<path d="M5.5 3.5H11.5V7A3 3 0 0 1 5.5 7Z" /><path d="M5.5 4.5H4.5V6A1.5 1.5 0 0 0 5.5 7.5M11.5 4.5H12.5V6A1.5 1.5 0 0 1 11.5 7.5" /><path d="M8.5 10V12.5M5.5 13.5H11.5" />`, props);

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

/** Six dots in two columns: the handle a card is dragged by. */
export const GripIcon = () => html`<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="none" aria-hidden="true"><path d="M4 3 L6 3 L6 5 L4 5 Z M9 3 L11 3 L11 5 L9 5 Z M4 7 L6 7 L6 9 L4 9 Z M9 7 L11 7 L11 9 L9 9 Z M4 11 L6 11 L6 13 L4 13 Z M9 11 L11 11 L11 13 L9 13 Z" /></svg>`;

/** Two overlapping sheets: copy. */
export const CopyIcon = () => icon(html`<rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M5.5 11.5H5A1.5 1.5 0 0 1 3.5 10V5A1.5 1.5 0 0 1 5 3.5H10A1.5 1.5 0 0 1 11.5 5V5.5" />`);

/** A check mark: copied. */
export const CheckIcon = () => icon(html`<path d="M4 8.5L7 11.5L13 5.5" />`);

/** Braces with a pencil over the bottom-left corner: edit a step or condition as Sanny text. The mask cuts the braces where the pencil sits. */
export const SannyEditIcon = () => html`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><mask id="sanny-edit-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16"><rect width="16" height="16" fill="#fff" stroke="none" /><path d="M1 15L3.48 13.94L7.36 10.05L5.95 8.64L2.06 12.53Z" fill="#000" stroke="#000" stroke-width="3" stroke-linejoin="miter" /></mask></defs><path mask="url(#sanny-edit-mask)" d="M5 2.5a1.5 1.5 0 0 0 -1.5 1.5v2a1.5 2 0 0 1 -1.5 2a1.5 2 0 0 1 1.5 2v2a1.5 1.5 0 0 0 1.5 1.5M11 2.5a1.5 1.5 0 0 1 1.5 1.5v2a1.5 2 0 0 0 1.5 2a1.5 2 0 0 0 -1.5 2v2a1.5 1.5 0 0 1 -1.5 1.5" /><path d="M1 15L3.48 13.94L7.36 10.05L5.95 8.64L2.06 12.53Z" stroke-linejoin="miter" /></svg>`;

/** Render a state kind's icon if one exists. */
export const stateKindIcon = (kind, props) => {
  const Component = STATE_KIND_ICONS[kind];
  return Component ? html`<${Component} ...${props} />` : null;
};
