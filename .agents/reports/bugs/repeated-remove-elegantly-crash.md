---
state: fixed
---
# Repeated `Char.RemoveElegantly` Crashes the Game

**Status**: Resolved in code. `tryRemoveSal` in `missions/1_shady_job.txt` was refactored after this finding.

## Symptom
Crash to desktop in `missions/1_shady_job.txt` shortly after the opening cutscene ended, with the script in the payphone wait loop.

## Root Cause
The loop called `tryRemoveSal()` every frame. Once `Char.LocateAnyMeansChar2D($sal, $playerChar, 50, 50, false)` returned false, `Char.RemoveElegantly($sal)` ran on every following frame against the same handle. Confirmed by the user's refactor of `tryRemoveSal`.

## Evidence
- `scrlog.log` shows `[034F] REMOVE_CHAR_ELEGANTLY` in each of about 33 consecutive frames, ending with a normal `WAIT` and `TIMERA` at 1258 ms.
- The `[02A7]` blip call on the preceding frame returned a handle, and the script then ran those frames without a fault.
- `cleo.log`, `cleo_redux.log`, and `d3d8.log` held no crash address.

## Ruled Out
- The payphone contact point blip call: it returned a handle and the loop ran afterward.
