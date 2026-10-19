---
name: txd-importing
description: Use when building, reading, or importing RenderWare TXD textures, game startup splash screens, or managing GTA III and Vice City img archives
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
