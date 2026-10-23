# Mission Editor MVP: Epic Overview

Decomposes the [Mission Editor MVP PRD](../../../../docs/ways-of-work/plan/mission-editor-mvp/epic.md) into work packages. Each numbered file is one package with its own tasks and done criteria. The v1 decisions are recorded in the [Mission Editor section](../../../Memory.md#mission-editor) of `.agents/Memory.md`. The same goals appear in the [PRD copy in this folder](README.md).

## Work Packages

| # | Package | Depends On | Starting State |
| --- | --- | --- | --- |
| 01 | [Add Mission and templates](01-add-mission-and-templates.md) | None | Not started |
| 02 | [Unified step cards](02-unified-step-cards.md) | None | Not started |
| 03 | [Assets browser expansion](03-assets-browser-expansion.md) | None | Partial: spots, cars, peds, blips, strings |
| 04 | [Mission locals table](04-mission-locals-table.md) | None | Not started |
| 05 | [Help and knowledge base](05-help-and-knowledge-base.md) | 02 | Not started |
| 06 | [Telemetry and desktop build](06-telemetry-and-desktop-build.md) | None | Open bug, build blocked by disk space |
| 07 | [UX copy and accessibility](07-ux-copy-and-accessibility.md) | 01 to 06 | Not started |
| 08 | [Mission rebuild verification](08-mission-rebuild-verification.md) | 01 to 04 | Partial: missions 0 and 1 compile |

## Order

Packages 01, 02, 03, 04, and 06 start in parallel. Package 05 waits for the card component in 02. Package 07 reviews the finished UI. Package 08 closes the epic.

## Deferred Items

Unfinished work from the retired v1 and state machine plans that the MVP does not own.

| Item | Why Deferred |
| --- | --- |
| `LOSE` as a terminal failure | No mission needs one yet; `LOSE` does not call `Mission.Fail()` |
| Inspector sections: Spawns, Reward, Time Limit, Control, Prompt, state Spot | Each waits on generator support, per the "Not built" list in the Mission Editor section of `.agents/Memory.md` |
| Where `kind` shows in the graph, and where Spawns positions come from | Open questions with no answer yet |
| Search for era scripting languages as design references | Research; the first search returned nothing |
| Port the remaining missions, delete dead code, and refactor | Later phases of the state machine plan |
| Cross-thread channels, ownership lints, and the CLEO state plugin | Own plan: [cross-thread-state-and-cleo-plugin.md](../../cross-thread-state-and-cleo-plugin.md) |
| Automatically merge states that link to each other with one kind | The "Consider simplifying states" warning only suggests a merge; how states combine is open |
