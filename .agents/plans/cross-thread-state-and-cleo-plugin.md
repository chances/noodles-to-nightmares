# Cross-Thread State and CLEO State Plugin

Future phases after the per-mission finite state machine in [lib/fsm](../../lib/fsm). Nothing here starts until mission 0 runs on it.

## Findings

| Source | Fact | Use Here |
| --- | --- | --- |
| [CLEO SDK](https://cleo.li/sdk.html) | `CLEO_RegisterOpcode`, `CLEO_GetIntOpcodeParam`, `CLEO_SetIntOpcodeParam`, `CLEO_GetScriptByName`, `CLEO_CreateCustomScript` (the page describes the San Andreas SDK) | A plugin can own a store that every thread reads through opcodes |
| [III.VC.CLEO SDK folder](https://github.com/cleolibrary/III.VC.CLEO/tree/master/source/CLEO_SDK) | Holds `III.CLEO.h`, `III.CLEO.lib`, `opcodes.txt`, `demo_plugins` | The GTA III plugin SDK exists; its exact API must be read from `III.CLEO.h` |
| [CLEO Redux C++ SDK](https://re.cleo.li/docs/en/cpp-sdk.html) | Plugins register commands by name; Sanny Builder Library JSON defines the interface | Alternative host if the project moves to CLEO Redux |

## Decisions

| Topic | Decision |
| --- | --- |
| Goal | State ownership (one writer per variable), event ordering between threads, and readable top-to-bottom mission flow |
| Purity | Lint-enforced: `scripts/lint-scripts.ts` fails a `function` that writes a `$global` |
| async/await | Deferred; CLEO threads are cooperative and single-threaded, so it waits for a background-job need |
| Channel semantics | Two kinds: latest-value cells for state (`$skipCutscene`, `$VanBlip`, `$myCar`), buffered queues for events (mission outcome, mission started) |
| Ownership | One declared owner per shared global in `variables.txt`; the lint fails any other script that writes it |

## Layers

| Layer | Needs Plugin | Scope |
| --- | --- | --- |
| 2. Shared mailbox | No | Event flags and a mission-to-main outcome in pinned globals in `variables.txt` (`$missionOutcome`, `$eventFlags`) |
| 3. State plugin | Yes | Named integer channels, per-thread state with entry time, a pushdown stack, an event queue, all readable by any CLEO thread |

## Layer 3 Plugin Sketch

| Opcode (Working Name) | Purpose |
| --- | --- |
| `STATE_SET channel value` | Write an integer channel |
| `STATE_GET channel` | Read a channel |
| `STATE_ENTER channel state` | Set state and stamp the entry time |
| `STATE_ELAPSED channel` | Milliseconds since `STATE_ENTER` |
| `STATE_PUSH` / `STATE_POP channel` | Pushdown stack for interrupts |
| `STATE_POST event` / `STATE_TAKE event` | Event queue between threads |

Build with the `III.CLEO.h` SDK as a `.cleo` DLL, written in C++ with Visual Studio or MinGW. Opcode ids need a free range at or above `0x0AF0` and a Sanny definition so scripts compile with names instead of raw ids.

## Decision Gate

Build layer 2 first. The plugin starts only if the ported missions still need more than a few shared globals after that, because every shared global is a pinned slot in `variables.txt` and the lint script already counts them.

## Open Items

- Read `III.CLEO.h` and `opcodes.txt` to confirm the GTA III API matches the San Andreas SDK page.
- Confirm which CLEO build the install runs (`cleo.log` header).
- Find a free opcode range and how Sanny loads a custom definition file.
- Test that a plugin store survives a save-game load.
