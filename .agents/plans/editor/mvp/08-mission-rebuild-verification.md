# Mission Rebuild Verification

Part of the [Mission Editor MVP PRD](README.md), indexed by [00-mission-editor-mvp.md](00-mission-editor-mvp.md). Runs last, after packages 01 to 04.

## Goal

Missions 0 and 1 are rebuilt in the editor, and they compile to the same Sanny output as the current files. Authors make missions with no hand-edited `.fsm.json`.

## Tasks

- [ ] Save the current generated `.txt` for missions 0 and 1 as the baseline, in the scratchpad.
- [ ] Rebuild mission 0 in the editor from its table, with no hand edits to its `.fsm.json`.
- [ ] Rebuild mission 1 the same way, including its declared locals.
- [ ] Diff the new generated `.txt` against the baseline for each mission.
- [ ] Resolve each diff, either by fixing the editor output or by recording why the difference is intended.
- [ ] Create one new mission from each template and confirm it compiles.
- [ ] Play-test mission 1 in the game. It has never been played.
- [ ] Play-test mission 0 in the game, the pilot mission.
- [ ] Compile-check `missions/0_tutorial.txt` with `deno run --allow-all --env-file=.env scripts/check-compile.ts missions/0_tutorial.txt`, and record the output.
- [ ] Record the line count of `missions/1_shady_job.txt` against the 452-line baseline from before the generator change.
- [ ] Confirm the Export dialog shows the generated Sanny, the compile log, and the local count. The v1 open items say it had no UI.

## Done When

- The generated Sanny for missions 0 and 1 matches the baseline, or each difference has a recorded reason.
- Each template produces a mission that compiles through `deno task build`.
- The editor run log shows no hand edit to a `.fsm.json` during the rebuild.

## Related

[lib/fsm/types.ts](../../../../lib/fsm/types.ts) defines the table the rebuild reads.
