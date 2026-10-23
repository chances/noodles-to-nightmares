// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef } from "/vendor/preact.js";
import { stateKindIcon } from "./icons.js";
import { kindOf } from "./sections.js";

/** The roles a state plays, as chip labels. Shared by the list and the graph. */
export function roles(doc, id) {
  const state = doc.mission.states[id];
  return [
    doc.mission.start === id && "Start",
    doc.mission.onFail === id && "On Fail",
    state.finish && "Finish",
  ].filter(Boolean);
}

/** The CSS key of a role label: `On Fail` is `on-fail`. */
export const roleKey = (role) => role.toLowerCase().replace(" ", "-");

/** Every state in graph order (left to right, then top to bottom), one row each. */
export function StatesPane({ doc, selected, onSelect }) {
  const ids = Object.keys(doc.mission.states).sort((a, b) =>
    doc.layout[a].x - doc.layout[b].x || doc.layout[a].y - doc.layout[b].y
  );
  // A state picked elsewhere, such as a state link, scrolls its row into view.
  const list = useRef(null);
  useEffect(() => {
    list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return html`
    <ul class="state-list" ref=${list}>
      ${ids.map((id) => html`
        <li key=${id}>
          <button
            class="row"
            aria-pressed=${selected === id}
            title=${`Select ${id}`}
            onClick=${() => onSelect(id)}
          >
            <span class="row-icon" title=${kindOf(doc.mission.states[id])}>${stateKindIcon(kindOf(doc.mission.states[id]))}</span>
            <span class="row-name">${id}</span>
            ${roles(doc, id).map((role) => html`<span class="chip" key=${role} data-role=${roleKey(role)}>${role}</span>`)}
          </button>
        </li>
      `)}
    </ul>
  `;
}
