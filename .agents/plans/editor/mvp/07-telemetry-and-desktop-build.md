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

## Class Refactor Tasks

Source: [factory-function-audit.md](../../../reports/factory-function-audit.md). Work in the audit's order, and run `deno task test` and `deno task --cwd tools/mission-editor test` after each step.

- [ ] Add tests that pin the current behavior of `startCapture` and `listenTelemetry` before changing them: packets are logged, the summary counts them, a taken port returns `null`, and `close` releases the port.
- [ ] Convert `startCapture` in `scripts/telemetry.ts` into a `CaptureSession` class with `static async start(port, logPath, onEvent)` and a `stop()` method. Keep the summary, the position throttle, and the log file as private fields.
- [ ] Convert `listenTelemetry` into a `TelemetryListener` class with `static async listen(port, onPacket)` and a `close()` method. `CaptureSession.start` uses it.
- [ ] Update every caller of `startCapture` and `listenTelemetry` that `grep` finds, including the desktop-build import list above.
- [ ] Ask the user whether `createApp` in `tools/mission-editor/server.ts` becomes a `MissionEditor` class. The class would take `spawnRun`, `stopRun`, `runBuild`, and `telemetryPort` as constructor options and expose `fetch`, which keeps the Hono idiom and the test seams.
- [ ] If the user agrees, fold `createHandler` into that class, then update `export const handler` and the `server_test.ts` imports.

## Done When

- The debugger shows player position after a Run in Game, and the log shows the capture line.
- `deno task editor:build` completes and writes the binary to `dist/`.
- The binary starts and quits with its window.

## Verification Note

Telemetry readings depend on the game state, and the debugger test needs a real game run. Check the outcome in the game, not only in tests.
