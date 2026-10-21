# Mission Editor

A desktop editor for mission state machines, to live in a new submodule at `tools/mission-editor`. It edits the tables that [mission-state-machine.md](mission-state-machine.md) turns into `.cm` mission scripts.

## Findings

| Source | Fact | Use Here |
| --- | --- | --- |
| [deno desktop](https://docs.deno.com/runtime/reference/cli/desktop/) | Available from Deno 2.9; compiles a Deno project to a desktop binary; the UI runs in the OS webview (default) or CEF | The editor ships with `deno desktop`; this machine has Deno 2.9.7 |
| [HTTP serving](https://docs.deno.com/runtime/desktop/serving/) | `Deno.serve()` binds to the port the webview opens; the same code runs in a browser tab | Develop the editor in a browser tab, ship it as a desktop app |
| [Backends](https://docs.deno.com/runtime/desktop/backends/) | The webview backend has no DevTools; CEF does | Use CEF when UI debugging needs DevTools |

## Decisions

| Topic | Decision |
| --- | --- |
| Layout | Main view: state graph, with a beat timeline pane below it (like Blender's animation timeline). Left sidebar: a tree of states, then an asset browser. Right sidebar: an inspector with dynamic forms for the selection in the tree or graph |
| Source of truth | The editor owns a data file (it also stores the graph layout) |
| Pipeline | Both stay valid: the generator accepts a `.states.ts` table or the editor's data file |
| First version | States and transitions, beat tables, and a generated Sanny preview. Everything else is future work (monitors, the fail list, and the rest) |
| Runtime | Desktop app built with `deno desktop` |
| Asset browser | Spots from `utils/geography.txt`, cars and models, characters and peds, blip sprites and strings |
| Data file | `missions/<stem>.fsm.json`, beside the mission; it holds the table and the graph layout |
| Conflict rule | A mission with both a `.states.ts` and a `.fsm.json` uses the `.states.ts`; the build warns |
| Step storage | Both forms: `{ "step": "say", "args": [...] }` when the vocabulary knows the step, raw Sanny lines as the escape hatch |
| Parameter schema | Descriptors in `lib/fsm`: each vocabulary entry declares its parameters (name, type, default) beside its emitter, and the inspector builds forms from them |
| Asset sources | Repo files plus the game install: `utils/*.txt`, `data/strings.txt`, the custom IDE, and the stock IDE files under the `GTA3` folder from `.env` |
| Graph edits | Add, rename, and delete states (rename updates every `next` and `goto`); drag to wire transitions; reorder and retime beats in the timeline. Node positions are stored in the data file; no auto layout |
| Saving | Autosave on every edit. Undo and redo are future work, so each edit is a command object with a memento from the start |
| Sanny preview | A modal dialog opened by an "Export" button in the app header |
| Export dialog | Shows the generated Sanny, runs a compile check and shows the log, and shows the local count against 16 with generator warnings. It does not write `missions/<stem>.txt`; `deno task build` does |
| Migration | The editor imports a `.states.ts`: step builders record their name and args, so the editor saves the table as `.fsm.json`, then the `.states.ts` is deleted |
| Validation | Dangling transitions, unreachable states, locals over 16, and states with no exit |
| First milestone | A read-only viewer: load a mission, draw the graph, timeline, and inspector, and open Export. Editing follows in later shippable steps |
| Project root | A folder picker on first launch, remembered; the app reads `.env` there for `GTA3` and `SANNY` |
| Run and build | Root tasks: `deno task editor` runs `deno desktop --hmr` for the submodule; `deno task editor:build` writes the binary to `dist/` |
| Shared code | The state types and declarations move to `lib/fsm` (`lib/fsm/mod.ts` plus other fsm modules); `lib/fsm` is a Deno workspace package that the root build and the editor both import |

## Open Items

- `deno task editor:build` stopped with "There is not enough space on the disk" (drive `C:` is nearly full); the desktop binary is unbuilt, and the output name came out as `MissionEditor.dll`, so check the `--output` extension on Windows.
- Save, undo, and validation behavior.
