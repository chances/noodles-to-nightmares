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
| Layout | Main view: state graph, with a beat timeline pane below it (like Blender's animation timeline). Left sidebar: a tree of states, then an asset browser. Right sidebar: the Script pane, with dynamic forms for the selection in the tree or graph. Under the timeline, a Beat pane the width of the Script pane edits the one beat picked on the timeline |
| Source of truth | The editor owns a data file (it also stores the graph layout) |
| Pipeline | Both stay valid: the generator accepts a `.states.ts` table or the editor's data file |
| First version | States and transitions, beat tables, and a generated Sanny preview. Everything else is future work (monitors, the fail list, and the rest) |
| Runtime | Desktop app built with `deno desktop` |
| Asset browser | Spots from `utils/geography.txt`, cars and models, characters and peds, blip sprites and strings |
| Data file | `missions/<stem>.fsm.json`, beside the mission; it holds the table and the graph layout |
| Conflict rule | A mission with both a `.states.ts` and a `.fsm.json` uses the `.fsm.json`; the editor writes one beside a `.states.ts` on that mission's first edit |
| Step storage | Raw Sanny lines in the file; the editor reads them back into typed controls through the descriptors, and lines the vocabulary does not know stay a text box |
| Parameter schema | Descriptors in `lib/fsm/descriptors.ts`: each vocabulary entry is `{field}` line templates with typed fields, served at `/api/vocabulary`; `ui/templates.js` builds and parses lines; `templates_test.ts` keeps them equal to the `step` and `cond` builders. A `number` field with `min` or `max` is an `input[type=number]` with those attributes |
| Asset sources | Repo files plus the game install: `utils/*.txt`, `data/strings.txt`, the custom IDE, and the stock IDE files under the `GTA3` folder from `.env` |
| Graph edits | Add (States pane `+`), rename, and delete states, all built (rename updates every `next` and `goto`; add re-runs the default layout); drag to wire transitions; reorder and retime beats in the timeline. Node positions are stored in the data file; no auto layout |
| Saving | Autosave 400 ms after an edit through `PUT /api/missions/:stem`. Each edit is a command with a memento (`ui/document.js`); undo and redo are Ctrl+Z and Ctrl+Y, and edits to one field within a second share a step |
| Sanny preview | A modal dialog opened by an "Export" button in the app header |
| Export dialog | Shows the generated Sanny, runs a compile check and shows the log, and shows the local count against 16 with generator warnings. It does not write `missions/<stem>.txt`; `deno task build` does |
| Migration | The first edit of a `.states.ts` mission saves its table as a `.fsm.json`; the `.states.ts` stays until `deno task build` reads the `.fsm.json` |
| Validation | `lib/fsm/problems.ts`: a wait without a next state, empty conditions and steps, bad monitor and constant names, unreachable and stranded states, and no finishing state. Locals over 16, and duplicate or badly named declared locals. Dangling transitions cannot be saved |
| First milestone | A read-only viewer: load a mission, draw the graph, timeline, and inspector, and open Export. Editing follows in later shippable steps |
| Project root | A folder picker on first launch, remembered; the app reads `.env` there for `GTA3` and `SANNY` |
| Run and build | Root tasks: `deno task editor` runs `deno desktop --hmr` for the submodule; `deno task editor:build` writes the binary to `dist/` |
| Shared code | The state types and declarations move to `lib/fsm` (`lib/fsm/mod.ts` plus other fsm modules); `lib/fsm` is a Deno workspace package that the root build and the editor both import |

## Open Items

- `deno task editor:build` stopped with "There is not enough space on the disk" (drive `C:` is nearly full); the desktop binary is unbuilt, and the output name came out as `MissionEditor.dll`, so check the `--output` extension on Windows.
- The Export dialog lists problems; the generated Sanny, the compile check, and the local count are unbuilt.
- The editor has no form for `mission.locals` (declared mission locals such as `Char sal`); mission 1 declares them in its `.fsm.json`.
- A `handle` field matches `$name` only, so steps on mission locals (`Blip.Remove(payphoneBlip)`) stay raw text boxes.
