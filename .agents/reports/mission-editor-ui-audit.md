# Mission Editor UI Audit

Scope: `tools/mission-editor` served at `http://localhost:8000/app.html`, project `Noodles to Nightmares`, mission `1_shady_job`, Edit mode. Observed in the built-in browser pane at desktop width (1099 px viewport), with a 375 px emulation for the target measurement. Phone layouts are out of scope, since supported devices are desktops and tablets. No product code was changed.

## Findings

### 1. Page logs a render error on load in `AssetsFilterButton`

- **Evidence:** The console logs `Uncaught (in promise) TypeError: u.push is not a function`, with the top frame at `vendor/preact.js` and the callers at `assets-pane.js:167` inside `AssetsFilterButton`, on every load. In the first session, clicking "Choose Filters" left `aria-expanded` at `false` with no `.filter-popover` in the DOM. After a reload, the same click set `aria-expanded` to `true` and rendered the popover with 19 chips, so the user's report that the filters toggle is consistent with the reload result. The first-session failure was not reproduced after the reload.
- **Impact:** The error is still logged on every load, even though the popover opens after a reload.
- **Smallest correction:** Find the line that calls `.push` on a non-array inside the `AssetsFilterButton` render path, starting at `assets-pane.js:167` and the `KNOWN_DISTRICTS.map` at `assets-pane.js:178`. The stack points at the minified htm call site, so confirm by reading the served file, not by guessing. Unverified: the cause has not been isolated.

### 2. Small targets in the Inspector

- **Evidence:** At 768 px (tablet preset), these controls measure 21 px tall: "Edit As Sanny", "Move condition 1 up/down" (24 px wide), "Remove condition 1/2/3", "Remove REWARD", "Move include 1/2 up/down", and "Remove include 1/2". The same controls measure 21 px at 375 px, but the tablet result is the one in scope.
- **Impact:** Below the 24 px minimum target size in WCAG 2.2 AA (2.5.8).
- **Smallest correction:** Set `min-block-size: 24px` on these inline buttons, and check that the Inspector rows keep their layout afterward.

## Not Observed

- Keyboard focus order and contrast were not audited.
- The Debug mode, the Run flow, and the Spots typeahead were not exercised.
