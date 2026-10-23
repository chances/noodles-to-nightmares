// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useRef, useState } from "/vendor/preact.js";
import { Overlay } from "./overlay.js";

function Chevron() {
  return html`<svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>`;
}

/**
 * A button with a menu beside it. The main button runs `onMain`; the chevron opens `groups`
 * (`[{ heading, items: [{ value, label }] }]`) and `onPick(value)` runs for the chosen item.
 */
export function SplitButton({ label, title, ariaLabel, onMain, menuTitle, menuAriaLabel, groups, onPick }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const menu = useRef(null);
  const items = () => [...(menu.current?.querySelectorAll("[role=menuitem]") ?? [])];

  useEffect(() => {
    if (!open) return;
    const outside = (e) => { if (!root.current.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false); };
    const escape = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      root.current.querySelector(".split-toggle").focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    items()[0]?.focus();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const arrows = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const all = items();
    all[(all.indexOf(document.activeElement) + step + all.length) % all.length]?.focus();
  };

  return html`
    <div class="split menu-anchor" ref=${root}>
      <button class="split-main" title=${title} aria-label=${ariaLabel} onClick=${onMain}>${label}</button>
      <button class="split-toggle" title=${menuTitle} aria-label=${menuAriaLabel} aria-haspopup="menu" aria-expanded=${open} onClick=${() => setOpen(!open)}><${Chevron} /></button>
      ${open && html`
        <${Overlay} hostRef=${menu}>
        <div class="menu split-menu" role="menu" aria-label=${menuAriaLabel} onKeyDown=${arrows}>
          ${groups.map((group, i) => html`
            <div role="group" aria-label=${group.heading} class="menu-section" key=${group.heading}>
              ${i > 0 && html`<hr />`}
              <h3 class="menu-heading">${group.heading}</h3>
              ${group.items.map((item) => html`
                <button key=${item.value} role="menuitem" class="row menu-item" onClick=${() => { setOpen(false); onPick(item.value); }}>
                  <span class="row-name">${item.label}</span>
                </button>`)}
            </div>`)}
        </div>
        <//>`}
    </div>
  `;
}
