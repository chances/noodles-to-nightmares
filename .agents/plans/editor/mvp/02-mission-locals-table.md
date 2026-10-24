# Mission Locals Table

Part of the [Mission Editor MVP PRD](README.md).

## Goal

The mission form shows a read-only table of each declared local and every place that uses it. Static analysis fills the table, and each usage links to where it appears.

## Tasks

- [ ] Read the declared locals from the `.fsm.json` `locals` field.
- [ ] Walk every state, beat, condition, and step, and collect each reference to a declared local.
- [ ] Record each usage with its state name, beat or step index, and a stable anchor.
- [ ] Render the table on the mission form, styled like the constants table.
- [ ] Make each usage a link that selects the state or beat and scrolls it into view.
- [ ] Recompute the table on every autosave.
- [ ] Mark a declared local with no usages, and a usage with no declaration.

## Done When

- Mission 1's declared locals list every use, and each link lands on the right state or beat.
- A local with no usages shows a warning in the table.
- Tests cover the static analysis on a fixture with three locals across two states.

## Related

The editor has no form for `mission.locals` today; mission 1 declares them in its `.fsm.json`. `handle` matching for mission locals is tracked in [03](03-unified-step-cards.md).
