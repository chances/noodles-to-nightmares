# Telemetry and Desktop Build

Part of the [Mission Editor MVP PRD](README.md).

## Goal

The debugger shows player position and F8 captures, and `deno task editor:build` produces a desktop binary in `dist/`.

## Telemetry Tasks

- [ ] Resolve defect 3 in [player-telemetry-debug.md](../../../bugs/player-telemetry-debug.md): `START_CUSTOM_THREAD "capture.cs"` fails with File Not Found.
- [ ] Try the untried candidate fixes in the bug file, one at a time, and record the `cleo.log` result of each.
- [ ] Confirm `Loaded script` for `capture` in `cleo.log` after a run.
- [ ] Confirm `dist/telemetry/run-<stamp>.jsonl` has position lines after a run.
- [ ] Make something read `dist/telemetry/run-<stamp>.jsonl` after a run. Nothing does today, and the game-logtail MCP tails only the game's logs.
- [ ] Enable the debugger's Pause / Resume, Step Out, Step Over, and Step In buttons. They stay disabled until the bidirectional UDP control from Phase 5 of [geography-system-and-cleo-plugin.md](../../geography-system-and-cleo-plugin.md) exists.
- [ ] Add an age column to Script Watches, and dim a row once its reading goes stale.

## Desktop Build Tasks

- [ ] Free enough space on drive `C:` for the build, or point the build output at another drive.
- [ ] Fix the output name so Windows gets an `.exe`, not `MissionEditor.dll`.
- [ ] Resolve the `server.ts` imports from `scripts/telemetry.ts` and `scripts/run-events.ts` that `deno desktop` does not build.
- [ ] Run the binary, and confirm it starts, loads a project, and quits when its window closes.

## Done When

- The debugger shows player position after a Run in Game, and the log shows the capture line.
- `deno task editor:build` completes and writes the binary to `dist/`.
- The binary starts and quits with its window.

## Verification Note

Telemetry readings depend on the game state, and the debugger test needs a real game run. Check the outcome in the game, not only in tests.
