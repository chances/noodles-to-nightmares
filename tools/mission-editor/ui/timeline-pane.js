// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef } from "/vendor/preact.js";
import { Status } from "./status.js";
import { revealElement } from "./reveal.js";

// These two match `--second` and `--pad` on `.timeline-grid` in styles.css.
const PX_PER_SECOND = 48;
const PAD = 10;
const LABEL_EVERY = 5;
const MIN_SECONDS = 5;
/** The narrowest a beat's card is drawn, in pixels, so a beat that waits no time can still be clicked. */
const MIN_CARD = 64;
const CARD_GAP = 3;

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
    ...(beat.await ? [`Wait until ${beat.await.map((c) => c.test).join(" and ")}`] : []),
    ...(beat.do ?? []).flat(),
  ].join("\n");
}

/** The card's second line: how long the beat waits, then what else it carries. An await beat shows its conditions instead. */
function details(beat) {
  if (beat.await) return `until ${beat.await.length} ${beat.await.length === 1 ? "condition" : "conditions"}`;
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
  return html`<strong>${selected}</strong><span class="hint"> · ${beats.length} Story ${beats.length === 1 ? "Beat" : "Beats"} · ${seconds(total)}</span>`;
}

/**
 * The beats of the selected state on one track, like a Flash timeline: a time axis on top, a keyframe where each
 * beat starts, and a card spanning the time it waits. A beat that waits no time is only a keyframe.
 */
export function TimelinePane({ doc, selected, beat: shown, onSelectBeat }) {
  // The selected beat is scrolled into view when the pane opens, such as on load, and when a beat is picked elsewhere.
  const grid = useRef(null);
  useEffect(() => {
    const picked = grid.current?.querySelector('[aria-pressed="true"]');
    if (!picked) return;
    revealElement(picked, "inline", CARD_GAP);
    revealElement(picked, "block");
  }, [shown, selected]);
  if (!selected) {
    return html`<${Status} heading="No State Selected">Select a state in the list or the graph to see its beats.<//>`;
  }
  const beats = doc.mission.states[selected].beats ?? [];
  if (!beats.length) {
    return html`<${Status} heading="No Story Beats">${selected} has no story beats. Add one with + on the Beat pane.<//>`;
  }

  const x = (ms) => PAD + (ms / 1000) * PX_PER_SECOND;
  // Every beat is a card at least MIN_CARD wide, so a beat that waits no time can still be picked. A card never
  // overlaps the one before it; after a short beat the cards drift right of their true time (the tooltip has it).
  let start = 0;
  let cursor = PAD;
  const placed = beats.map((beat, index) => {
    const wait = beat.wait ?? 0;
    const left = Math.max(x(start), cursor);
    const width = Math.max((wait / 1000) * PX_PER_SECOND, MIN_CARD);
    cursor = left + width + CARD_GAP;
    const item = { beat, index, at: start, left, width };
    start += wait;
    return item;
  });
  const totalSeconds = Math.max(MIN_SECONDS, Math.ceil(start / 1000));
  const labels = Array.from({ length: Math.floor(totalSeconds / LABEL_EVERY) + 1 }, (_, i) => i * LABEL_EVERY);
  const spanPx = Math.max(x(totalSeconds * 1000), cursor) + PAD;

  return html`
    <div class="timeline-grid" ref=${grid} role="table" aria-label=${`Beats of ${selected}`} style=${`--span: ${spanPx}px`}>
      <div role="row">
        <div class="tl-corner" role="columnheader"></div>
        <div class="tl-ruler" role="columnheader" aria-label="Time in seconds">
          ${labels.map((s) => html`<span class="tl-label" key=${s} style=${`inset-inline-start: ${x(s * 1000)}px`}>${s}s</span>`)}
        </div>
      </div>
      <div role="row">
        <div class="tl-name" role="rowheader">
          <strong>Story Beats</strong>
          <span>${beats.length} · ${seconds(start)}</span>
        </div>
        <div class="tl-track" role="cell">
          ${placed.map(({ beat, index, at, left, width }) => {
            const steps = beat.do ?? [];
            const wait = beat.wait ?? 0;
            const pick = () => onSelectBeat(index);
            const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
            const press = { role: "button", tabindex: 0, "aria-pressed": shown === index, "aria-label": `Edit beat ${index + 1}`, onClick: pick, onKeyDown: key };
            return html`
              <span key=${index} title=${tooltip(beat, index, at)}>
                <span class="kf-card" data-conditional=${beat.when?.length ? "" : undefined} data-instant=${wait === 0 ? "" : undefined} ...${press}
                  style=${`inset-inline-start: ${left}px; inline-size: ${width}px`}>
                  <strong>${beat.await ? "Await" : steps.length ? describe(steps[0]) : "Wait"}</strong>
                  <span>${details(beat)}</span>
                </span>
                ${wait > 0 && html`<span class="kf-end" style=${`inset-inline-start: ${left + width}px`}></span>`}
                <span class="kf-start" aria-hidden="true" onClick=${pick} style=${`inset-inline-start: ${left}px`}></span>
              </span>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}
