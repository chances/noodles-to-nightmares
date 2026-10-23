# Mission Editor MVP

## Goal

**Problem:** Mission authoring runs through hand-edited tables and generated Sanny scripts. The editor already edits state graphs, beats, and steps, and exports compiling missions 0 and 1, but its forms are inconsistent, its mission list has no way to create a mission, its assets browser covers only part of the game, and its help lives outside the app. Each new mission adds more work for the one person who knows the tooling, and outside authors cannot start without that knowledge. The editor has to become complete enough for a new author to make a mission without reading the source.

**Solution:** Finish the editor as a usable authoring tool. Add a mission creation flow with starter templates, unify paired 2D and 3D Sanny steps into one card with a per-card mode switch, widen the assets browser, show each mission local's usage, and add in-app help that opens a generated reference. Close the open telemetry and desktop packaging items so the editor runs as a desktop app. Run an accessibility and UX copy review before release.

**Impact:** Missions 0 and 1 are rebuilt in the editor and compile to the same Sanny output as today. Authors edit missions without opening a `.fsm.json` in a text editor. A new author can finish a playable mission from the setup guide and the in-app help alone. The WCAG AA audit reports no failures on the main views.

## User Personas

- **Solo mission author:** The project owner, who writes most missions and knows the GTA III scripting model. Needs speed, a consistent form for each step, and a mission-wide view of locals and usages.
- **Outside mission author:** A new contributor open to making missions. Needs a setup guide, starter templates, and help text that explains each step and condition without reading the source.

## High-Level User Journeys

1. **Start a mission:** Open the mission select, choose Add Mission, and pick an empty starter or one of the basic templates (Linear Story, Timed Chase, Delivery).
2. **Build the graph:** Add, rename, and wire states, and reorder and retime beats in the timeline. Each step is a card.
3. **Set a mode per card:** Switch a 2D or 3D card between modes. Spot-based steps stay 3D. The mode is saved in the mission file.
4. **Find a local's uses:** Open the mission locals table, see each local's declared name and usages, and follow a link to the state or story beat that uses it.
5. **Pull a reference:** Hover the circled "?" icon on a card or vocabulary entry for a summary, then click it to open the knowledge base in a non-modal dialog.
6. **Export and check:** Open Export, read the generated Sanny and the compile log, and check the local count.
7. **Set up:** Follow the setup guide to point the editor at the GTA III folder and `.env`, then run it.

## Business Requirements

### Functional Requirements

- **Mission select:** An Add Mission item in the mission select, placed like the projects dropdown. It creates a new `missions/<stem>.fsm.json`.
- **Starter content:** An empty starter (one start state and one finishing state) and three basic templates: Linear Story, Timed Chase, and Delivery.
- **Unified step cards:** Paired 2D and 3D Sanny functions share one card. Each card has its own 2D or 3D switch, styled like the edit and debug switch. Spot steps are 3D only.
- **Per-card mode storage:** Each card's mode is stored in the `.fsm.json` beside its step.
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

- Missions 0 and 1 are rebuilt in the editor and compile to the same Sanny output as the current files.
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

| # | Package | Depends On |
| --- | --- | --- |
| Index | [00-mission-editor-mvp.md](00-mission-editor-mvp.md) | None |
| 01 | [Add mission and templates](01-add-mission-and-templates.md) | None |
| 02 | [Unified step cards](02-unified-step-cards.md) | None |
| 03 | [Assets browser expansion](03-assets-browser-expansion.md) | None |
| 04 | [Mission locals table](04-mission-locals-table.md) | None |
| 05 | [Help and knowledge base](05-help-and-knowledge-base.md) | 02 |
| 06 | [Telemetry and desktop build](06-telemetry-and-desktop-build.md) | None |
| 07 | [UX copy and accessibility](07-ux-copy-and-accessibility.md) | 01 to 06 |
| 08 | [Mission rebuild verification](08-mission-rebuild-verification.md) | 01 to 04 |

## Related Plans and Bugs

| Item | Status | Link |
| --- | --- | --- |
| Mission editor (v1 decisions) | Partly superseded: milestone 1 was read-only, but editing and export now work | [Mission Editor section](../../../../.agents/Memory.md#mission-editor) |
| Mission state machine | Shipped as the generator | [lib/fsm](../../../../lib/fsm) |
| Geography and telemetry | Phase 5 gates debugger Pause, Step, and Resume | [geography-system-and-cleo-plugin.md](../../../../.agents/plans/geography-system-and-cleo-plugin.md) |
| Player telemetry bug | Open | [player-telemetry-debug.md](../../../../.agents/bugs/player-telemetry-debug.md) |
| Blip pool bug | Fix applied | [blip-pool-exhausted-by-safehouse-blip.md](../../../../.agents/bugs/blip-pool-exhausted-by-safehouse-blip.md) |
| Building vehicle pop cycle | Open | [building-vehicle-pop-cycle.md](../../../../.agents/bugs/building-vehicle-pop-cycle.md) |
