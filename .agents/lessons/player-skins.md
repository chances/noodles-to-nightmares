# GTA III Player Skins: What `playa5nu` Is

## The short answer

`playa5nu` is the only texture inside the stock `player.txd`. It is the in-game Claude (ped skin ID 0). The game has three Claude models, each with its own TXD:

| Model | TXD | Texture inside | Used for | Source |
| :--- | :--- | :--- | :--- | :--- |
| `player` | `player.txd` | `playa5nu` (256x256, 8bpp) | Normal gameplay Claude | Verified by extracting from `gta3.img` |
| `playerp` | `playerp.txd` | `playa_prison` (256x256, 8bpp) | Prison Claude (ped skin ID 122) | Verified by extracting from `gta3.img`; ID 122 from [GTA Connected](https://wiki.gtaconnected.com/Resources/GTA3/PedSkins) |
| `playerx` | `playerx.txd` | `playa5` and `shot_all` | Intro cutscene Claude (bank robbery) | Verified by extraction; role from [GTAForums](https://gtaforums.com/topic/275848-hidden-skin-for-the-player-claude/) |

## How `playa5nu` differs from the other skins

- **`playa5nu` vs `playa5`:** the names share the `playa5` stem. The forum thread reports that `playa5` (in `playerx.txd`) shows clean pants and dark gloves, while `playa5nu` is the gameplay look. The same thread notes the cutscene model has its own hand and shoe-sole UV layout, so the two textures are not interchangeable.
- **`playa5nu` vs `playa_prison`:** same size and depth, different clothes, on the separate `playerp` model.
- **`shot_all`:** a texture for the shotgun that `playerx.dff` carries. `player.dff` has no shotgun.
- **Other peds:** they are listed by ID on [GTA Connected](https://wiki.gtaconnected.com/Resources/GTA3/PedSkins) (0 to 126). Player-class models are the three above. The special-actor opcode [023C](https://gtamods.com/wiki/023C) loads `PLAYER`, `PLAYERP`, and `PLAYERX` by DFF name.

## Unconfirmed

- The forum claim that `playa2`, `playa3`, and `playa4` once existed is a single poster's guess.
- How regular peds name their textures was not found on a wiki page. Extract a ped TXD from `gta3.img` and read it before relying on a naming pattern.

## What this means for this repo

`scripts/build.ts` step 7 builds `player.txd` with texture name `playa5nu` at 256x256 @ 8bpp, so it replaces the gameplay Claude only. Prison Claude (`playerp.txd`) and the intro cutscene Claude (`playerx.txd`) stay vanilla until those TXDs are built the same way.

## Sources

- [GTAForums: Hidden skin for the player](https://gtaforums.com/topic/275848-hidden-skin-for-the-player-claude/)
- [GTA Connected: GTA III Ped Skins](https://wiki.gtaconnected.com/Resources/GTA3/PedSkins)
- [GTAMods Wiki: 023C](https://gtamods.com/wiki/023C)
