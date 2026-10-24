# Unified Step Cards

Part of the [Mission Editor MVP PRD](README.md).

## Goal

A paired 2D and 3D Sanny function shares one card. Each card has its own 2D or 3D switch, styled like the edit and debug switch. Spot-based steps stay 3D only.

## Tasks

- [ ] Inventory every paired 2D and 3D function in `lib/fsm/descriptors.ts` and list each pair.
- [ ] Define one card schema per pair, with fields shared across both modes and mode-specific fields behind the switch.
- [ ] Add the per-card 2D or 3D switch, with spot-based cards locked to 3D.
- [ ] Store each card's mode in the `.fsm.json` beside its step.
- [ ] Write one rule for mapping Sanny statements to GUI controls, and apply it to every card.
- [ ] Keep unknown lines as text boxes, as the current form does.
- [ ] Update `ui/templates.js` so each card builds and parses both modes, and extend `templates_test.ts` to cover them.
- [ ] Match `handle` fields to mission locals as well as `$name` globals, so steps on `Blip.Remove(payphoneBlip)` get typed controls instead of raw text boxes.

## Done When

- Each paired function appears as one card, and its mode persists on reopen.
- The `templates_test.ts` round-trip passes for every mode.
- Missions 0 and 1 load without changing their generated Sanny.

## Open Questions

- Whether a mode change should clear fields that exist only in the other mode, or keep them hidden.

## Related

The step storage and descriptor decisions this package extends are in the [Mission Editor section](../../../Memory.md#mission-editor) of `.agents/Memory.md`.
