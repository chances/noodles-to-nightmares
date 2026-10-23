// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useRef, useState } from "/vendor/preact.js";
import { nameError } from "./document.js";
import { stateKindIcon } from "./icons.js";
import { FINISH } from "./mission-ops.js";
import { KINDS } from "./sections.js";
import { formatName, reformat } from "./templates.js";

export function Plus() {
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>`;
}

/**
 * Asks for what a new state needs: its name, its kind, the state it comes after, and where it leads.
 * `selected` fills Comes After, and Leads To follows that state's Next until it is changed by hand.
 */
export function AddStateDialog({ mission, selected, onCreate, onClose }) {
  const states = Object.keys(mission.states);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("cutscene");
  const [after, setAfter] = useState(selected ?? "");
  const [leadsTo, setLeadsTo] = useState(selected ? mission.states[selected].next ?? "" : "");
  const [leadsTouched, setLeadsTouched] = useState(false);
  const dialog = useRef(null);
  const open = (el) => {
    dialog.current = el;
    if (el && !el.open) el.showModal();
  };

  // An empty name is only reported once Add State is pressed, so the dialog opens without an error showing.
  const [submitted, setSubmitted] = useState(false);
  const error = name || submitted ? nameError(name, mission, "") : "";
  const nameInput = useRef(null);

  const chooseAfter = (id) => {
    setAfter(id);
    if (!leadsTouched) setLeadsTo(id ? mission.states[id].next ?? "" : "");
  };
  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name || nameError(name, mission, "")) {
      nameInput.current.focus();
      return;
    }
    onCreate({ name, kind, after, leadsTo });
    dialog.current.close();
  };

  return html`
    <dialog ref=${open} onClose=${onClose}>
      <h2>Add State</h2>
      <form class="form" onSubmit=${submit}>
        <label class="mini"><span>Name</span>
          <input ref=${nameInput} value=${name} placeholder="WALK_HOME" aria-invalid=${Boolean(error)} spellcheck=${false} autofocus
            onInput=${(e) => setName(reformat(e.currentTarget, formatName))} />
          ${error && html`<small class="error" role="alert">${error}</small>`}
        </label>
        <label class="mini"><span>Kind</span>
          <div class="kind-select-wrapper">
            <span class="kind-icon" title=${kind}>${stateKindIcon(kind)}</span>
            <select value=${kind} onChange=${(e) => setKind(e.currentTarget.value)}>
              ${KINDS.map(([id, label]) => html`<option key=${id} value=${id}>${label}</option>`)}
            </select>
          </div>
        </label>
        <div class="flow-row">
          <label class="mini"><span>Comes After</span>
            <select value=${after} onChange=${(e) => chooseAfter(e.currentTarget.value)}>
              <option value="">Nothing</option>
              ${states.map((id) => html`<option key=${id} value=${id}>${id}</option>`)}
            </select>
          </label>
          <span class="flow-arrow" aria-hidden="true">→</span>
          <span class="chip flow-self" title="The state being added">${name || "This State"}</span>
          <span class="flow-arrow" aria-hidden="true">→</span>
          <label class="mini"><span>Leads To</span>
            <select value=${leadsTo} onChange=${(e) => { setLeadsTouched(true); setLeadsTo(e.currentTarget.value); }}>
              <option value="">Nowhere</option>
              <option value=${FINISH}>Finishes the mission</option>
              ${states.map((id) => html`<option key=${id} value=${id}>${id}</option>`)}
            </select>
          </label>
        </div>
        <div class="actions">
          <button type="button" onClick=${() => dialog.current.close()}>Cancel</button>
          <button class="primary">Add State</button>
        </div>
      </form>
    </dialog>
  `;
}
