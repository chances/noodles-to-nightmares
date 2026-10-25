# Add Mission and Templates

Part of the [Mission Editor MVP PRD](README.md).

## Goal

An author creates a new mission from the mission select, starting from an empty table or one of three templates.

## Architecture & Design Decisions

- **UI Trigger (`MissionMenu`)**: Replace the native `<select>` in `app.js` with a custom dropdown component modeled on `ProjectMenu`, showing the active mission label, a scrollable list of missions, a divider, and an "+ Add Mission" item opening `CreateMissionDialog`.
- **Naming & Indexing**: Dialog scans existing missions to compute the next sequential index prefix (e.g. `3_`) with an editable slug input. Stem format validates as `^[A-Za-z0-9_-]+$`, checking collisions against existing missions client-side and server-side.
- **Backend API**: Add `POST /api/missions` with body `{ stem: string, template: "empty" | "linear" | "timed_chase" | "delivery" }`. Validates collisions and writes `missions/<stem>.fsm.json`.
- **Templates Module (`lib/fsm/templates.ts`)**:
  - Exported through `@noodles/fsm`.
  - Standard state naming: `INTRO` (start), `WIN` (finish), `LOSE` (onFail).
  - Standard fails across templates (`Player.IsDead($player)`, `Player.HasBeenArrested($player)`) so `lib/fsm/problems.ts` reports 0 errors and 0 warnings.
  - **Empty Starter**: `INTRO` -> `WIN`, `LOSE`.
  - **Linear Story**: `INTRO` (cutscene/wait) -> `GO_TO_DESTINATION` (wait/until) -> `WIN`, with `LOSE`.
  - **Timed Chase**: `INTRO` -> `CHASE` (with `timeLimit: 120`, `showTimer: true`, busted fail) -> `WIN`, with `LOSE`.
  - **Delivery**: `INTRO` -> `PICKUP` -> `DELIVERY` (using raw coordinate constants) -> `WIN`, wanted fail (`Player.WantedLevel > 0`), with `LOSE`.
- **Editor UX**: On creation, update in-memory mission list, set active stem, and update URL with `history.pushState` without a page reload.

## Tasks

- [ ] Add `lib/fsm/templates.ts` defining `empty`, `linear`, `timed_chase`, and `delivery` templates; export from `lib/fsm/mod.ts`.
- [ ] Add unit tests in `lib/fsm/templates.test.ts` ensuring all templates pass `problems()` with zero errors and zero warnings.
- [ ] Add `POST /api/missions` endpoint in `tools/mission-editor/server.ts` with Valibot schema validation and conflict checks.
- [ ] Add server endpoint tests in `tools/mission-editor/server_test.ts`.
- [ ] Implement `CreateMissionDialog` and `MissionMenu` in `tools/mission-editor/ui/mission-menu.js` (or `mission-ops.js`), mirroring `ProjectMenu`.
- [ ] Wire `MissionMenu` into `tools/mission-editor/ui/app.js` replacing the native `<select>`, updating state and URL upon mission creation.

## Done When

- A new mission opens in the editor with its starter content and passes validation.
- Each template compiles through `deno task build` and the generator test passes.
- Tests cover stem conflicts and each template's table.

## Related

[lib/fsm/types.ts](../../../../lib/fsm/types.ts) defines the table shape each template must follow.
