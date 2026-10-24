# Mission Editor MVP: Epic Overview

This page is the PRD for the mission editor MVP and the index of its work packages. Each numbered file is one package with its own tasks and done criteria. The upstream PRD is [epic.md](../../../../docs/ways-of-work/plan/mission-editor-mvp/epic.md). The v1 decisions are recorded in the [Mission Editor section](../../../Memory.md#mission-editor) of `.agents/Memory.md`.

## Goal

**Problem:** Mission authoring runs through hand-edited tables and generated Sanny scripts. The editor already edits state graphs, beats, and steps, and exports compiling missions 0 and 1, but its forms are inconsistent, its mission list has no way to create a mission, its assets browser covers only part of the game, and its help lives outside the app. Each new mission adds more work for the one person who knows the tooling, and outside authors cannot start without that knowledge. The editor has to become complete enough for a new author to make a mission without reading the source.

**Solution:** Finish the editor as a usable authoring tool. Add a mission creation flow with starter templates, unify paired 2D and 3D Sanny steps into one card with a per-card mode switch, widen the assets browser, show each mission local's usage, add a Characters section that loads and creates special characters per state, and add in-app help that opens a generated reference. Close the open telemetry and desktop packaging items so the editor runs as a desktop app. Run an accessibility and UX copy review before release.

**Impact:** Missions 0 and 1 are rebuilt in the editor and compile to the same behavior as today. Sanny diffs from moving pass lines into a Reward section are recorded in package 10. Authors edit missions without opening a `.fsm.json` in a text editor. A new author can finish a playable mission from the setup guide and the in-app help alone. The WCAG AA audit reports no failures on the main views.

## User Personas

- **Solo mission author:** The project owner, who writes most missions and knows the GTA III scripting model. Needs speed, a consistent form for each step, and a mission-wide view of locals and usages.
- **Outside mission author:** A new contributor open to making missions. Needs a setup guide, starter templates, and help text that explains each step and condition without reading the source.

## High-Level User Journeys

1. **Start a mission:** Open the mission select, choose Add Mission, and pick an empty starter or one of the basic templates (Linear Story, Timed Chase, Delivery).
2. **Build the graph:** Add, rename, and wire states, and reorder and retime beats in the timeline. Each step is a card.
3. **Set a mode per card:** Switch a 2D or 3D card between modes. Spot-based steps stay 3D. The mode is saved in the mission file.
4. **Cast a character:** Add a member to the Characters section, then pick it in a state's Cast section. The editor loads and creates it at state entry.
5. **Find a local's uses:** Open the mission locals table, see each local's declared name and usages, and follow a link to the state or story beat that uses it.
6. **Pull a reference:** Hover the circled "?" icon on a card or vocabulary entry for a summary, then click it to open the knowledge base in a non-modal dialog.
7. **Export and check:** Open Export, read the generated Sanny and the compile log, and check the local count.
8. **Set up:** Follow the setup guide to point the editor at the GTA III folder and `.env`, then run it.

## Business Requirements

### Functional Requirements

- **Mission select:** An Add Mission item in the mission select, placed like the projects dropdown. It creates a new `missions/<stem>.fsm.json`.
- **Starter content:** An empty starter (one start state and one finishing state) and three basic templates: Linear Story, Timed Chase, and Delivery.
- **Unified step cards:** Paired 2D and 3D Sanny functions share one card. Each card has its own 2D or 3D switch, styled like the edit and debug switch. Spot steps are 3D only.
- **Per-card mode storage:** Each card's mode is stored in the `.fsm.json` beside its step.
- **Reward section:** Any state can hold an optional Reward section with a Mission Name Key and a Score Amount. After the story beats, the generator writes the pass tune, mission-passed registration, score, and pass banner, so authors script none of them.
- **Characters section:** A mission-level cast list, with a Cast section on each state. The generator loads each member into a free slot, waits for it to stream in, and creates the ped at state entry, so authors write none of those lines. See [package 05](05-cast-and-characters.md).
- **Form consistency:** One rule for how Sanny statements map to GUI controls across all cards. Lines the vocabulary does not know stay text boxes, as they do now.
- **Assets browser:** Keep geography spots, cars and models, characters and peds, blip sprites, and strings. Add interiors and IPL placements, audio and music, weapons and pickups, and vehicle colors and handling.
- **Mission locals table:** A read-only table on the mission form that lists each declared local (like constants) and its usages. Static analysis fills it. Each usage links to the state name, story beat, or step that uses it.
- **Failure modes and monitors:** Editable in the app today. The MVP keeps this editing and adds no new monitor types.
- **Tooltips and info icons:** A reusable tooltip and info-icon component. A circled "?" icon uses the help cursor. Hover shows a summary of the vocabulary entry or reference. Click opens `help.html` in a non-modal dialog that loads the knowledge base in an `iframe`.
- **Knowledge base:** `help.html` is generated from `lib/fsm/descriptors.ts` for vocabulary entries, with hand-written prose for the rest.
- **Setup guide:** Install, point the editor at the GTA III folder and `.env`, and run the editor.
- **Vocabulary reference:** A page that lists every step and condition the editor offers, generated with the knowledge base.
- **UX copy and accessibility review:** Run the UX copy and accessibility review skills across the app. Fix findings before release.
- **Telemetry:** Fix the open debugger bug in [player-telemetry-debug.md](../../../../.agents/bugs/player-telemetry-debug.md) so the debugger shows player position and F8 captures.
- **Desktop build:** Build the desktop binary with `deno task editor:build`. Resolve the disk-space failure and the output extension.
- **Export:** Keep the Export dialog's generated Sanny, compile check, and local count. `deno task build` still writes `missions/<stem>.txt`.

### Non-Functional Requirements

- **Accessibility:** WCAG 2.1 AA for text contrast, keyboard use, and touch target size. Buttons and headings use Title Case.
- **Data safety:** Autosave, undo, and redo keep working. Dangling transitions cannot be saved.
- **Compatibility:** A `.states.ts` mission still builds until its `.fsm.json` replaces it.
- **Platform:** Desktop app built with `deno desktop` on Windows. The same code runs in a browser tab for development. Supported devices are desktops and tablets.
- **Packaging:** The build must complete on a machine with the drive space the build needs.

## Success Metrics

- Missions 0 and 1 are rebuilt in the editor and compile to the same behavior as the current files. Sanny diffs from the Reward migration are recorded in package 10. Mission 1 and `side_supply_run` compile from `.fsm.json` files with their cast steps.
- Authors create and edit missions with zero hand-edited `.fsm.json` files.
- The WCAG AA audit reports no failures on the main views.

## Out of Scope

- Multi-track beats (the actor-by-beat grid in [multi-track-beats.md](../../../../.agents/plans/multi-track-beats.md)).
- Collaboration: sharing, locking, or merging missions between authors.
- New monitor types. Existing failure-mode and monitor editing stays as it is.
- Phone-sized layouts. Supported devices are desktops and tablets.

## Business Value

**High.** The editor unblocks every future mission and lets outside contributors make missions.

## Work Packages

| # | Package | Depends On | Status |
| --- | --- | --- | --- |
| 01 | [Add mission and templates](01-add-mission-and-templates.md) | None | Not started |
| 02 | [Mission locals table](02-mission-locals-table.md) | None | Not started |
| 03 | [Unified step cards](../../../../tools/mission-editor/ui/step-controls.js) | None | Built; browser checks open |
| 04 | [Assets catalog](04-assets-catalog.md) | None | Partial: spots, cars, peds, blips, strings |
| 05 | [Cast and Characters](05-cast-and-characters.md) | 03 | Partial: special character enum and Load, Unload, and HasLoaded steps exist; no Characters or Cast sections |
| 06 | [Mission Rewards](06-mission-rewards.md) | None | Not started |
| 07 | [Telemetry and desktop build](07-telemetry-and-desktop-build.md) | None | Open bug, build blocked by disk space |
| 08 | [Help and KB](08-help-and-kb.md) | 01 to 06 | Not started |
| 09 | [UX copy and accessibility](09-ux-copy-and-accessibility.md) | 01 to 08 | Not started |
| 10 | [Mission rebuild verification](10-mission-rebuild-verification.md) | 01 to 06 | Partial: missions 0 and 1 have `.fsm.json` tables and generated `.txt` files |

**Progress:** No package is complete. Built, with browser checks open: 03. Partial: 04, 05, and 10. Open: 07. Not started: 01, 02, 06, 08, and 09.

## Order

Packages 01, 02, 03, 04, 06, and 07 start in parallel. Package 05 waits for the card component in 03. Package 08 documents the authoring features, so it waits for 01 to 06. Package 09 reviews the finished UI, including the help. Package 10 closes the epic.

## Deferred Items

Unfinished work from the retired v1 and state machine plans that the MVP does not own.

| Item | Why Deferred |
| --- | --- |
| Generator-added `Mission.Fail()` in `LOSE` | Mission 1 writes the call as an authored step in `LOSE`, and mission 0's `LOSE` routes back to `GO_HOME`, so the generator does not add it yet |
| Inspector sections: Spawns, Control, Prompt, state Spot | Spawns and state Spot are geography Spots. The inspector already has spot choosers (the `spot` field type, backed by `poiSpot` in `lib/fsm/geography.ts`), and many coordinate descriptors take a spot. Whether every descriptor accepts one is unverified. Control and Prompt wait on generator support. |
| Search for era scripting languages as design references | Research; the first search returned nothing |
| Port the remaining missions, delete dead code, and refactor | Later phases of the state machine plan |
| Cross-thread channels, ownership lints, and the CLEO state plugin | Own plan: [cross-thread-state-and-cleo-plugin.md](../../cross-thread-state-and-cleo-plugin.md) |
| Automatically merge states that link to each other with one kind | The "Consider simplifying states" warning only suggests a merge; how states combine is open |

## Related Plans and Bugs

| Item | Status | Link |
| --- | --- | --- |
| Mission editor (v1 decisions) | Partly superseded: milestone 1 was read-only, but editing and export now work | [Mission Editor section](../../../../.agents/Memory.md#mission-editor) |
| Mission state machine | Shipped as the generator | [lib/fsm](../../../../lib/fsm) |
| Geography and telemetry | Phase 5 gates debugger Pause, Step, and Resume | [geography-system-and-cleo-plugin.md](../../../../.agents/plans/geography-system-and-cleo-plugin.md) |
| Player telemetry bug | Open | [player-telemetry-debug.md](../../../../.agents/bugs/player-telemetry-debug.md) |
| Blip pool bug | Fix applied | [blip-pool-exhausted-by-safehouse-blip.md](../../../../.agents/bugs/blip-pool-exhausted-by-safehouse-blip.md) |
| Building vehicle pop cycle | Open | [building-vehicle-pop-cycle.md](../../../../.agents/bugs/building-vehicle-pop-cycle.md) |
