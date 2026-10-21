// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html } from "/vendor/preact.js";
import { Status } from "./status.js";

// These two match `--second` and `--pad` on `.timeline-grid` in styles.css.
const PX_PER_SECOND = 48;
const PAD = 10;
const LABEL_EVERY = 5;
const MIN_SECONDS = 5;
/** Beats that wait no time share a start with the next beat; each earlier one is drawn this far left of it. */
const STACK_NUDGE = 7;

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

/** A short name for a step's Sanny lines: the text a Text.Print call shows, else the call. */
function describe(step) {
  const line = step[0] ?? "";
  const call = line.match(/([A-Za-z_][\w.]*)\(/)?.[1];
  const text = line.match(/"([^"]*)"|'([^']*)'/);
  if (call?.startsWith("Text.") && text) return text[1] ?? text[2];
  return call ?? line.split(/\s+/)[0];
}

/** Every step of a beat as it reads in the tooltip: notes, a condition marker, then the Sanny lines. */
function tooltip(beat, index, at) {
  return [
    `Beat ${index + 1} at ${seconds(at)}${beat.wait ? ` for ${seconds(beat.wait)}` : ""}`,
    ...(beat.notes ?? []).map((note) => `// ${note}`),
    ...(beat.when?.length ? [`When ${beat.when.map((c) => c.test).join(" and ")}`] : []),
    ...(beat.do ?? []).flat(),
  ].join("\n");
}

/** The card's second line: how long the beat waits, then what else it carries. */
function details(beat) {
  const steps = beat.do ?? [];
  return [
    beat.wait ? seconds(beat.wait) : "instant",
    steps.length > 1 && `+${steps.length - 1} more`,
    beat.when?.length && "conditional",
  ].filter(Boolean).join(" · ");
}

/** The selected state's name, beat count, and length. The pane keeps it outside the scrolling body. */
export function TimelineSummary({ doc, selected }) {
  const beats = doc.mission.states[selected].beats ?? [];
  const total = beats.reduce((sum, beat) => sum + (beat.wait ?? 0), 0);
  return html`<strong>${selected}</strong><span class="hint"> · ${beats.length} ${beats.length === 1 ? "Beat" : "Beats"} · ${seconds(total)}</span>`;
}

/**
 * The beats of the selected state on one track, like a Flash timeline: a time axis on top, a keyframe where each
 * beat starts, and a card spanning the time it waits. A beat that waits no time is only a keyframe.
 */
export function TimelinePane({ doc, selected }) {
  if (!selected) {
    return html`<${Status} heading="No State Selected">Select a state in the list or the graph to see its beats.<//>`;
  }
  const beats = doc.mission.states[selected].beats ?? [];
  if (!beats.length) {
    return html`<${Status} heading="No Beats">${selected} has no beats.<//>`;
  }

  let start = 0;
  const placed = beats.map((beat, index) => {
    const item = { beat, index, at: start };
    start += beat.wait ?? 0;
    return item;
  });
  // Each beat is nudged left by the number of later beats that start at the same moment.
  for (const item of placed) {
    item.nudge = placed.filter((other) => other.index > item.index && other.at === item.at).length * STACK_NUDGE;
  }
  const totalSeconds = Math.max(MIN_SECONDS, Math.ceil(start / 1000));
  const labels = Array.from({ length: Math.floor(totalSeconds / LABEL_EVERY) + 1 }, (_, i) => i * LABEL_EVERY);
  const x = (ms) => PAD + (ms / 1000) * PX_PER_SECOND;

  return html`
    <div class="timeline-grid" role="table" aria-label=${`Beats of ${selected}`} style=${`--span: ${x(totalSeconds * 1000) + PAD}px`}>
      <div role="row">
        <div class="tl-corner" role="columnheader"></div>
        <div class="tl-ruler" role="columnheader" aria-label="Time in seconds">
          ${labels.map((s) => html`<span class="tl-label" key=${s} style=${`inset-inline-start: ${x(s * 1000)}px`}>${s}s</span>`)}
        </div>
      </div>
      <div role="row">
        <div class="tl-name" role="rowheader">
          <strong>Beats</strong>
          <span>${beats.length} · ${seconds(start)}</span>
        </div>
        <div class="tl-track" role="cell">
          ${placed.map(({ beat, index, at, nudge }) => {
            const steps = beat.do ?? [];
            const wait = beat.wait ?? 0;
            return html`
              <span key=${index} title=${tooltip(beat, index, at)}>
                ${wait > 0 && html`
                  <span class="kf-card" data-conditional=${beat.when?.length ? "" : undefined}
                    style=${`inset-inline-start: ${x(at)}px; inline-size: ${(wait / 1000) * PX_PER_SECOND}px`}>
                    <strong>${index + 1} · ${steps.length ? describe(steps[0]) : "Wait"}</strong>
                    <span>${details(beat)}</span>
                  </span>
                  <span class="kf-end" style=${`inset-inline-start: ${x(at + wait)}px`}></span>
                `}
                <span class="kf-start" style=${`inset-inline-start: ${x(at) - nudge}px`}></span>
              </span>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}
