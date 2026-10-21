// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html } from "/vendor/preact.js";
import { roleKey, roles } from "./states-pane.js";
import { Status } from "./status.js";

/** Sanny lines, one per row. */
function Code({ lines }) {
  return html`<pre class="code">${lines.join("\n")}</pre>`;
}

/** A state name that selects that state. */
function StateLink({ id, onSelect }) {
  return html`<button class="link" title=${`Select ${id}`} onClick=${() => onSelect(id)}>${id}</button>`;
}

function Section({ heading, children }) {
  return html`<section class="detail"><h3>${heading}</h3>${children}</section>`;
}

const tests = (conds) => conds.map((c) => c.test);

/** The selected state's name and roles. The pane keeps it outside the scrolling body. */
export function InspectorTitle({ doc, selected }) {
  return html`
    <h3 class="state-name">${selected}</h3>
    ${roles(doc, selected).map((role) => html`<span class="chip" key=${role} data-role=${roleKey(role)}>${role}</span>`)}
  `;
}

/** What the selected state does: where it comes from, what it runs, and where it goes. Read-only for now. */
export function InspectorPane({ doc, edges, selected, onSelect }) {
  if (!selected) {
    return html`<${Status} heading="No State Selected">Select a state in the list or the graph to see its details.<//>`;
  }
  const { mission } = doc;
  const state = mission.states[selected];
  const enteredFrom = [...new Set(edges.filter((e) => e.to === selected).map((e) => e.from))];
  const beats = state.beats ?? [];
  const total = beats.reduce((sum, beat) => sum + (beat.wait ?? 0), 0);
  const link = (id) => html`<${StateLink} id=${id} onSelect=${onSelect} />`;

  return html`
    <div class="inspector">
      <${Section} heading="Flow">
        <dl class="facts">
          <dt>Entered From</dt>
          <dd>${enteredFrom.length ? enteredFrom.map((id) => html`<span key=${id}>${link(id)} </span>`) : "Nothing"}${mission.start === selected ? " (mission start)" : ""}</dd>
          ${state.next && html`<dt>Next</dt><dd>${link(state.next)}</dd>`}
          ${state.finish && html`<dt>Finishes</dt><dd>The mission, once the beats end</dd>`}
        </dl>
        ${state.until?.length > 0 && html`<p class="hint">Waits until all of these hold:</p><${Code} lines=${tests(state.until)} />`}
        ${(state.on ?? []).map((rule, i) => html`
          <p class="hint" key=${i}>Goes to ${link(rule.goto)} when:</p>
          <${Code} lines=${tests(rule.when)} />
        `)}
      <//>

      <${Section} heading="Fail Check">
        <p>${state.fail === false
          ? "Off in this state."
          : html`On. A failing condition goes to ${link(mission.onFail)}.`}</p>
      <//>

      ${state.onEnter?.length > 0 && html`<${Section} heading="Enter Steps"><${Code} lines=${state.onEnter.flat()} /><//>`}
      ${state.onExit?.length > 0 && html`<${Section} heading="Exit Steps"><${Code} lines=${state.onExit.flat()} /><//>`}
      ${state.resetLatches && html`<${Section} heading="Monitor Latches"><p>Cleared on entry.</p><//>`}

      <${Section} heading="Beats">
        <p>${beats.length ? `${beats.length} ${beats.length === 1 ? "beat" : "beats"} over ${(total / 1000).toFixed(1)}s. See the timeline.` : "None."}</p>
      <//>

      ${state.notes?.length > 0 && html`<${Section} heading="Notes"><ul class="notes">${state.notes.map((n, i) => html`<li key=${i}>${n}</li>`)}</ul><//>`}
    </div>
  `;
}
