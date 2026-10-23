// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useContext, useEffect, useRef, useState } from "/vendor/preact.js";
import { Plus } from "./add-state.js";
import { deleteState, inboundTo, nameError, renameState } from "./document.js";
import { renameMonitor } from "./refactor.js";
import { hasData, KIND_SECTIONS, KINDS, kindOf, SECTIONS, takeOpened } from "./sections.js";
import { missionLabel } from "./mission-label.js";
import { formatName, formatNumber, reformat } from "./templates.js";
import { roleKey, roles } from "./states-pane.js";
import { CondList, Combo, EditorContext, FieldInput, StepList } from "./step-controls.js";

// @remarks The Script pane is the form for the selected state, or the Mission form when nothing is selected. Beats are
// edited in the Beat pane, not here. Every keystroke commits through `edit`, one undoable command per change, with
// edits to one field merged by time. The start and fail states cannot be deleted, and deleting any other state
// clears the `next` and branches that pointed at it. Renaming rewrites every `next`, `goto`, `start`, `onFail`, and
// `STATE_` constant in step text, and renaming a monitor rewrites its `latch` local (see `refactor.js`).

const lines = (text) => text.split("\n");

function StateLink({ id, onSelect }) {
  return html`<button class="link" title=${`Select ${id}`} onClick=${() => onSelect(id)}>${id}</button>`;
}

/** `action` is a control for the heading row, such as Add Branch; it sits beside the remove button. */
function Section({ heading, action = null, onRemove, children }) {
  return html`
    <section class="detail">
      <div class="detail-head">
        <h3>${heading}</h3>
        <span class="item-tools">
          ${action}
          ${onRemove && html`<button class="tool danger" aria-label=${`Remove ${heading}`} title="Remove Section" onClick=${onRemove}>✕</button>`}
        </span>
      </div>
      ${children}
    </section>
  `;
}

function Pencil() {
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>`;
}

function Trash() {
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>`;
}

/** Asks before a state goes, naming what points at it. */
function DeleteDialog({ id, mission, onConfirm, onClose }) {
  const { edges, isStart, isOnFail } = inboundTo(mission, id);
  const blocked = isStart ? "the start state" : isOnFail ? "the fail state" : "";
  const open = (el) => { if (el && !el.open) el.showModal(); };
  return html`
    <dialog ref=${open} onClose=${(e) => { if (e.currentTarget.returnValue === "delete") onConfirm(); onClose(); }}>
      <h2>Delete ${id}?</h2>
      ${blocked
        ? html`<p>${id} is ${blocked}. Pick another ${isStart ? "start" : "fail"} state in the mission form, then delete it.</p>`
        : edges.length
          ? html`<p>These states will lose their link to ${id}:</p>
              <ul class="notes">${edges.map((e, i) => html`<li key=${i}>${e.from}: ${e.kind === "next" ? "Next state is cleared" : "Branch is removed"}</li>`)}</ul>`
          : html`<p>Nothing leads to ${id}.</p>`}
      ${!blocked && html`<p class="hint">Undo (Ctrl+Z) brings it back.</p>`}
      <form method="dialog" class="actions">
        <button value="cancel" autofocus>Keep State</button>
        <button value="delete" class="danger-fill" disabled=${Boolean(blocked)}>Delete State</button>
      </form>
    </dialog>
  `;
}

/** The inline text field that replaces the title while a state is renamed. */
function RenameField({ id, mission, onCommit, onCancel }) {
  const [draft, setDraft] = useState(id);
  const input = useRef(null);
  useEffect(() => { input.current.select(); }, []);
  const error = nameError(draft, mission, id);
  const submit = (e) => {
    e.preventDefault();
    if (error) return;
    if (draft !== id) onCommit(draft);
    else onCancel();
  };
  return html`
    <form class="rename" onSubmit=${submit}>
      <input ref=${input} value=${draft} aria-label="State Name" aria-invalid=${Boolean(error)} spellcheck=${false}
        placeholder="WALK_HOME"
        onInput=${(e) => setDraft(reformat(e.currentTarget, formatName))}
        onKeyDown=${(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }} />
      ${error && html`<small class="error" role="alert">${error}</small>`}
    </form>
  `;
}

/** The mission's name beside the Inspector heading while a state is selected; it returns to the mission form. */
export function InspectorCrumb({ doc, onSelect }) {
  return html`<button class="link" title="Show The Mission Script" onClick=${() => onSelect(null)}>${missionLabel(doc.stem)}</button>`;
}

/**
 * The selected state's name, roles, kind, and the rename and delete buttons; the mission's name when nothing
 * is selected. The pane keeps it outside the scrolling body.
 */
export function InspectorTitle({ doc, selected, edit, onSelect }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { setRenaming(false); setDeleting(false); }, [selected, doc.stem]);

  if (!selected) return html`<h3 class="state-name">${missionLabel(doc.stem)}</h3>`;
  const state = doc.mission.states[selected];
  if (!state) return null;

  const rename = (to) => {
    edit("Rename State", (d) => renameState(d, selected, to));
    setRenaming(false);
    onSelect(to);
  };
  const setKind = (e) => {
    const kind = e.currentTarget.value;
    edit("Change Kind", (d) => { d.mission.states[selected].kind = kind; });
    // The new kind's sections open even though they hold nothing yet; the sections already filled stay.
    globalThis.dispatchEvent(new CustomEvent("open-sections", { detail: { id: selected, sections: KIND_SECTIONS[kind] } }));
  };

  return html`
    ${renaming
      ? html`<${RenameField} id=${selected} mission=${doc.mission} onCommit=${rename} onCancel=${() => setRenaming(false)} />`
      : html`
        <h3 class="state-name">${selected}</h3>
        ${roles(doc, selected).map((role) => html`<span class="chip" key=${role} data-role=${roleKey(role)}>${role}</span>`)}
        <button class="icon" aria-label=${`Rename state ${selected}`} title="Rename State" onClick=${() => setRenaming(true)}><${Pencil} /></button>`}
    <span class="title-tools">
      <label class="mini kind">
        <span class="sr-only">Kind</span>
        <select value=${kindOf(state)} onChange=${setKind}>
          ${!kindOf(state) && html`<option value="">Choose a kind</option>`}
          ${KINDS.map(([id, label]) => html`<option key=${id} value=${id}>${label}</option>`)}
        </select>
      </label>
      <button class="icon danger" aria-label=${`Delete state ${selected}`} title="Delete State" onClick=${() => setDeleting(true)}><${Trash} /></button>
    </span>
    ${deleting && html`
      <${DeleteDialog} id=${selected} mission=${doc.mission}
        onConfirm=${() => { edit("Delete State", (d) => deleteState(d, selected)); onSelect(null); }}
        onClose=${() => setDeleting(false)} />`}
  `;
}

function StateSelect({ label, value, states, none, onChange }) {
  return html`
    <label class="mini"><span>${label}</span>
      <select value=${value ?? ""} onChange=${(e) => onChange(e.currentTarget.value)}>
        ${none && html`<option value="">${none}</option>`}
        ${states.map((id) => html`<option key=${id} value=${id}>${id}</option>`)}
      </select>
    </label>
  `;
}

/** Branches: the first rule whose conditions hold picks the next state. */
function BranchesForm({ rules, states, onChange }) {
  const [generation, setGeneration] = useState(0);
  const replace = (i, patch) => onChange(rules.map((rule, j) => (j === i ? { ...rule, ...patch } : rule)));
  return html`
    <div class="typed-list">
      <ol class="items">
        ${rules.map((rule, i) => html`
          <li class="item" key=${`${generation}-${i}`}>
            <div class="item-head">
              <span class="item-label">Branch ${i + 1}</span>
              <span class="item-tools"><button class="tool danger" aria-label=${`Remove branch ${i + 1}`} title="Remove Branch" onClick=${() => { setGeneration(generation + 1); onChange(rules.filter((_, j) => j !== i)); }}>✕</button></span>
            </div>
            <${StateSelect} label="Go To State" value=${rule.goto} states=${states} onChange=${(goto) => replace(i, { goto })} />
            <p class="hint">When all of these hold:</p>
            <${CondList} conds=${rule.when} onChange=${(when) => replace(i, { when })} />
          </li>`)}
      </ol>
    </div>
  `;
}

function SectionBody({ id, state, states, change }) {
  switch (id) {
    case "onEnter": return html`<${StepList} steps=${state.onEnter ?? []} emptyText="Nothing runs on entry." onChange=${(v) => change("Enter Steps", (s) => { s.onEnter = v; })} />`;
    case "onExit": return html`<${StepList} steps=${state.onExit ?? []} emptyText="Nothing runs on exit." onChange=${(v) => change("Exit Steps", (s) => { s.onExit = v; })} />`;
    case "until": return html`
      <p class="hint">After the story beats, wait until all of these hold, then go to Next.</p>
      <${CondList} conds=${state.until ?? []} emptyText="Add a condition to hold this state until it is true." onChange=${(v) => change("Wait Until", (s) => { s.until = v; })} />`;
    case "branches": return html`
      <p class="hint">After the story beats, the first branch whose conditions hold picks the next state.</p>
      <${BranchesForm} rules=${state.on ?? []} states=${states} onChange=${(v) => change("Branches", (s) => { s.on = v; })} />`;
    case "latches": return html`<p>Every monitor can fire again after this state is entered.</p>`;
    case "notes": return html`<textarea rows=${Math.max(2, (state.notes ?? []).length)} aria-label="Notes" value=${(state.notes ?? []).join("\n")}
      onInput=${(e) => { const text = e.currentTarget.value; change("Notes", (s) => { s.notes = lines(text); }, "notes"); }}></textarea>`;
  }
}

/** The form for one state: Flow and Fail Check always, then the sections it has. */
function StateForm({ doc, edges, id, problems, onSelect, edit }) {
  const { mission } = doc;
  const state = mission.states[id];
  const states = Object.keys(mission.states);
  const [opened, setOpened] = useState(() => takeOpened(id));
  const isOpen = (section) => opened[`${id}:${section.id}`] || hasData(state, section);

  useEffect(() => {
    const open = ({ detail }) => setOpened((o) => ({ ...o, ...Object.fromEntries(detail.sections.map((s) => [`${detail.id}:${s}`, true])) }));
    globalThis.addEventListener("open-sections", open);
    return () => globalThis.removeEventListener("open-sections", open);
  }, []);

  const change = (label, fn, key) => edit(label, (d) => fn(d.mission.states[id], d.mission), key ? { key: `${id}:${key}` } : {});
  const enteredFrom = [...new Set(edges.filter((e) => e.to === id).map((e) => e.from))];
  const link = (to) => html`<${StateLink} id=${to} onSelect=${onSelect} />`;
  const absent = SECTIONS.filter((s) => !isOpen(s));

  const add = (e) => {
    const section = SECTIONS.find((s) => s.id === e.currentTarget.value);
    e.currentTarget.value = "";
    if (!section) return;
    setOpened((o) => ({ ...o, [`${id}:${section.id}`]: true }));
    // Latches are the one section that holds a flag, so adding it sets the flag.
    if (section.id === "latches") change("Add Section", (s) => { s.resetLatches = true; });
  };
  const remove = (section) => () => {
    setOpened((o) => ({ ...o, [`${id}:${section.id}`]: false }));
    change("Remove Section", (s) => { delete s[section.field]; });
  };

  const mine = problems.filter((p) => p.state === id);

  return html`
    <div class="inspector">
      ${mine.length > 0 && html`
        <ul class="problems">
          ${mine.map((p, i) => html`<li key=${i} data-level=${p.severity}><span class="chip" data-level=${p.severity}>${p.severity === "error" ? "Error" : "Warning"}</span><span>${p.message}</span></li>`)}
        </ul>`}
      <${Section} heading="Flow">
        <dl class="facts">
          <dt>Entered From</dt>
          <dd>${enteredFrom.length ? enteredFrom.map((from) => html`<span key=${from}>${link(from)} </span>`) : "Nothing"}${mission.start === id ? " (mission start)" : ""}</dd>
        </dl>
        <${StateSelect} label="Next State" value=${state.next} states=${states} none="No Next State"
          onChange=${(next) => change("Next State", (s) => { if (next) s.next = next; else delete s.next; })} />
        <label class="check">
          <input type="checkbox" checked=${Boolean(state.finish)} onChange=${(e) => { const on = e.currentTarget.checked; change("Finish Mission", (s) => { s.finish = on; }); }} />
          Finishes the mission after its beats
        </label>
      <//>

      <${Section} heading="Fail Check">
        <label class="check">
          <input type="checkbox" checked=${state.fail !== false} onChange=${(e) => { const on = e.currentTarget.checked; change("Fail Check", (s) => { if (on) delete s.fail; else s.fail = false; }); }} />
          A failing condition goes to ${link(mission.onFail)}
        </label>
      <//>

      ${SECTIONS.filter(isOpen).map((section) => html`
        <${Section} key=${`${id}:${section.id}`} heading=${section.heading} onRemove=${remove(section)}
          action=${section.id === "branches" && html`<button class="icon" aria-label="Add a branch to this state" title="Add Branch" onClick=${() => change("Add Branch", (s) => { s.on = [...(s.on ?? []), { when: [], goto: states[0] }]; })}><${Plus} /></button>`}>
          <${SectionBody} id=${section.id} state=${state} states=${states} change=${change} />
        <//>`)}

      ${absent.length > 0 && html`
        <select class="add" aria-label="Add Section" value="" onChange=${add}>
          <option value="">Add Section</option>
          ${absent.map((s) => html`<option key=${s.id} value=${s.id}>${s.heading}</option>`)}
        </select>`}
    </div>
  `;
}

const constValue = (c) => (Array.isArray(c) ? c[0] : c);
const constComment = (c) => (Array.isArray(c) ? c[1] : "");

function ConstRow({ name, value, onChange, onRemove }) {
  const [draft, setDraft] = useState(String(constValue(value)));
  const valid = draft.trim() !== "" && Number.isFinite(Number(draft));
  const comment = constComment(value);
  const set = (number, text) => onChange(name, text ? [number, text] : number);
  return html`
    <li class="item">
      <div class="item-head">
        <span class="item-label">${name}</span>
        <span class="item-tools"><button class="tool danger" aria-label=${`Remove ${name}`} title="Remove Constant" onClick=${onRemove}>✕</button></span>
      </div>
      <div class="fields">
        <label class="mini"><span>Value</span>
          <input value=${draft} aria-invalid=${!valid} inputmode="decimal"
            onInput=${(e) => { const text = reformat(e.currentTarget, formatNumber); setDraft(text); if (text.trim() !== "" && Number.isFinite(Number(text))) set(Number(text), comment); }} />
          ${!valid && html`<small class="error">Enter a number.</small>`}
        </label>
        <label class="mini"><span>Comment</span>
          <input value=${comment} onInput=${(e) => set(constValue(value), e.currentTarget.value)} />
        </label>
      </div>
    </li>
  `;
}

const NAME_FIELD = { type: "name" };

/** The mission-level form, shown when no state is selected. */
function MissionForm({ doc, edit }) {
  const { mission } = doc;
  const states = Object.keys(mission.states);
  const consts = Object.entries(mission.consts ?? {});
  const monitors = mission.monitors ?? [];
  const change = (label, fn, key) => edit(label, (d) => fn(d.mission), key ? { key: `mission:${key}` } : {});
  const setConst = (name, value) => change("Constant", (m) => { m.consts = { ...m.consts, [name]: value }; }, `const:${name}`);
  const addMonitor = () => change("Add Monitor", (m) => {
    let n = monitors.length + 1;
    while (monitors.some((x) => x.id === `monitor${n}`)) n++;
    m.monitors = [...monitors, { id: `monitor${n}`, when: [], once: [] }];
  });
  const patchMonitor = (i, patch, key) => change("Monitor", (m) => {
    const from = m.monitors[i].id;
    // A name another monitor has is refused whole: taking it would merge the two latches.
    const { id, ...rest } = patch;
    if (id !== undefined && id !== from) renameMonitor(m, from, id);
    m.monitors = m.monitors.map((x, j) => (j === i ? { ...x, ...rest } : x));
  }, key);
  const [newConst, setNewConst] = useState("");
  const constError = newConst in (mission.consts ?? {}) ? `A constant named ${newConst} already exists.` : "";
  const { sannyFiles } = useContext(EditorContext);
  const [adding, setAdding] = useState(false);
  const addBox = useRef(null);
  useEffect(() => { addBox.current?.querySelector("input")?.focus(); }, [adding]);
  const included = mission.includes ?? ["../utils/missions.txt"];
  const fileOptions = sannyFiles.map((value) => ({ value }));
  const addable = sannyFiles.filter((file) => !included.includes(file));
  const setIncludes = (label, next) => change(label, (m) => { m.includes = next; });
  const moveInclude = (i, by) => {
    const to = i + by;
    if (to < 0 || to >= included.length) return;
    const next = [...included];
    [next[i], next[to]] = [next[to], next[i]];
    setIncludes("Move Include", next);
  };

  return html`
    <div class="inspector">
      <${Section} heading="Identity">
        <label class="mini"><span>Description</span>
          <textarea rows=${Math.max(2, mission.header.length)} placeholder="Comment lines at the top of the generated file." value=${mission.header.join("\n")}
            onInput=${(e) => { const text = e.currentTarget.value; change("Header", (m) => { m.header = lines(text); }, "header"); }}></textarea>
        </label>
        <div class="fields mission-state-fields">
          <${StateSelect} label="Start State" value=${mission.start} states=${states} onChange=${(id) => change("Start State", (m) => { m.start = id; })} />
          <${StateSelect} label="Fail State" value=${mission.onFail} states=${states} onChange=${(id) => change("Fail State", (m) => { m.onFail = id; })} />
        </div>
      <//>

      <${Section} heading="Constants">
        ${consts.length === 0 && html`<p class="hint">No constants. Add one to name a number such as a reward.</p>`}
        <ul class="items">
          ${consts.map(([name, value]) => html`
            <${ConstRow} key=${name} name=${name} value=${value} onChange=${setConst}
              onRemove=${() => change("Remove Constant", (m) => { delete m.consts[name]; })} />`)}
        </ul>
        <form class="add-row" onSubmit=${(e) => { e.preventDefault(); if (newConst && !constError) { setConst(newConst, 0); setNewConst(""); } }}>
          <input value=${newConst} placeholder="NAME" aria-label="New Constant Name" aria-invalid=${Boolean(constError)} onInput=${(e) => setNewConst(reformat(e.currentTarget, formatName))} />
          <button disabled=${!newConst || Boolean(constError)}>Add Constant</button>
        </form>
        ${constError && html`<small class="error">${constError}</small>`}
      <//>

      <${Section} heading="Failure Conditions">
        <p class="hint">Any one of these sends the mission to ${mission.onFail}, in every state that checks.</p>
        <${CondList} conds=${mission.fail} emptyText="No failure conditions exist, so this mission cannot fail." onChange=${(v) => change("Fail Conditions", (m) => { m.fail = v; })} />
      <//>

      <${Section} heading="Monitors"
        action=${html`<button class="icon" aria-label="Add a monitor to this mission" title="Add Monitor" onClick=${addMonitor}><${Plus} /></button>`}>
        <p class="hint">A monitor runs in every state and fires its steps once, the first time its conditions hold.</p>
        <ul class="items">
          ${monitors.map((monitor, i) => html`
            <li class="item" key=${i}>
              <div class="item-head">
                <span class="item-label">${monitor.id}</span>
                <span class="item-tools"><button class="tool danger" aria-label=${`Remove ${monitor.id}`} title="Remove Monitor" onClick=${() => change("Remove Monitor", (m) => { m.monitors = monitors.filter((_, j) => j !== i); })}>✕</button></span>
              </div>
              <label class="mini"><span>Name</span>
                <${FieldInput} field=${NAME_FIELD} value=${monitor.id} onCommit=${(id) => patchMonitor(i, { id }, `monitor:${i}`)} />
              </label>
              <p class="hint">When all of these hold:</p>
              <${CondList} conds=${monitor.when} onChange=${(when) => patchMonitor(i, { when })} />
              <p class="hint">Then, once:</p>
              <${StepList} steps=${monitor.once} onChange=${(once) => patchMonitor(i, { once })} />
            </li>`)}
        </ul>
      <//>

      <${Section} heading="Includes"
        action=${html`<button class="icon" aria-label="Add an include" title="Add Include" onClick=${() => setAdding(!adding)}><${Plus} /></button>${mission.includes && html`<button onClick=${() => change("Default Includes", (m) => { delete m.includes; })}>Use Default Include</button>`}`}>
        <p class="hint">${mission.includes ? "Sanny files included after the generated code, in this order." : "The default, ../utils/missions.txt, is included."}</p>
        ${included.length === 0 && html`<p class="hint">No Sanny files are included.</p>`}
        <ol class="items">
          ${included.map((path, i) => html`
            <li class="item" key=${i}>
              <div class="item-head">
                <span class="item-label">Include ${i + 1}</span>
                <span class="item-tools">
                  <button class="tool" aria-label=${`Move include ${i + 1} up`} title="Move Up" onClick=${() => moveInclude(i, -1)}>↑</button>
                  <button class="tool" aria-label=${`Move include ${i + 1} down`} title="Move Down" onClick=${() => moveInclude(i, 1)}>↓</button>
                  <button class="tool danger" aria-label=${`Remove include ${i + 1}`} title="Remove Include" onClick=${() => setIncludes("Remove Include", included.filter((_, j) => j !== i))}>✕</button>
                </span>
              </div>
              <${Combo} value=${path} options=${fileOptions} label=${`Sanny file for include ${i + 1}`} missing="is not a Sanny file in this project"
                onCommit=${(next) => setIncludes("Include", included.map((p, j) => (j === i ? next : p)))} />
            </li>`)}
        </ol>
        ${adding && addable.length > 0 && html`
          <div ref=${addBox}>
            <${Combo} value="" options=${addable.map((value) => ({ value }))} label="Add Include" missing="is not a Sanny file in this project"
              onCommit=${(next) => { setIncludes("Add Include", [...included, next]); setAdding(false); }} />
          </div>`}
      <//>
    </div>
  `;
}

/** The form for the selected state, or for the mission when nothing is selected. */
export function InspectorPane({ doc, edges, problems, selected, onSelect, edit }) {
  if (selected && doc.mission.states[selected]) {
    return html`<${StateForm} key=${selected} doc=${doc} edges=${edges} problems=${problems} id=${selected} onSelect=${onSelect} edit=${edit} />`;
  }
  return html`<${MissionForm} doc=${doc} edit=${edit} />`;
}
