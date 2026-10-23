// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef } from "/vendor/preact.js";
import { Overlay } from "./overlay.js";

const count = (problems, severity) => problems.filter((p) => p.severity === severity).length;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A check for no problems, a cross for errors, and an exclamation in a diamond for warnings only. */
function PillIcon({ level }) {
  if (level === "error") return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>`;
  if (level === "warning") return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5l9.5 9.5-9.5 9.5L2.5 12Z" /><path d="M12 8v5M12 16.5h.01" /></svg>`;
  return html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>`;
}

/** The header pill: a red cross with errors, a yellow warning with only warnings, a green check with neither. Clicking it opens the Problems panel. */
export function ProblemsPill({ problems, open, onToggle }) {
  const errors = count(problems, "error");
  const warnings = count(problems, "warning");
  const level = errors ? "error" : warnings ? "warning" : "ok";
  const text = errors ? plural(errors, "Error") : warnings ? plural(warnings, "Warning") : "No Problems";
  return html`
    <button class="pill" data-level=${level} aria-expanded=${open} aria-controls="problems-panel" onClick=${onToggle}><${PillIcon} level=${level} />${text}</button>
  `;
}

/** Every problem, errors first. Selecting a problem selects its state. */
export function ProblemsList({ problems, onSelect }) {
  if (!problems.length) return html`<p class="hint">Nothing to fix.</p>`;
  return html`
    <ul class="problems">
      ${problems.map((p, i) => html`
        <li key=${i} data-level=${p.severity}>
          <span class="chip" data-level=${p.severity}>${p.severity === "error" ? "Error" : "Warning"}</span>
          <span>${p.message}</span>
          ${p.state && html`<button class="link" onClick=${() => onSelect(p.state)}>Go To ${p.state}</button>`}
        </li>`)}
    </ul>
  `;
}

/** An overlay under the header pill. It closes on Escape or a click outside. */
export function ProblemsPanel({ problems, onSelect, onClose }) {
  const root = useRef(null);
  useEffect(() => {
    const outside = (e) => {
      if (!root.current?.contains(e.target) && !e.target.closest(".pill")) onClose();
    };
    const escape = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return html`
    <${Overlay} align="end">
      <section id="problems-panel" class="problems-panel" aria-label="Problems" ref=${root}>
        <h2>Problems</h2>
        <${ProblemsList} problems=${problems} onSelect=${onSelect} />
      </section>
    <//>
  `;
}
