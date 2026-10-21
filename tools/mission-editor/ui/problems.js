// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef } from "/vendor/preact.js";

const count = (problems, severity) => problems.filter((p) => p.severity === severity).length;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The header pill: red with errors, yellow with only warnings. Clicking it opens the Problems panel. */
export function ProblemsPill({ problems, open, onToggle }) {
  const errors = count(problems, "error");
  const warnings = count(problems, "warning");
  const level = errors ? "error" : warnings ? "warning" : "ok";
  const text = errors ? plural(errors, "Error") : warnings ? plural(warnings, "Warning") : "No Problems";
  return html`
    <button class="pill" data-level=${level} aria-expanded=${open} aria-controls="problems-panel" onClick=${onToggle}>${text}</button>
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
      if (!root.current.contains(e.target) && !e.target.closest(".pill")) onClose();
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
    <section id="problems-panel" class="problems-panel" aria-label="Problems" ref=${root}>
      <h2>Problems</h2>
      <${ProblemsList} problems=${problems} onSelect=${onSelect} />
    </section>
  `;
}
