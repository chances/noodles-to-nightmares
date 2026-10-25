# Factory Function Audit

**Rule:** Prefer a `class` over a factory function for JavaScript and TypeScript (`~/.claude/CLAUDE.md`, Absolute Rules). A factory here is a function named `create*`, `make*`, or `build*` that returns an object literal whose methods close over mutable state.

**Scope:** Every `.js` and `.ts` file in the repo, excluding `node_modules`, `vendor`, `dist`, `plugins`, and `.git`. Matched with ripgrep on factory names, on `return {` and `=> ({` sites, and on `let` and `new Map` or `new Set` inside those functions.

## Findings

| # | Location | Shape | Severity |
|---|---|---|---|
| 1 | `scripts/telemetry.ts:130` `startCapture` | Returns `{ stop }`; closes over `summary`, `lastPositionLogged`, `file`, and `listener` | High |
| 2 | `scripts/telemetry.ts:92` `listenTelemetry` | Returns `{ close }`; closes over `socket` | Medium |
| 3 | `tools/mission-editor/server.ts:180` `createApp` | Returns a Hono app; closes over `txtEmitters`, `scriptWriters`, and `dirs` | Medium |
| 4 | `tools/mission-editor/server.ts:549` `createHandler` | Returns `createApp(dirs).fetch`; holds no state of its own | Low |

### 1. `startCapture`

The function builds a capture session, and its `stop()` method reads and writes state the callback also mutates. A class fits: fields for `#summary`, `#lastPositionLogged`, `#file`, and `#listener`, with `static async start(port, logPath, onEvent)` returning `CaptureSession | null` in place of the top-level `await`.

### 2. `listenTelemetry`

Its only closure state is the socket. A `TelemetryListener` class with `static async listen(port, onPacket)` and a `close()` method removes the object literal. The `null` return on a taken port stays in the static method.

### 3. `createApp`

The function returns a Hono framework instance, which is already an object. The closure state is the per-project `ScriptWriter` map and the `dirs` argument. Tests pass `createApp` options for `spawnRun`, `stopRun`, `runBuild`, and `telemetryPort`. A `MissionServer` class could keep those as constructor options and expose `fetch` as a getter. The Hono idiom and the test seams both need care in that move.

### 4. `createHandler`

It returns a bound function, not an object. It becomes unnecessary once `createApp` is a class, so it can be folded in then. No change is needed before that.

## Reviewed and not flagged

| Category | Examples | Why it is not the anti-pattern |
|---|---|---|
| Preact hooks | `useTelemetry`, `useDocument`, `useAssetFilters`, `usePan`, `useZoom`, `useReorder` | Hooks return handlers and values by framework design, and their state lives in component hooks, not closures |
| Data records | `listNames` (`lib/fsm/known.ts`), `enumsFor` (`lib/fsm/enums.ts`), `listProjects` (`tools/mission-editor/projects.ts`), `inboundTo` (`ui/refactor.js`) | Plain data returned from a function, with no state held between calls |
| Stateless builders | The `(): Cond => ({ ... })` constructors in `lib/fsm/vocabulary.ts`, the `toggle` and `sphere` helpers in `lib/fsm/descriptors.ts` | Each call builds a fresh literal and keeps nothing |
| Test doubles | `spawnRun: () => ({ ... })` in `server_test.ts`, `getBoundingClientRect` in `templates_test.ts`, the fixtures in `lib/fsm/lint.test.ts` | Test scaffolding, not production code |
| Existing classes | `.agents/mcp/game-logtail/src/monitor.ts` (`Monitor`), `ScriptWriter` in `tools/mission-editor/script-emit.ts` | Already classes |

## Not in scope

- `plugins/` is C++ and CMake, with no JS or TS to check.
- `dist/` and `vendor/` hold build output and vendored libraries.

## Suggested order

1. Convert `startCapture` (finding 1), since its state is the most tangled.
2. Convert `listenTelemetry` (finding 2) in the same pass, since `startCapture` calls it.
3. Decide on `createApp` (finding 3) with the user, because it changes the server's public seams and its tests.
4. Fold `createHandler` (finding 4) into step 3.
