// The selected state and story beat, kept in the URL's `state` and `beat` query params. A null value is left out of the URL.

/** The state name and beat index a URL carries, each null when its param is absent or malformed. */
export function readUrlState(search) {
  const params = new URLSearchParams(search);
  const state = params.get("state") || null;
  const beat = params.get("beat");
  return { state, beat: beat !== null && /^\d+$/.test(beat) ? Number(beat) : null };
}

/** `search` with its `state` and `beat` params set to `state` and `beat`, or removed when null, and every other param kept. */
export function writeUrlState(search, { state, beat }) {
  const params = new URLSearchParams(search);
  setOrDelete(params, "state", state || null);
  setOrDelete(params, "beat", beat === null || beat === undefined ? null : String(beat));
  const text = params.toString();
  return text ? `?${text}` : "";
}

function setOrDelete(params, name, value) {
  if (value === null) params.delete(name);
  else params.set(name, value);
}
