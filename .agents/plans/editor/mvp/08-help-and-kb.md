# Help and KB

Part of the [Mission Editor MVP PRD](README.md). Runs after packages 01 to 06 finish, so it documents the finished authoring features.

## Goal

A circled "?" info icon sits on each card and vocabulary entry. Hover shows a summary, and click opens `help.html` in a non-modal dialog. The author also finds a setup guide and a vocabulary reference.

## Tasks

- [ ] Build a reusable tooltip and info-icon component with the help cursor.
- [ ] Give the component a hover summary and a click target that opens the dialog.
- [ ] Build the non-modal dialog, with an `iframe` that loads `help.html` at an anchor.
- [ ] Generate `help.html` vocabulary entries from `lib/fsm/descriptors.ts`.
- [ ] Write the setup guide: install, point the editor at the GTA III folder and `.env`, and run it.
- [ ] Generate the vocabulary reference page from the same descriptors.
- [ ] Add a test that every descriptor has a summary and an anchor in `help.html`.

## Done When

- Every card and vocabulary entry shows the info icon, and click opens its anchor.
- The dialog is non-modal and closes without losing the mission state.
- The descriptor test fails when a summary is missing.

## Docs Notes

- Start Time Limit Clock only resets TIMERB to 0 (`TIMERB = 0`). It sets no limit, so the entry must say so.
- The limit is the Time limit exceeded condition (`TIMERB > {minutes}000`), which defaults to 120 game minutes (`TIMERB > 120000`). A game minute is 1000 ms.

## Related

Overlay rules for menus and panels are in the project memory, and the dialog must go through the same overlay host.
