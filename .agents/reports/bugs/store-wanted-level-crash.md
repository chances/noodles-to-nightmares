# Reading the Wanted Level With `01C0` Crashes the Game After a Cop Hit

## Symptom

The game crashes to desktop when the player hits a cop with fists or a car while a mission's fail check reads the wanted level. The user reports it happens in any state of `missions/1_shady_job.txt` that runs `failCheck`.

## Evidence

- `scrlog.log` ends on `[01C0] STORE_WANTED_LEVEL -> 1`, a normal `wanted > 1` test, `RETURN`, and then `[00E3] LOCATE_PLAYER_ANY_MEANS_2D` in the `GOTO_PHONE` state. The state is incidental: the crash recurs in every state that runs `failCheck`.
- `modloader.log` reports `Unhandled exception at 0x004A1002 in gta3-game.exe (+0xa1002): 0xC0000005: Access violation reading location 0x00001136`, with `scrlog.asi` in the backtrace.
- `cleo.log` was empty.
- `tests/wanted-probe.txt` cycles four reads with F9: raw `01C0`, `Player.StoreWantedLevel`, `Player.IsWantedLevelGreater`, and none. The user reports the game crashed while they had a star after switching the mode, and names `01C0` as the culprit.

## Fix

The Wanted Level Above card (`wantedAbove` in `lib/fsm/vocabulary.ts` and `lib/fsm/descriptors.ts`) emits `Player.IsWantedLevelGreater($player, n)` (`010F`, a condition) instead of reading `01C0` into a scratch local. The delivery template uses it too. A run of the mission with the new card is still to do.

## Ruled Out

- The `wanted > 1` comparison: it evaluated FALSE at wanted level 1 and the script carried on.
- The `LOCATE_PLAYER_ANY_MEANS_2D` arguments: the same command returned FALSE on earlier frames with the same values.
