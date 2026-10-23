// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html } from "/vendor/preact.js";
import { Plus } from "./add-state.js";
import { Status } from "./status.js";
import { CondList, NumberField, StepList } from "./step-controls.js";

const beatsOf = (doc, id) => doc.mission.states[id]?.beats ?? [];

/** The beat to show: the picked index, kept inside the state's beats. */
export function activeBeat(doc, id, picked) {
  const count = id ? beatsOf(doc, id).length : 0;
  return count ? Math.min(picked, count - 1) : -1;
}

/** `+` on the Beat heading: adds a beat after the shown one (or first) and shows it. */
export function BeatAdd({ selected, index, edit, onPick }) {
  if (!selected) return null;
  const at = index + 1;
  const add = () => {
    edit("Add Beat", (d) => {
      const state = d.mission.states[selected];
      state.beats = [...(state.beats ?? [])];
      state.beats.splice(at, 0, { wait: 1000 });
    });
    onPick(at);
  };
  return html`<button class="icon" aria-label="Add a beat to this state" title="Add Beat" onClick=${add}><${Plus} /></button>`;
}

/** The shown beat's number among the state's beats, with buttons to reorder or remove it. */
export function BeatBar({ doc, selected, index, edit, onPick }) {
  const beats = selected ? beatsOf(doc, selected) : [];
  if (index < 0) return null;

  const move = (by) => {
    const to = index + by;
    if (to < 0 || to >= beats.length) return;
    edit("Move Beat", (d) => {
      const list = d.mission.states[selected].beats;
      [list[index], list[to]] = [list[to], list[index]];
    });
    onPick(to);
  };
  const remove = () => {
    edit("Remove Beat", (d) => { d.mission.states[selected].beats.splice(index, 1); });
    onPick(Math.max(0, index - 1));
  };

  return html`
    <strong>Beat ${index + 1}</strong><span class="hint"> of ${beats.length}</span>
    <span class="title-tools">
      <button class="tool" aria-label=${`Move beat ${index + 1} earlier`} title="Move Earlier" disabled=${index === 0} onClick=${() => move(-1)}>↑</button>
      <button class="tool" aria-label=${`Move beat ${index + 1} later`} title="Move Later" disabled=${index === beats.length - 1} onClick=${() => move(1)}>↓</button>
      <button class="tool danger" aria-label=${`Remove beat ${index + 1}`} title="Remove Beat" onClick=${remove}>✕</button>
    </span>
  `;
}

/** The form for one beat: how long it waits, when it runs, what it does, and its notes. */
export function BeatPane({ doc, selected, index, edit }) {
  if (!selected) {
    return html`<${Status} heading="No State Selected">Select a state to edit its beats.<//>`;
  }
  const beats = beatsOf(doc, selected);
  if (index < 0) {
    return html`<${Status} heading="No Story Beats">${selected} has no story beats. Add one with +.<//>`;
  }
  const beat = beats[index];
  const change = (label, fn, key) => edit(label, (d) => fn(d.mission.states[selected].beats[index]), key ? { key: `${selected}:beat${index}:${key}` } : {});

  return html`
    <div class="inspector" key=${`${selected}:${index}`}>
      <${NumberField} label="Duration (ms)" value=${beat.wait ?? 0} onCommit=${(wait) => change("Beat Duration", (b) => { b.wait = wait; }, "wait")} />
      <section class="detail">
        <div class="detail-head"><h3>Only If</h3></div>
        <${CondList} conds=${beat.when ?? []} emptyText="Always runs." onChange=${(when) => change("Beat Conditions", (b) => { b.when = when; })} />
      </section>
      <section class="detail">
        <div class="detail-head"><h3>Steps</h3></div>
        <${StepList} steps=${beat.do ?? []} emptyText="No steps." onChange=${(list) => change("Beat Steps", (b) => { b.do = list; })} />
      </section>
      <section class="detail">
        <div class="detail-head"><h3>Notes</h3></div>
        <textarea rows=${Math.max(2, (beat.notes ?? []).length)} aria-label="Beat Notes" value=${(beat.notes ?? []).join("\n")}
          onInput=${(e) => { const text = e.currentTarget.value; change("Beat Notes", (b) => { b.notes = text ? text.split("\n") : []; }, "notes"); }}></textarea>
      </section>
    </div>
  `;
}
