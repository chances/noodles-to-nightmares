---
name: modloader-guidance
description: Use when packaging, configuring, or organizing GTA III mods for ModLoader, creating custom map or model packages, merging data files, or debugging asset injection
---

# ModLoader Package Guidance for GTA III

## Overview
ModLoader (by LINK/2012) injects and merges game modifications on the fly at runtime without modifying original game archives (`gta3.img`, `gta3.dat`, or `data/` files).

## When to Use
- Packaging custom `.dff`, `.txd`, or `.col` assets for GTA III.
- Injecting custom map definitions (`.ide`, `.ipl`, `.col`) via non-destructive runtime merging.
- Adding custom splash screens (`txd/`), movies (`movies/`), CLEO scripts (`cleo/`), or text strings (`.fxt`, `.gxt`).
- Configuring mod priorities, exclusions, or profile overrides in `modloader.ini`.
- When NOT to use: Compiling Sanny Builder mission scripts (`.cm`/`.scm`) or authoring 3D geometry in Blender.

---

## Package Directory Hierarchy

Every mod package must reside in its own named subfolder under `modloader/`. Loose files directly in the root of `modloader/` or within `.data/` are ignored.

```text
modloader/
├── .data/                           # Internal ModLoader system & plugins (DO NOT TOUCH)
├── modloader.ini                    # Global profile and priority configuration
│
└── <Package-Name>/                  # Isolated mod folder (e.g. "Noodles to Nightmares" or "Ariane")
    ├── <readme-or-manifest>.txt     # gta3.dat directives for custom maps (IDE, IPL, COLFILE)
    ├── models/
    │   └── gta3.img/                # Streamed model overrides (.dff, .txd, .col)
    │       ├── rosa_apartment.dff
    │       └── rosa_apartment.txd
    ├── data/
    │   ├── maps/
    │   │   ├── custom.ide           # Item Definition: objs IDs, models, txds, draw distances
    │   │   ├── custom.ipl           # Item Placement: object instances, coordinates, rotations
    │   │   └── cols/
    │   │       └── custom.col       # Collision archive
    │   ├── handling.cfg             # Merged automatically line-by-line
    │   └── default.ide              # Overridden or merged
    ├── txd/                         # UI and splash sprites (.txd)
    │   ├── splash1.txd
    │   └── mainsc1.txd
    ├── movies/                      # Intro/title videos
    │   └── GTAtitles.mpg
    └── cleo/                        # CLEO scripts (.cm, .cs) and plugins (.asi)
        └── custom_script.cm
```

---

## Subsystem Plugins & Handled Assets

ModLoader delegates file injection across specialized internal plugins:

| Plugin | Primary Files | Package Folder Convention | Merging Behavior |
| :--- | :--- | :--- | :--- |
| **`std.stream`** | `.dff`, `.txd`, `.col`, `.ipl` (binary) | Loose in mod folder, or inside `models/gta3.img/` or `<archive>.img/` | Overrides existing entries in `gta3.img`; streams custom entries |
| **`std.data`** | `.ide`, `.ipl` (text), `.dat`, `.cfg` | `data/` or matching game paths; data directives in text manifests | Merges lines by object ID/name (`handling.cfg`, `carcols.dat`, `objs`) |
| **`std.sprites`** | Script/UI `.txd` files | Must be inside `txd/` folder (e.g. `txd/loadsc1.txd`, `txd/splash3.txd`) | Overrides base game `txd/` folder files |
| **`std.text`** | `.gxt`, `.fxt` | Loose or inside `cleo_text/` / `text/` | Merges string tables into game text memory |
| **`std.scm`** | `main.scm` | Root or `data/` folder | Replaces main game script |
| **`std.movies`**| `.mpg` videos | Must be inside `movies/` folder | Overrides game movies |
| **`std.asi`** | `.asi`, `.dll` | Root of mod package or `scripts/` | Loads ASI plugins dynamically |

---

## Custom Map Injection Pattern (`std.data`)

In GTA III, custom map files (`.ide`, `.ipl`, `.col`) are ignored unless registered with the game's data loader (`gta3.dat`). ModLoader's `std.data` plugin parses `gta3.dat` directives directly out of mod text or manifest files (e.g. `<package>_custom.txt` or `manifest.txt`).

### Manifest File Format
Place a text file (e.g. `manifest.txt`) at the root of the mod package:

```text
IDE data/maps/custom.ide
IPL data/maps/custom.ipl
COLFILE 0 data/maps/cols/custom.col
```

- **`IDE`**: Points to the mod's `.ide` file containing object definitions (`objs`).
- **`IPL`**: Points to the mod's `.ipl` file containing object instances (`inst`).
- **`COLFILE 0`**: Registers the custom collision archive for island/borough 0 (universal/shared).

---

## Priority & Configuration (`modloader.ini`)

When two mod packages provide the same file (e.g. a map fix overriding a vehicle texture), priority defines which package wins:

```ini
[Folder.Config]
Profile = Default
PriorityLimit = 100

[Profiles.Default.Priority]
; Default priority is 50. Higher values override lower ones.
Ariane = 60
BaseMap = 40

[Profiles.Default.IgnoreMods]
; Mod folder names matching this wildcard are skipped completely
_disabled_*
backup
```

- Priority `0` completely ignores the mod.
- Priority `1` to `100` controls precedence (higher numbers win conflicts).

---

## Common Mistakes

| Mistake | Consequence | Correction |
| :--- | :--- | :--- |
| **Loose files in `modloader/` root** | ModLoader ignores files outside a mod folder | Always create a dedicated subfolder (e.g. `modloader/MyMod/`) |
| **Placing files in `modloader/.data/`** | ModLoader skips `.data/` as a system directory | Never place user mods in `.data/` |
| **Omitting `IDE`/`IPL` manifest directives** | `custom.ide` and `custom.ipl` are never loaded | Add `manifest.txt` with `IDE` and `IPL` directives |
| **Missing `txd/` parent for splash screens** | `splash1.txd` or `mainsc1.txd` are ignored by `std.sprites` | Place UI textures strictly in `<package>/txd/` |
| **Embedding SA collision in DFF** | Models cull or crash in GTA III RenderWare | Use external `.col` archives registered via `COLFILE` |
| **Hardcoded absolute paths in manifests** | Fails on other machines or installations | Use relative paths from package root (e.g. `data/maps/custom.ide`) |
