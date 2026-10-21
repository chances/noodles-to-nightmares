// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, render, useEffect, useState } from "/vendor/preact.js";
import { CreateDialog, editorUrl, GAME_LABELS, openProject } from "./projects.js";
import { Status } from "./status.js";

const UNITS = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];

function ago(iso) {
  if (!iso) return "";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const [unit, size] = UNITS.find(([, size]) => Math.abs(seconds) >= size) ?? ["minute", 60];
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

function ProjectList({ heading, projects, onOpen }) {
  if (!projects.length) return null;
  return html`
    <section class="project-section">
      <h2>${heading}</h2>
      <ul class="project-list">
        ${projects.map((project) => html`
          <li key=${project.path}>
            <button class="row project" title=${project.path} onClick=${() => onOpen(project)}>
              <span class="project-text">
                <span class="row-name">${project.name}</span>
                <span class="hint project-path">${project.path}</span>
              </span>
              <span class="chip">${GAME_LABELS[project.game]}</span>
              ${project.lastOpened && html`<span class="hint project-time">${ago(project.lastOpened)}</span>`}
            </button>
          </li>
        `)}
      </ul>
    </section>
  `;
}

function Welcome() {
  const [projects, setProjects] = useState({ loading: true });
  const [creating, setCreating] = useState(false);
  const [openError, setOpenError] = useState("");

  useEffect(() => {
    fetch("/api/projects").then((res) => res.json()).then(
      (data) => setProjects({ data }),
      (error) => setProjects({ error: error.message }),
    );
  }, []);

  const open = async (project) => {
    setOpenError("");
    try {
      await openProject(project);
    } catch (err) {
      setOpenError(err.message);
    }
  };

  const { data } = projects;
  const empty = data && !data.recent.length && !data.found.length;
  return html`
    <main class="welcome">
      <header class="hero">
        <h1>Welcome to Mission Editor</h1>
        <p class="hint">Design missions for GTA III and Vice City.</p>
        <button class="primary" disabled=${!data} onClick=${() => setCreating(true)}>Create New Project</button>
      </header>
      ${openError && html`<p class="error" role="alert">${openError}</p>`}
      ${projects.loading && html`<${Status} loading heading="Loading Projects">Looking for your recent projects.<//>`}
      ${projects.error && html`<${Status} heading="Projects Failed to Load">${projects.error}<//>`}
      ${empty && html`<${Status} heading="No Projects Yet">Create a project to start designing missions.<//>`}
      ${data && html`
        <${ProjectList} heading="Recent Projects" projects=${data.recent} onOpen=${open} />
        <${ProjectList} heading="Projects" projects=${data.found} onOpen=${open} />
      `}
      ${creating && html`
        <${CreateDialog}
          defaultLocations=${data.defaultLocations}
          onClose=${() => setCreating(false)}
          onCreated=${(project) => location.assign(editorUrl(project))}
        />
      `}
    </main>
  `;
}

render(html`<${Welcome} />`, document.getElementById("welcome"));
