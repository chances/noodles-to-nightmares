// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html } from "/vendor/preact.js";

/** Fills a pane with a loading, empty, or error message: a heading and one muted line. */
export function Status({ loading = false, heading, children }) {
  return html`
    <div class="status" role=${loading ? "status" : "note"}>
      ${loading && html`<span class="spinner" aria-hidden="true"></span>`}
      <h3>${heading}</h3>
      <p class="hint">${children}</p>
    </div>
  `;
}
