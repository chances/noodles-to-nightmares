# Cast and Characters

Part of the [Mission Editor MVP PRD](README.md). Depends on the card component in [`step-controls.js`](../../../../tools/mission-editor/ui/step-controls.js).

## Goal

A mission-level Characters section lists the special characters a mission uses, like a cast list in a screenplay. Each state's Cast section selects members for that state. The generator loads each member into a slot, waits for it to stream in, and creates the ped at state entry, so authors never write the load, wait, or create lines. This prevents the crash in [lesson 0007](../../../lessons/0007-special-characters-in-gta-iii.html), which happens when a character is created before its special character has loaded.

## Behavior

- **Characters section:** A mission-level list on the mission form. Each member has a model, a display name, a Char local, and a default spawn spot. The model is a dropdown of the `SpecialCharacter` enum, the 42 GTA III names.
- **Display name:** The author types it. It pre-fills with the enum name in title case, so `FRANKIE` shows as Frankie.
- **Char local:** Each member declares its own Char local, such as `sal`. The generator adds it to the locals table.
- **Slots:** Authors never pick a slot. Each load takes the lowest slot that is free on its route, from the tally below. GTA III has slots 1 to 4.
- **Cast section:** Each state has a Cast section. An add dropdown picks members, shown as chips in the order they were added. The chips use the pill style from the mission editor UX rules, with a remove control. Each chip has a spawn spot, pre-filled from the member's default.
- **Unload choice:** The Cast section lists the members loaded on the state's routes. Choosing one frees its slot before the state's creates run. The standalone Unload Special Character card stays as an advanced card.
- **Generated steps:** At state entry, the Create Character card emits these steps for each selected member, in chip order, before the author's entry steps:
  1. `Streaming.LoadSpecialCharacter(<slot>, '<model>')`
  2. A `wait 0` loop until `Streaming.HasSpecialCharacterLoaded(<slot>)`, with no timeout
  3. `load_special_character <slot> 1 #SPECIAL0<slot> '<model>'`, a 4-argument line the user reports is required on GTA III
  4. `Char.Create(PedType.Special, #SPECIAL0<slot>, <spot>_X, <spot>_Y, <spot>_Z, <char>)`
- **Already loaded:** When the tally shows a member still sits in its slot, steps 1 and 3 are skipped. Steps 2 and 4 still run.
- **Tally:** For each state, codegen counts the loaded slots on every route into it. A route that holds more than 4 slots at a state is a problem. The cast list has no length cap.
- **Story script:** The story script front matter lists the cast as `model` and `name` pairs, and the script body names speakers by display name. Mission 1's `1_shady_job.md` is the example.
- **Scope:** Mission 1 and `side_supply_run.txt` move to the Cast section. Mission 0 uses no special character.

## Data

- A `cast` list on `Mission` in `lib/fsm/types.ts`, shaped `{ model: string; name: string; char: string; spot: string }`.
- A `cast` list and an `unload` list on `State`. `cast` holds `{ model: string; spot: string }` entries. `unload` holds model names.
- Both saved in `lib/fsm/fsm-file.ts`, so autosave keeps them.

## Tasks

- [ ] Add `cast` to `Mission`, and `cast` and `unload` to `State`, in `lib/fsm/types.ts`.
- [ ] Add the new fields to the save schema in `lib/fsm/fsm-file.ts`, and cover them in the parse round trip in `fsm-file.test.ts`.
- [ ] Merge the load, wait, and create steps into the Create Character card in `lib/fsm/descriptors.ts` and `lib/fsm/vocabulary.ts`. Remove the standalone Load Special Character card.
- [ ] Emit the cast steps at state entry in `lib/fsm/generate.ts`, before the author's entry steps, with the already-loaded skip.
- [ ] Compute the worst-path tally and the lowest-free-slot assignment in `lib/fsm`, and warn in `lib/fsm/problems.ts` when a route holds more than 4 slots.
- [ ] Add the Characters section to the mission form and the Cast section to the state form, with chips, in `tools/mission-editor/ui/`.
- [ ] Migrate mission 1: move its `Streaming.LoadSpecialCharacter` and `Char.Create` into the Cast section, and add its `sal` member.
- [ ] Convert `missions/side_supply_run.txt` to `missions/side_supply_run.fsm.json`, with its CHUNKY member in the cast. Package 10 records the Sanny diff.
- [ ] Mirror each mission's cast in its story script front matter and speaker names.
- [ ] Cover the emitted lines and the skip rule in `generate.test.ts`, the worst-path tally in `problems.test.ts`, and the new fields in `templates_test.ts`.

## Done When

- A state with cast members emits, before its entry steps, a load, a wait, and a create for each member that is not already loaded, in chip order.
- A state whose members are already loaded emits no load lines and still waits and creates.
- A route that holds more than 4 slots raises a problem.
- Mission 1 and `side_supply_run` compile, and their Sanny diffs are recorded in package 10.

## Open Questions

- Whether the story script cast mirror is generated from the `.fsm.json` or kept by hand.
- Assumed, not asked: unload choices run before the state's create steps.

## Related

- [lesson 0007](../../../lessons/0007-special-characters-in-gta-iii.html) covers the lifecycle and the crash.
- [GTAMods wiki 023C](https://gtamods.com/wiki/023C), [023D](https://gtamods.com/wiki/023D), and [009A](https://gtamods.com/wiki/009A) give the slot range and the `#SPECIAL##` pairing.
- [lib/fsm/descriptors.ts](../../../../lib/fsm/descriptors.ts) holds the Create Character card and the Load step to merge.
- [data/special-characters.json](../../../../data/special-characters.json) lists the 42 GTA III names.
- [missions/1_shady_job.fsm.json](../../../../missions/1_shady_job.fsm.json) and [missions/side_supply_run.txt](../../../../missions/side_supply_run.txt) are the two missions to move.
