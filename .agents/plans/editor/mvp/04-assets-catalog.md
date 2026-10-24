# Assets Catalog

Part of the [Mission Editor MVP PRD](README.md).

## Goal

The assets browser covers interiors and IPL placements, audio and music, weapons and pickups, and vehicle colors and handling, alongside the existing sources.

## Existing Sources

Geography spots, cars and models, characters and peds, blip sprites, and strings are already browsable. Their existing sources are repo files and the game install (`utils/*.txt`, `data/strings.txt`, and the custom and stock IDE files).

## Tasks

- [ ] Find the source file for each new type in the game install or repo, and record it in a table in this file.
- [ ] Add a parser per source in the existing asset-source module, using the same shape as the current ones.
- [ ] Add a browser section per type, with search over name and ID.
- [ ] Make each browsable item insertable into a step card that takes that type.
- [ ] Add tests with fixture files, one per source.

## Source Table

| Type | Source | Status |
| --- | --- | --- |
| Interiors and IPL | Stock and custom IDE and IPL files under `GTA3` | To find |
| Audio and music | To find | To find |
| Weapons and pickups | To find | To find |
| Vehicle colors and handling | To find | To find |

## Done When

- Each new type lists its items from the install, and search finds them.
- An item inserts into a matching card with a valid value.
- Fixture tests pass for every source.
