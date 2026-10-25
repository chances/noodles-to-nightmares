// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef, useState } from "/vendor/preact.js";
import { missionLabel } from "./mission-label.js";
import { formatStem, nextMissionIndex, slugify } from "./mission-ops.js";
import { Overlay } from "./overlay.js";

function Chevron() {
  return html`<svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>`;
}

function Plus() {
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>`;
}

/* export function nextMissionIndex(missions) {
  const indices = (missions || []).map((m) => {
    const match = m.stem.match(/^(\d+)_/);
    return match ? parseInt(match[1], 10) : -1;
  });
  const max = Math.max(-1, ...indices);
  return max + 1;
}

export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

*/
// @remarks Fallback when `/api/templates` fails. It mirrors `TEMPLATES` in `lib/fsm/templates.ts`, so change both together.
const DEFAULT_TEMPLATES = [
  { id: "empty", name: "Empty Starter", description: "A minimal mission with one start state and one win state." },
  { id: "linear", name: "Linear Story", description: "A three-state progression: wait for instructions, travel to a spot, and finish." },
  { id: "timed_chase", name: "Timed Chase", description: "A timed pursuit with a HUD countdown clock and mission failure on timeout or arrest." },
  { id: "delivery", name: "Delivery", description: "Pick up cargo, navigate to the drop-off spot, and avoid wanted stars." },
];

export function CreateMissionDialog({ missions, project, onClose, onCreated }) {
  const nextIdx = nextMissionIndex(missions);
  const [title, setTitle] = useState("");
  const [stem, setStem] = useState(`${nextIdx}_new_mission`);
  const [stemTouched, setStemTouched] = useState(false);
  const [template, setTemplate] = useState("empty");
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);

  const open = (el) => {
    dialogRef.current = el;
    if (el && !el.open) el.showModal();
  };

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : DEFAULT_TEMPLATES))
      .then(setTemplates, () => setTemplates(DEFAULT_TEMPLATES));
  }, []);

  const onTitleChange = (val) => {
    setTitle(val);
    if (!stemTouched) {
      const slug = slugify(val);
      setStem(slug ? `${nextIdx}_${slug}` : `${nextIdx}_new_mission`);
    }
  };

  const onStemChange = (val) => {
    setStemTouched(true);
    setStem(formatStem(val));
  };

  const submit = async (e) => {
    e.preventDefault();
    const cleanStem = stem.trim();
    if (!cleanStem) {
      setError("Mission stem cannot be empty.");
      return;
    }
    if ((missions || []).some((m) => m.stem === cleanStem)) {
      setError(`Mission "${cleanStem}" already exists.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/missions?project=${encodeURIComponent(project)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stem: cleanStem, template, title: title.trim() || cleanStem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      dialogRef.current?.close();
      onCreated(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return html`
    <dialog ref=${open} onClose=${onClose}>
      <h2 style="margin:0">Create New Mission</h2>
      <form class="form" onSubmit=${submit}>
        <div class="form-row">
          <label class="mini">
            <span>Mission Title</span>
            <input
              value=${title}
              placeholder="e.g. Shady Deal"
              autofocus
              maxlength="64"
              onInput=${(e) => onTitleChange(e.currentTarget.value)}
            />
          </label>
          <label class="mini">
            <span>File Stem</span>
            <input
              value=${stem}
              placeholder=${`e.g. ${nextIdx}_shady_deal`}
              maxlength="64"
              onInput=${(e) => onStemChange(e.currentTarget.value)}
            />
          </label>
        </div>
        <section class="stack" style="gap:8px" role="radiogroup" aria-labelledby="template-label">
          <h3 id="template-label" style="margin:0;font-size:13px;font-weight:600;color:var(--text)">Starter Template</h3>
          <div class="template-grid">
            ${templates.map((t) => html`
              <label class="template-card ${template === t.id ? 'selected' : ''}" key=${t.id} title=${t.description}>
                <input
                  type="radio"
                  name="template"
                  value=${t.id}
                  checked=${template === t.id}
                  class="sr-only"
                  onChange=${() => setTemplate(t.id)}
                />
                <div class="template-card-header">
                  <span class="template-card-name">${t.name}</span>
                  <span class="template-card-indicator" aria-hidden="true"></span>
                </div>
                <span class="template-card-desc">${t.description}</span>
              </label>
            `)}
          </div>
        </section>
        ${error && html`<p class="error" role="alert" style="margin:0">${error}</p>`}
        <div class="actions">
          <button type="button" onClick=${() => dialogRef.current?.close()}>Cancel</button>
          <button class="primary" disabled=${busy}>Create Mission</button>
        </div>
      </form>
    </dialog>
  `;
}

export function MissionMenu({ stem, missions, onSelect, project, onCreated }) {
  if (!missions || missions.length === 0) return null;
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const root = useRef(null);
  const menu = useRef(null);
  const items = () => [...(menu.current?.querySelectorAll("[role=menuitem]") ?? [])];

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!root.current.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      root.current.querySelector("button.crumb")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  const arrows = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const all = items();
    all[(all.indexOf(document.activeElement) + step + all.length) % all.length]?.focus();
  };

  const choose = (m) => {
    setOpen(false);
    if (m.stem !== stem) onSelect(m.stem);
  };

  return html`
    <div class="menu-anchor" ref=${root}>
      <button
        class="crumb"
        aria-haspopup="menu"
        aria-expanded=${open}
        title=${stem ? `Mission: ${stem}` : "Select Mission"}
        onClick=${() => setOpen(!open)}
      >
        <span class="crumb-name">${stem ? missionLabel(stem) : "No Mission"}</span>
        <${Chevron} />
      </button>
      ${open && html`
        <${Overlay} hostRef=${menu}>
        <div class="menu" role="menu" aria-label="Missions" onKeyDown=${arrows}>
          ${(missions || []).map((m) => html`
            <button
              key=${m.stem}
              role="menuitem"
              class="row menu-item"
              aria-current=${m.stem === stem}
              title=${m.stem}
              onClick=${() => choose(m)}
            >
              <span class="row-name">${missionLabel(m.stem)}</span>
              <span class="chip">${m.source || "mission"}</span>
            </button>
          `)}
          <hr />
          <button
            role="menuitem"
            class="row menu-item"
            onClick=${() => {
              setOpen(false);
              setCreating(true);
            }}
          >
            <${Plus} />
            <span class="row-name">Add Mission...</span>
          </button>
        </div>
        <//>
      `}
      ${creating && html`
        <${CreateMissionDialog}
          missions=${missions}
          project=${project}
          onClose=${() => setCreating(false)}
          onCreated=${(created) => {
            setCreating(false);
            if (onCreated) onCreated(created);
          }}
        />
      `}
    </div>
  `;
}
