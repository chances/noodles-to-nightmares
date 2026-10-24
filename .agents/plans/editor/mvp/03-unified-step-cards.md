# Unified Step Cards

Part of the [Mission Editor MVP PRD](README.md).

## Goal

A paired 2D and 3D Sanny function shares one card. Each card has its own 2D or 3D switch, styled like the edit and debug switch. Any card with a 2D and 3D pair accepts a spot in either mode.

## Tasks

- [x] Inventory every paired 2D and 3D function in `lib/fsm/descriptors.ts` and list each pair.
- [x] Define one card schema per pair, with fields shared across both modes and mode-specific fields behind the switch.
- [x] Add the per-card 2D or 3D switch to every paired card.
- [x] Store each card's mode in the `.fsm.json` beside its step.
- [x] Keep fields that only the other mode uses in the `.fsm.json`, hidden and not emitted, and restore them when the card switches back.
- [x] Write one rule for mapping Sanny statements to GUI controls, and apply it to every card.
- [x] Keep unknown lines as text boxes, as the current form does.
- [x] Update `ui/templates.js` so each card builds and parses both modes, and extend `templates_test.ts` to cover them.
- [x] Match `handle` fields to mission locals as well as `$name` globals, so steps on `Blip.Remove(payphoneBlip)` get typed controls instead of raw text boxes.
- [x] Remove the move up and move down buttons from script step cards and include rows.
- [x] Prefix each script step card title and include row title with a six-dots drag handle.
- [x] Start a drag on any mouse or pen press from a non-interactive part of the card's `hgroup`. Presses on the `hgroup`'s controls do not start a drag.
- [x] Start a touch drag after a 500 ms press. Movement beyond 8 px before the hold ends cancels the drag, so the page scrolls. A tap elsewhere on the page cancels an armed drag.
- [x] Lift an armed or dragged card with a prominent drop shadow.
- [x] Show an insertion line at the drop point. Clamp vertical drag positions to the list's bounds. Show no drop cue when the horizontal position leaves the list's bounds.
- [x] Keep each drag within its own list, which is a state or block.
- [x] On Escape, or a drop outside the list, return the card to its slot. Animate the return, and snap it back when `prefers-reduced-motion` is set.
- [x] Make each card focusable. Alt+Up and Alt+Down move it one position, wrapping at the ends, and a live region announces "Moved to position N of M".
- [x] Replace the arrow buttons with a copy icon button that copies the step's Sanny. Disable it with a tooltip when the step has no Sanny. Show a green check and "Copied to clipboard" title for 3 seconds.

## Done When

- Each paired function appears as one card, and its mode persists on reopen.
- The `templates_test.ts` round-trip passes for every mode.
- Missions 0 and 1 load without changing their generated Sanny.
- Script step cards and include rows show no move buttons, and dragging from the title `hgroup` reorders them.

## Open Questions

None.

## Status

Built. The three paired functions, `playerNear`, `playerOnFootNear`, and `playerStoppedNear`, are one card each with a 2D and 3D switch. The `lib/fsm` tests and the mission editor tests pass, except the three failures that were already present before this work, and the committed missions 0 and 1 generate the same Sanny. Not yet checked in a browser: the Done When behavior on desktop, touch dragging on a real device, and the Script pane scroll fix, which has not been reproduced in the author's session.

Two points differ from the PRD. The PRD says spot steps stay 3D, and this plan says any pair accepts a spot in either mode; the code follows this plan. Mode-only fields have no current pair, so the hidden-field path is covered by tests only.

## Related

The step storage and descriptor decisions this package extends are in the [Mission Editor section](../../../Memory.md#mission-editor) of `.agents/Memory.md`.
