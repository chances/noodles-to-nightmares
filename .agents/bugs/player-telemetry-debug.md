---
state: open
---
# Player Telemetry Is Absent From The Editor's Debugger

**Status**: Open. The editor, the run relay, and the plugin are cleared; `capture.cs`, the script that sends the position, is never started by the game.

## Symptom
During Run in Game the debugger pane shows no Player position, no heading, and no F8 captures. `dist/telemetry/run-<stamp>.jsonl` has 0 lines for every run, and the game process holds no UDP socket (`netstat -ano -p UDP` lists none for `gta3-game.exe`), so no `0B30` or `0B31` call ever reached `sendto`.

## Root Cause
Three defects on the position path, the last still open:

| # | Defect | State |
| :--- | :--- | :--- |
| 1 | [`cleo/capture.txt`](../../cleo/capture.txt) did not `{$INCLUDE ../variables.txt}`, so Sanny gave it its own first-use slots: `$player` compiled to `0x4364` (4313) while main pins it at `0x44C8` (4402). It read a different cell than main, so `$player > 0` never passed. | Fixed |
| 2 | Nothing started `capture.cs`. `cleo.log` listed the `.cm` it was asked for and never `capture`; CLEO's boot scan did not load the modloader copy of a `.cs`. | `main.txt` now runs `0600: START_CUSTOM_THREAD "capture.cs"` |
| 3 | That call fails: `cleo.log` reads `Error(script loading): cleo\capture.cs, "File Not Found"` then `START_CUSTOM_THREAD: Script loading failed, "main"`, though `modloader.log` shows `Installing file "modloader\noodles\cleo\capture.cs"` and the file is at `modloader/Noodles/cleo/capture.cs`. The same redirect finds `1_shady_job.cm`. | **Open** |

## Evidence
- `cleo.log` and `cleo_redux.log` are in the game folder; `cleo.log` is written at game exit.
- Two CLEO runtimes load: `III.CLEO.asi` (v2.1.1, runs the scripts) and `cleo_redux.asi` (reports "Found another instance of CLEO. Compiled scripts support is delegated.").
- `sockets.cleo` is installed in both `CLEO/` and `CLEO/CLEO_PLUGINS/`, so it loads twice and logs `Opcode 0B30 was already registered` and the same for `0B31`. The first registration stands, so the opcodes work.
- The compiled `capture.cs` operands match `variables.txt` after fix 1 (`02 c8 44` is `$player` at 4402).

## Ruled Out
| Candidate | Evidence |
| :--- | :--- |
| Editor or SSE relay drops packets | `run-integration_test.ts` drives a real child process, real UDP, and the SSE stream: POS and DBG packets arrive as `telemetry` and `debug` events, and the editor takes the port back after a run |
| `run.ts` fails to capture | `startCapture` binds `127.0.0.1:8089` during the run (`netstat` shows `run.ts` as owner) and logs packets in `telemetry.test.ts` |
| `sockets.cleo` not loaded | `Loaded plugin sockets.cleo` in `cleo.log`; the module is in the game process |
| `0B30` or `0B31` broken | Plugin source unchanged for `0B30`; the opcode registers; the duplicate-registration warning is harmless |
| Port 8089 held by another process | The run's `scripts/run.ts` is the only owner during a run |
| Debug readings hidden by the same fault | `debugLogInt` calls are gated on game state (`utils/cars.txt` logs only while `$myCar > 0`), so no reading is expected before then |

## Candidate Fixes (Untried)
- Ship a loose copy to `[gta3]/CLEO/capture.cs` so CLEO's boot scan loads it, as the install did before the loose-script cleanup. `scripts/install.ts` lints loose copies that shadow packaged files, so this needs an exception.
- Compile it as `capture.cm` with a `{$CLEO .cm}` header and start it as the missions are started, since the modloader redirect finds `.cm` files.

## Prevention
`scripts/lint-scripts.ts` now fails the build when a `cleo/*.txt` script uses a pinned global without including its pin file, or when `main.txt` never runs `START_CUSTOM_THREAD` for it. Neither rule can see whether the game finds the file; check `cleo.log` for `Loaded script` or `Error(script loading)` after a run.

## Related Fixes On The Same Path
These stopped the editor from showing the game's state and are done, each with a test in `tools/mission-editor/`:
- The header chip went Offline between readings; the server now reports the game connected from the run's `launch` event until it exits.
- A new run kept the last run's readings; the server now resets state and sends a fresh `status` when a run starts.
- Run output carried ANSI codes into the log; the server strips them before streaming.
- Stop could not end the game because the editor's `--allow-run` list lacked `powershell` and `pkill`.
