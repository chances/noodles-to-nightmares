// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef, useState } from "/vendor/preact.js";
import { Overlay } from "./overlay.js";
import { CreateDialog, editorUrl, GAME_LABELS, openProject } from "./projects.js";

function Chevron() {
  return html`<svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>`;
}

function Plus() {
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>`;
}

function Section({ id, heading, projects, current, onChoose }) {
  if (!projects.length) return null;
  return html`
    <div role="group" aria-labelledby=${id} class="menu-section">
      <h3 id=${id} class="menu-heading">${heading}</h3>
      ${projects.map((project) => html`
        <button
          key=${project.path}
          role="menuitem"
          class="row menu-item"
          aria-current=${project.path === current}
          title=${project.path}
          onClick=${() => onChoose(project)}
        >
          <span class="row-name">${project.name}</span>
          <span class="chip">${GAME_LABELS[project.game]}</span>
        </button>
      `)}
    </div>
  `;
}

/** The breadcrumb `Mission Editor / <project>`: the project name opens a menu of projects and New Project. */
export function ProjectMenu({ name, path }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const root = useRef(null);
  const menu = useRef(null);
  const items = () => [...(menu.current?.querySelectorAll("[role=menuitem]") ?? [])];

  // The list is fetched on every open, so a project opened a moment ago is already at the top of Recent.
  useEffect(() => {
    if (!open) return;
    setError("");
    fetch("/api/projects").then((res) => res.json()).then(setProjects, (e) => setError(e.message));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (e) => { if (!root.current.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false); };
    const escape = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      root.current.querySelector(".crumb").focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Focus the first item once the list has arrived.
  useEffect(() => { if (open && projects) items()[0]?.focus(); }, [open, !!projects]);

  const arrows = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const all = items();
    all[(all.indexOf(document.activeElement) + step + all.length) % all.length]?.focus();
  };

  const choose = async (project) => {
    setOpen(false);
    if (project.path === path) return;
    try {
      await openProject(project);
    } catch (e) {
      setError(e.message);
      setOpen(true);
    }
  };

  return html`
    <nav class="breadcrumb" aria-label="Breadcrumb" ref=${root}>
      <h1 class="brand"><a href="/">Mission Editor</a></h1>
      <span class="separator" aria-hidden="true">/</span>
      <div class="menu-anchor">
        <button class="crumb" aria-haspopup="menu" aria-expanded=${open} title=${path} onClick=${() => setOpen(!open)}>
          <span class="crumb-name">${name}</span>
          <${Chevron} />
        </button>
        ${open && html`
          <${Overlay} hostRef=${menu}>
          <div class="menu" role="menu" aria-label="Projects" onKeyDown=${arrows}>
            ${!projects && !error && html`<p class="hint menu-note">Loading projects.</p>`}
            ${error && html`<p class="error menu-note" role="alert">${error}</p>`}
            ${projects && html`
              <${Section} id="menu-recent" heading="Recent Projects" projects=${projects.recent} current=${path} onChoose=${choose} />
              <${Section} id="menu-projects" heading="Projects" projects=${projects.found} current=${path} onChoose=${choose} />
              <hr />
              <button role="menuitem" class="row menu-item" onClick=${() => { setOpen(false); setCreating(true); }}>
                <${Plus} />
                <span class="row-name">New Project</span>
              </button>
            `}
          </div>
          <//>
        `}
      </div>
      ${creating && projects && html`
        <${CreateDialog}
          defaultLocations=${projects.defaultLocations}
          onClose=${() => setCreating(false)}
          onCreated=${(project) => location.assign(editorUrl(project))}
        />
      `}
    </nav>
  `;
}
