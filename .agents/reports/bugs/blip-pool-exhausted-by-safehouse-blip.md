---
state: fix-applied
---
# Mission Blips Missing Because the Blip Pool Is Full

**Status**: Fix applied in code (`ensureSafehouseBlip` guard in `utils/missions.txt`). The in-game result after the fix has not been reported.

## Symptom
In `missions/1_shady_job.txt` the van, payphone, and package pickup blips never appear on the radar.

## Root Cause
`main.txt` calls `ensureSafehouseBlip()` on every frame while `$onMission` is false and `$missionIndex > 0`. The function added a new `Blip.AddSpriteForCoord` blip on each call and overwrote `$SafeBlip`, so earlier handles were lost and never removed. The blip pool filled, and every later `Blip.Add*` call returned `-1`.

## Evidence
`CLEO\debug.ini` from a run to the pickup, written by `debugLogInt` right after each blip call:

| Key | Value |
| :--- | :--- |
| `Van` (`$vanBlip`) | `-1` |
| `Payphone` (`$payphoneBlip`) | `-1` |
| `Pickup` (`$pickupBlip`) | `-1` |
| `VanHandle` (`$van`) | `11010` |
| `PlayerHandle` (`$player`) | `0` |

The car handle and player handle were valid, so the mission read the right global slots.

## Fix
`ensureSafehouseBlip` creates the blip only when `$SafeBlip == 0`. `main.txt` already resets `$SafeBlip` to `0` after `Blip.Remove`.

## Ruled Out
| Candidate | Evidence |
| :--- | :--- |
| Contact point blip hidden on mission | The payphone blip uses `Blip.AddSpriteForCoord` and still returned `-1` |
| Unpinned `$van` and `$vanBlip` slots | The van handle read back valid; the slots are now pinned in `variables.txt` regardless |
| Wrong radar sprite constant | The pickup and van blips use no sprite and returned `-1` too |
| `Blip.ChangeDisplay($payphoneBlip, BlipDisplay.Both)` on the contact point blip | No blip appeared on the minimap beside the payphone; the contact point blip is also hidden on mission by the library's own description |
