---
name: txd-importing
description: Use when building, reading, or importing RenderWare TXD textures, game startup splash screens, managing GTA III and Vice City img archives, or wiring a model's DFF/TXD/COL into models/manifest.csv and the custom IDE/IPL so it replaces a stock building
---

# GTA III Texture & Archive Management

## Overview
RenderWare 3.x stores UI and model textures inside Texture Dictionary (`.txd`) chunk containers and packages game assets inside `gta3.img` archives.

## When to Use
- Creating or updating title/startup splash screens (`splash1.txd`, `splash2.txd`, `splash3.txd`).
- Replacing in-game loading screens (`loadsc0.txd` through `loadsc2.txd`) or menu textures (`menu.txd`).
- Packaging custom textures into native Direct3D 8/9 format without manual GUI tools.
- Modifying, extracting, or packing assets inside `gta3.img` / `gta3.dir`.
- When NOT to use: Scripting game logic in `.scm` or defining 3D collision in `.col`.

## Core Pattern

### 1. Building a TXD From Image
Generate native RenderWare TXD files directly from PNG or JPG images:
```bash
python scripts/manage-txd.py --build <image_path> <internal_texture_name> <output_txd_path>
```
Example (8bpp startup splash screen):
```bash
python scripts/manage-txd.py --build docs/rosa-title-splash.jpg splash3 assets/splash3.txd --depth 8 --size 512 256
```

### 2. Inspecting TXD Contents
Verify internal texture rasters, dimensions, depth, and compression:
```bash
python scripts/manage-txd.py --info assets/splash3.txd
```

### 3. Managing IMG Archives
Extract or replace entries within `gta3.img`:
```bash
# List items in archive
python scripts/manage-img.py --list models/gta3.dir

# Extract single file
python scripts/manage-img.py --extract models/gta3.dir dinerind.dff extracted/dinerind.dff

# Replace file in archive
python scripts/manage-img.py --replace models/gta3.dir models/gta3.img dinerind.dff models/Punk\ Noodles/dinerind.dff
```

### 4. Converting a D3D9 TXD for GTA III
GTA III reads only Direct3D 8 TXDs (platform `8`, device `0`, RW stamp `0x320`). A TXD saved by San Andreas or Vice City tools carries platform `9`, and GTA III silently fails to stream it, so every model that depends on it is invisible. Convert it:
```bash
python scripts/convert-txd-d3d9-to-d3d8.py <input.txd> <output.txd>
```
The converter handles 32-bit `A8R8G8B8` and DXT1 textures. Check the result with the platform field of the first native header: vanilla `inditaly1.txd` shows platform `0x8`; a failing TXD shows `0x9`. `manage-txd.py --info` does not read multi-texture or non-D3D8 files.

## Model Packaging: Manifest, ModLoader, IDE, IPL

**REQUIRED BACKGROUND:** modloader-guidance (package layout, `std.stream`, `std.data`, `IDE`/`IPL`/`COLFILE` directives).

Flow for one model: `models/manifest.csv` row, then `scripts/build.ts` step 3 stages files, then step 4 stages maps and `noodles_custom.txt`, then ModLoader loads them.

| Manifest column | Becomes | Must match |
| :--- | :--- | :--- |
| `name` | Name patched into the COL header (22 bytes) | The IDE model name for that object |
| `dff` | Source file in the folder; staged as `models/gta3.img/<name>.dff` | `<name>` equals the IDE `ModelName` |
| `txd` | `modloader/Noodles/models/gta3.img/<txd>` | IDE `TxdName` + `.txd` |
| `col` | Source file in the folder; staged as `data/maps/noodles/col/<name>.col` | A `COLFILE 0` line for `<name>.col` in `data/noodles_custom.txt` |
| `enabled` | Gates step 3 packaging; step 4 comments `COLFILE` lines in `noodles_custom.txt` to match | `IDE`/`IPL` entries are NOT synced; comment those by hand |

### IDE (`data/maps/noodles/custom.ide`)
`objs` line: `Id, ModelName, TxdName, MeshCount, DrawDistance, Flags` ([GTA III OBJS](https://www.grandtheftwiki.com/OBJS)). Example: `3895, ind_newtenement08, rosa_apartment, 1, 160.0, 0`.

### IPL (`data/maps/noodles/custom.ipl`)
`inst` line starts with the same `Id`; the name field is ignored by the game ([Item Placement](https://gtamods.com/wiki/Item_Placement)). Use the `Id` from the IDE line.

### Registration
`std.data` does not load an IDE or IPL without a matching `gta.dat` entry ([std.data doc](https://github.com/thelink2012/modloader/blob/master/doc/plugins/gta3/std.data.md)). `data/noodles_custom.txt` carries the `IDE`, `IPL`, and `COLFILE 0` directives.

### Replacing a stock building (e.g. `ind_newtenement08`)
1. Keep `dff` in the manifest named like the stock file, so `std.stream` overrides the `gta3.img` entry by name.
2. Look up the stock `Id` in the game install's `data/maps/*/*.ide` (e.g. `445, ind_newtenement08, inditaly1, 1, 115, 0` in `industne.ide`) and reuse it in `custom.ide`. The stock `inst` for that `Id` already exists in `industNE.ipl`, so `custom.ipl` needs no second one.
3. Reuse the stock ModelName, and set `TxdName` to the new TXD.
4. Place the `inst` with that `Id` in `custom.ipl`.
5. Check `modloader.log` for `Importing model file for index <Id>`. The index must equal the IDE `Id`. Only the log the game writes at launch counts; `dist/Drag-N-Drop.zip` packs an old copy that the install overwrites into the game folder.
6. A model that imports cleanly but never renders points at its TXD (see "Converting a D3D9 TXD"), not at the IDE or IPL.

**UNVERIFIED (no source found; test in game):** which definition wins when `custom.ide` repeats a stock `Id` or ModelName, and whether the stock IPL instance of the same building must be removed or hidden.

## Quick Reference

| Chunk / File | ID / Path | Role |
| :--- | :--- | :--- |
| **Root Container** | `0x16` | Outer RenderWare TXD file container |
| **Info Struct** | `0x01` inside `0x16` | Texture count metadata (uint16) |
| **Texture Slot** | `0x15` | Individual texture entry wrapper |
| **Native Data** | `0x01` inside `0x15` | Raster header, BGRA pixels, D3D format |
| **Startup Title Splash** | `txd/splash3.txd` | 3rd startup splash (main title artwork) |
| **GTA Archive** | `models/gta3.img` | 2048-byte sector-aligned asset archive |

## Common Mistakes
- **Splash Screen 8bpp Palettized Requirement**: GTA III's startup splash loader (`CSplash`) strictly requires 8-bit palettized textures (`depth=8`, `raster_format=0x2600`, 256 RGBA color table, `512x256`). Loading 32-bit textures produces: *"failed to load the TXD archive: texture splash3 has an invalid depth"*.
- **RGB vs BGRA Byte Order**: RenderWare Direct3D raster payloads require little-endian BGRA channel ordering; storing RGB results in blue/red color inversion.
- **2048-Byte Sector Alignment**: Files inside `gta3.img` must be aligned to 2048-byte sector boundaries; unpadded files corrupt subsequent archive offsets.
- **Texture Name Truncation**: Texture names inside TXD native headers are strictly 32 bytes null-padded; strings exceeding 31 characters overflow the header.
- **D3D9 TXD in a GTA III package**: A TXD with platform `9` (San Andreas format, as exported by DragonFF-era tooling) imports without a ModLoader error, then leaves its models invisible. Blender and Ariane still render it. Convert it to platform `8` before packaging.
- **`deno task build` in the sandboxed shell**: Fails with `Loading unprepared module ... change-case`. Run `deno task build` and `deno task install` in a Terminal panel tab instead.
