// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

// What the welcome page and the editor's project menu share: opening a project and the Create New Project dialog.

import { html, useState } from "/vendor/preact.js";

export const GAME_LABELS = { gta3: "GTA III", vc: "GTA Vice City" };

export const editorUrl = (project) => `/app.html?project=${encodeURIComponent(project.path)}`;

export async function send(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

/** Remembers `project` as the latest opened, then shows it in the editor. */
export async function openProject(project) {
  location.assign(editorUrl(await send("/api/projects/open", { path: project.path, game: project.game })));
}

export function CreateDialog({ defaultLocations, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [game, setGame] = useState("gta3");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const open = (el) => { if (el && !el.open) el.showModal(); };

  // Until the user types a location, it follows the chosen game's Projects folder.
  const parent = location ?? defaultLocations[game];
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onCreated(await send("/api/projects", { name, game, parent }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return html`
    <dialog ref=${open} onClose=${onClose}>
      <h2>Create New Project</h2>
      <form class="form" onSubmit=${submit}>
        <label class="stack">
          <span>Name</span>
          <input value=${name} required autofocus maxlength="64" onInput=${(e) => setName(e.currentTarget.value)} />
        </label>
        <section class="stack" role="radiogroup" aria-labelledby="game-label">
          <h3 id="game-label">Game</h3>
          <div class="choices">
            ${Object.entries(GAME_LABELS).map(([id, label]) => html`
              <label class="choice" key=${id}>
                <input type="radio" name="game" value=${id} checked=${game === id} onChange=${() => setGame(id)} />
                <span>${label}</span>
              </label>
            `)}
          </div>
        </section>
        <label class="stack">
          <span>Location <span class="hint">(the folder that will hold the project)</span></span>
          <input value=${parent} required onInput=${(e) => setLocation(e.currentTarget.value)} />
        </label>
        ${error && html`<p class="error" role="alert">${error}</p>`}
        <div class="actions">
          <button type="button" onClick=${(e) => e.currentTarget.closest("dialog").close()}>Cancel</button>
          <button class="primary" disabled=${busy}>Create Project</button>
        </div>
      </form>
    </dialog>
  `;
}
