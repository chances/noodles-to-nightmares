// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef, useState } from "/vendor/preact.js";
import { TutorialIcon } from "./icons.js";
import { CreateMissionDialog } from "./mission-menu.js";
import { missionLabel } from "./mission-label.js";
import { welcomeState } from "./mission-ops.js";
import { Overlay } from "./overlay.js";

function Plus() {
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>`;
}

export function KbOverlay({ onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const escape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  return html`
    <${Overlay} hostRef=${panelRef}>
      <div class="menu kb-panel" role="dialog" aria-label="Mission Guide" style="padding:16px;max-inline-size:480px">
        <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="margin:0;font-size:16px;display:flex;align-items:center;gap:8px">
            <${TutorialIcon} /> Mission Guide
          </h2>
          <button class="icon" onClick=${onClose} aria-label="Close Guide">✕</button>
        </header>
        <section class="stack" style="gap:10px;font-size:13px;line-height:1.4">
          <p>
            Missions are structured as <strong>finite state machines</strong>. Each state contains story beats (sequential actions and dialogues) and transitions.
          </p>
          <h3 style="margin:8px 0 4px;font-size:14px">Core Concepts</h3>
          <ul style="margin:0;padding-inline-start:20px">
            <li><strong>Beats:</strong> Run scripted actions and wait times before advancing.</li>
            <li><strong>Until:</strong> Conditions that must hold before following <em>Next</em> to the next state.</li>
            <li><strong>Fail:</strong> Mission-level fail rules (e.g. player death, arrest, wanted level).</li>
            <li><strong>Rewards:</strong> Passed tunes, banners, and score increments on mission completion.</li>
          </ul>
        </section>
        <div class="actions" style="margin-top:16px;display:flex;justify-content:flex-end">
          <button class="primary" onClick=${onClose}>Close</button>
        </div>
      </div>
    <//>
  `;
}

export function WelcomePane({ missions, project, onSelect, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [guide, setGuide] = useState(false);
  const { hasMissions, heading } = welcomeState(missions);

  return html`
    <div class="first-launch-welcome" style="padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:240px;gap:16px">
      <div class="hero">
        <h2 style="font-size:18px;margin-bottom:6px">
          ${heading}
        </h2>
        <p class="hint" style="font-size:13px;max-inline-size:42ch">
          ${hasMissions
            ? "Choose an existing mission from this project, or start a new one from a template."
            : "No missions found in this project. Create your first mission from a template or explore the guide."}
        </p>
      </div>

      <div class="button-group" style="display:flex;gap:8px;margin:8px 0">
        <button class="primary" onClick=${() => setCreating(true)}>
          <${Plus} /> Create a Mission
        </button>
        <button onClick=${() => setGuide(true)}>
          <${TutorialIcon} /> Read the Mission Guide
        </button>
      </div>

      ${hasMissions && html`
        <div class="picker-section" style="width:100%;max-width:320px;margin-top:12px;text-align:left">
          <h3 style="font-size:12px;color:var(--muted);margin-bottom:6px" aria-label="Missions in this project">Missions</h3>
          <div class="mission-picker-list" style="display:flex;flex-direction:column;gap:4px">
            ${missions.map((m) => html`
              <button
                key=${m.stem}
                class="row menu-item"
                style="justify-content:space-between;padding:6px 10px;background:var(--panel)"
                onClick=${() => onSelect && onSelect(m.stem)}
              >
                <span>${missionLabel(m.stem)}</span>
                <span class="chip">${m.source || "mission"}</span>
              </button>
            `)}
          </div>
        </div>
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

      ${guide && html`<${KbOverlay} onClose=${() => setGuide(false)} />`}
    </div>
  `;
}
