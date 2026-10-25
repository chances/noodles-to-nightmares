// The heading math the compass dial and the range slider share. Angles are degrees in 0 to 360.

/**
 * Whether 0 is north and angles grow clockwise. The in-game check decides the mapping; flip this once it is settled.
 */
export const COMPASS_CLOCKWISE = true;

/** The dial and slider step: 5 degrees by default, 1 with Shift, and 22.5 with Ctrl (which wins over Shift). */
export function stepFor({ shift, ctrl }) {
  if (ctrl) return 22.5;
  return shift ? 1 : 5;
}

/** The compass angle of a point `dx` right and `dy` down from the dial's centre. */
export function angleFromPoint(dx, dy) {
  const clockwise = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return normalize(COMPASS_CLOCKWISE ? clockwise : -clockwise);
}

/**
 * Whether a point `dx` and `dy` from the dial's centre lies on the drawn face. The button's round border reaches 25 of its
 * 50 pixels, and the face is drawn 21 of them out, so the ring between them is off the dial.
 */
export function onDialFace(dx, dy, halfSize) {
  return Math.hypot(dx, dy) <= halfSize * (21 / 25);
}

/** Where an angle sits on the dial, in degrees clockwise from the top of the dial. */
export function dialPlace(degrees) {
  return COMPASS_CLOCKWISE ? degrees : -degrees;
}

/** The nearest multiple of `step`, wrapped into 0 to 360, so 360 reads as 0. */
export function snapAngle(degrees, step) {
  return normalize(Math.round(degrees / step) * step);
}

/** The value a field takes for `raw`: an angle snaps to `step` and wraps, and any other range clamps to its bounds. */
export function placeValue(raw, field, step, whole) {
  if (field.angle) return snapAngle(raw, step);
  const snapped = Math.round(raw / step) * step;
  return Math.min(field.max, Math.max(field.min, whole ? Math.round(snapped) : snapped));
}

/** The Sanny literal of `value`: a whole number for an int variable, else a float with a decimal point, to the nearest half degree. */
export function literal(value, whole) {
  if (whole) return String(Math.round(value));
  const half = Math.round(value * 2) / 2;
  return Number.isInteger(half) ? `${half}.0` : String(half);
}

/** `slider` when the value is a plain number, else `expr` for a name or an expression. */
export function sliderKind(text) {
  return /^-?\d+(?:\.\d+)?$/.test(text) ? "slider" : "expr";
}

/**
 * The mode a field shows. A toggle holds only while the value keeps the auto mode it had when the toggle was pressed,
 * so a value that changes kind returns the field to its auto mode.
 */
export function modeFor(picked, auto) {
  return picked.mode && picked.auto === auto ? picked.mode : auto;
}

/** The degrees a named constant holds, or null when no constant has that name or its value is not a number. */
export function constantDegrees(text, constants = []) {
  const value = Number(constants.find((c) => c.name === text)?.value);
  return constants.some((c) => c.name === text) && Number.isFinite(value) ? value : null;
}

function normalize(degrees) {
  return ((degrees % 360) + 360) % 360;
}
