# Creating Sal Right After Loading Frankie Crashes the Game

## Symptom

Walking into the noodle shop in mission 1 crashes to desktop. `scrlog.log` has no `Logging finished` footer, and `modloader.log` reports `Unhandled exception at 0x004052BD in gta3-game.exe (+0x52bd): 0xC0000005: Access violation writing location 0x0000003C` with `ESI: 0x0000001A` (26, the `#SPECIAL01` model).

## Evidence

- `scrlog.log` ends `[01B4] SET_PLAYER_CONTROL`, `[023C] LOAD_SPECIAL_CHARACTER`, `[009A] CREATE_CHAR`. No `[023D]` check and no `WAIT` sits between the load and the create.
- The compiled `missions/1_shady_job.cm` holds one `3c 02 04 01 "FRANKIE"` followed directly by `9a 00 04 15 04 1a`: ped type 21 (`Special`), model 26.
- `main.txt` used to load `ASUKA` and `MARIA` into slots 1 and 2 at startup. Commit `5f28ac2` removed those loads, so slot 1 no longer holds a streamed model when the intro creates `#SPECIAL01`.

## Second Defect Found

`load_special_character 1 1 #SPECIAL01 'FRANKIE'` (emitted by the Create Character card, `lib/fsm/descriptors.ts` and `lib/fsm/vocabulary.ts`) does not compile. A scratch compile of that line alone fails with `Not enough actual parameters. Expected 2 params`, and the compiler drops the line. `scripts/build.ts` and `scripts/check-compile.ts` only fail when `compile.log` names the input file, and the mission compile's log named `utils/debug.txt:40` instead, so the dropped line passed silently.

## Change Made

- `step.charCreate` and the Create Character card now emit `Streaming.LoadSpecialCharacter`, a `while not Streaming.HasSpecialCharacterLoaded(slot)` loop with `wait 0`, then `Char.Create`. The 4-argument line is gone. Mission 1's table and generated `.txt` carry the same lines; the compiled bytes read `3c 02`, `3d 82`, a `wait`, then `9a 00`.
- `scripts/build.ts` and `scripts/check-compile.ts` fail on any `compile.log` text, not only text naming the input file. That exposes `utils/debug.txt:40` (`0B31: TELEMETRY_PORT ... Expected 0 params`), which every mission compile already logged.

## Status

Open until the user runs mission 1 in game. The load-then-create ordering is the hypothesis; the crash has not been reproduced here, and no game was launched.
