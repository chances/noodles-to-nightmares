// deno-fmt-ignore-file
import { html } from "/vendor/preact.js";

/** A 14px outline icon from its SVG paths; the stroke follows the button's text color. */
const icon = (paths) => html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

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
