# Mission Rewards

Part of the [Mission Editor MVP PRD](README.md).

## Goal

Any state can hold an optional Reward section. The author enters a Mission Name Key and a Score Amount, and the generator writes the pass tune, the mission-passed registration, the score, and the pass banner. No author scripts those four lines by hand. A state can reward the player before the mission finishes, as the tutorial's garage state does.

## Behavior

- Reward is one of the optional sections Add Section offers on every state kind. No kind opens it by default, so an ending or a tutorial state shows it only when the author adds it (`SECTIONS` in `ui/sections.js`).
- **Mission Name Key** uses the `name` field type, with the label and default of the Register Passed step (`NooM_0`).
- **Score Amount** uses the `expr` field type with `numeric: "int"`, as Add Score and Pass Banner do. It takes an int literal or an int constant such as `REWARD`.
- A state with no reward generates no pass lines.
- After the story beats, and before the state's finish or route, the generator emits the four steps from `lib/fsm/vocabulary.ts`, then a fixed hold. This holds for any state: a finishing state, or one that routes on, waits on `until`, or branches on `on`.
  1. `Audio.PlayMissionPassedTune(1)`
  2. `register_mission_passed '<key>'`
  3. `Player.AddScore($player, <amount>)`
  4. `Text.PrintWithNumberBig('M_PASS', <amount>, 5000, TextStyle.Middle)`
  5. `wait 5500`, so the banner shows before the mission ends or moves on. This is the hold missions 0 and 1 use today.

## Data

A `reward` field on `State` in `lib/fsm/types.ts`, shaped `{ key: string; amount: string }`. No kind or flag gates it, so the generator needs no finish check for it.

## Tasks

- [ ] Add `reward` to `State` in `lib/fsm/types.ts`, with a comment that it runs after the beats on any state.
- [ ] Add `reward` to the save schema in `lib/fsm/fsm-file.ts`, so autosave keeps it, and cover it in the parse round trip in `fsm-file.test.ts`.
- [ ] Emit the reward lines in `lib/fsm/generate.ts` after the beats and before the finish or route, for every state.
- [ ] Warn in `lib/fsm/problems.ts` when any state's beats still hold a pass tune, register, score, or pass banner line, since the reward would add a second one.
- [ ] Add Reward to `SECTIONS` in `tools/mission-editor/ui/sections.js` (not `KIND_SECTIONS`), remove "Reward" from the "join these" comment above `KIND_SECTIONS`, and add the Mission Name Key and Score Amount fields in `inspector-pane.js`.
- [ ] Cover the emitted lines in `generate.test.ts`, and the section's fields in `templates_test.ts`.
- [ ] Migrate mission 1: move its four pass lines and the beat's 5500 ms wait into its finishing state's Reward. The reward hold replaces that wait, so the timing does not change. Package 10 records the Sanny diff.
- [ ] Migrate mission 0: move the four pass lines and the 5500 ms wait from the garage beat into the garage state's Reward. The hold keeps the pass before `HOME_TUTORIAL`, so the timing does not change. Package 10 records the Sanny diff.

## Done When

- A state with a reward emits the four steps and the hold, in that order, after its beats and before its finish or route.
- A state without a reward emits none of them.
- Missions 0 and 1 pass at the same moments as before the move, and their Sanny diffs are recorded in package 10.
- The problems list flags a hand-scripted pass line in any state.
- The `reward` field survives an autosave round trip.

## Open Questions

- None. Mission 0's pass stays in its garage state, so no state has to finish early.

## Related

- [lib/fsm/vocabulary.ts](../../../../lib/fsm/vocabulary.ts) has the four steps this package emits.
- [lib/fsm/descriptors.ts](../../../../lib/fsm/descriptors.ts) gives their labels and defaults.
- [tools/mission-editor/ui/sections.js](../../../../tools/mission-editor/ui/sections.js) lists the Add Section options and the kinds' default sections.
- [missions/0_tutorial.fsm.json](../../../../missions/0_tutorial.fsm.json) and [missions/1_shady_job.fsm.json](../../../../missions/1_shady_job.fsm.json) are the two missions to migrate.
