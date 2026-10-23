# Add Mission and Templates

Part of the [Mission Editor MVP PRD](README.md), indexed by [00-mission-editor-mvp.md](00-mission-editor-mvp.md).

## Goal

An author creates a new mission from the mission select, starting from an empty table or one of three templates.

## Tasks

- [ ] Add an Add Mission item to the mission select, placed like the projects dropdown.
- [ ] Pick the next free mission index and stem, and reject a stem that already exists.
- [ ] Create an empty starter `missions/<stem>.fsm.json` with one start state and one finishing state.
- [ ] Write the Linear Story template: wait, go, finish, with no fail states.
- [ ] Write the Timed Chase template: adds a time limit and a busted fail.
- [ ] Write the Delivery template: pick up, drive to a spot, drop off, with a wanted fail.
- [ ] Offer the templates in a picker before creation, and keep the empty starter as the default.
- [ ] Validate each template with `lib/fsm/problems.ts` so none ships with a problem.

## Done When

- A new mission opens in the editor with its starter content and passes validation.
- Each template compiles through `deno task build` and the generator test passes.
- Tests cover stem conflicts and each template's table.

## Related

[lib/fsm/types.ts](../../../../lib/fsm/types.ts) defines the table shape each template must follow.
