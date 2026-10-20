# Workspace Memory

## File Naming
- Always use dashes (`-`), never underscores (`_`), for file names (kebab-case, e.g., `lighting-and-color.md`, `color-swatches.csv`).

## Visual Identity & Building Remodels
- City exterior remains 100% vanilla GTA III 2001 gritty noir.
- Storefront signs and regional billboards anchor narrative.
- Interior remodels are strictly bounded:
  - Island 1: Punk Noodles, Rosa's Apartment, Marco's Bistro, SupaSave.
  - Island 2: Staunton Ammu-Nation (shooting range), Newport Docks Warehouse (Heist Pt 1), Bedford Point Penthouse (safehouse).
  - Island 3: Pike Creek Industrial Vault (The Crown Jewel), Cedar Grove Syndicate Villa (climax), Cochrane Dam Control Room (standoff arena).
- Protagonist Rosa Chang is a retextured vanilla ped (Asuka/Maria).
- UI: Vanilla HUD; custom splash/title/loading screens.
- Lighting & Baking: `Prelit` vertex colors for broad light fills; Cycles diffuse bakes into `.txd` for complex emission/shadows. Reference: `docs/lighting-and-color.md`, `docs/color-swatches.csv`, `docs/color-swatches.html`.

## Billboard & In-Universe Ad Design
- Commercial parody ads must look authentic, clean, and professional—not like cartoonish scams.
- Avoid greasy salesman caricatures; use relatable everyday working-class customers or bold money graphics.
- High-contrast primary palettes, heavy readable sans-serif typography, and clear calls to action (e.g. phone/kiosk).
- Satire lives in the absurd terms, rates (e.g. "400% APR"), and fine-print disclaimers.

## Scripts & Utility Tooling
- All automation, diagnostic, texture unwrapping, and data scripts belong in `./scripts/` (e.g. `scripts/unwrap-billboard.py`).
- Always use kebab-case for script filenames (`script-name.py`).
- Never run inline multi-line Python scripts via `python -c`; save them to `./scripts/` and invoke the file.

## Texture Perspective Rectification
- When unwrapping perspective mockups (billboards, signs) into flat game textures, match Photoshop's Perspective Crop Tool.
- Identify the 4 true quadrilateral corner vertices (`TL`, `TR`, `BR`, `BL`) and map them directly using homography (`cv2.getPerspectiveTransform` and `cv2.warpPerspective`).
- Do not apply affine rotation after perspective transformation; post-warp rotation tilts the rectangular canvas and shears/clips corners.

## Publishing & Corporate Attribution
- **Imprint & Parent**: Coldstart Computer Entertainment, a d.b.a. subsidiary of Snow Developments (Snow Developments, LLC) — https://snowdevelopments.co.
- **Strictly Out-of-Universe**: Attribution is restricted to external docs, build archives, release metadata, and splash/loading screens. No in-universe commercial or lore presence in Liberty City.
- **Reference**: `docs/publishing.md`.

## Badge Geometry & Proportions Matching
- Never assume companion publisher/platform badges are 1:1 squares.
- Always inspect the reference logo's exact pixel footprint, aspect ratio, and corner curvature (e.g. Rockstar Games tile on the splash screen is `45x41` px, aspect ratio `1.0976`, corner radius `7` px).
- Match dimensions, radii, baseline alignment, and gutters (14-15 px) directly.

## File Tool Discipline & Surgical Edits
- **Strictly Use Built-in Tools**: Use `view_file` for reading and `replace_file_content` for surgical chunk edits. Never overwrite whole files.
- **No Terminal File Gymnastics**: NEVER use PowerShell pipelines (`Select-String`, `Get-Content`), shell redirection, or inline Python/Node scripts (`python -c "import shutil..."`) to read, search, copy, or modify files.
- **Git Restrictions**: Never inspect or manipulate `git stash` without explicit instruction.
- **Dedicated Scripts**: Tooling belongs in formal scripts under `./scripts/` (e.g. `scripts/install.ts`, `scripts/manage-txd.py`), invoked directly.

## Project Skills & Asset Locations
- **Skills Location**: Repository skills must be saved in `.agents/skills/<skill-name>/SKILL.md` (e.g. `.agents/skills/txd-importing/SKILL.md`), never in global runtime folders.
- **Startup & Boot Splash Screens**: The game boot background and title screens (with character lineup and legal notice) are strictly `txd/mainsc1.txd` and `txd/mainsc2.txd` (`1024x1024 @ 8bpp PAL8`, internal texture names `mainsc1` and `mainsc2`).
- **Borough Transition Splash Screens**: Portland boot uses `txd/SPLASH1.TXD` (`512x256 @ 8bpp PAL8`, internal texture name `splash1`). Staunton uses `SPLASH2.TXD` and Shoreside Vale uses `splash3.txd`.
- **New Game & Save Load Screens**: Vanilla PC cycles through a 24-entry lookup array (`loadsc1`..`loadsc25`, `512x512 @ 8bpp`); `loadsc0` is never indexed. All `LOADSC0.TXD` through `LOADSC25.TXD`, `mainsc1..2.txd`, and `SPLASH1..3.TXD` (31 total) are generated via `scripts/build-splash-screens.py` and deployed with SHA-256 verification by `deno task install`.
- **Asset Verification Discipline**: Never guess asset filenames or assume writes succeeded. When the user reports an asset did not update, extract/dump the active game texture directly to verify its visual content, and ensure deployment scripts validate cryptographic checksums.

## Mod Installation, Packaging & Game Runner
- **ModLoader Runtime Packaging**: All mod assets are packaged strictly into `dist/Drag-N-Drop.zip` under `modloader/Noodles/` (`data/main.scm`, `cleo/*.cm`, `models/gta3.img/`, `data/maps/`, `noodles_custom.txt`, `txd/`). Base ModLoader system files (`modloader/.data/`, `modloader.ini`) and video overrides (`movies/GTAtitles.mpg`) reside at the archive root.
- **Installer Cleanup**: `scripts/install.ts` removes `[gta3]/modloader/Noodles` before unpacking `dist/Drag-N-Drop.zip` to prevent unmanifested or disabled assets from persisting in the game.
- **Model Manifest Discipline**: `models/manifest.csv` (`name,folder,dff,txd,col,col_level,enabled`) controls which models are compiled and packaged into `models/gta3.img/`.
- **Build Pipeline Model Compilation**: `scripts/build.ts` Step 3 automatically compiles `.blend` models for enabled manifest entries via `scripts/export-blend-models.py` and patches the internal 22-byte COLL model header to match `entry.name`.
- **Map & Collision Injection**:
  - In GTA III, custom map object collisions must NOT be placed in `models/gta3.img` (causes streaming install/uninstall conflicts); they belong in `data/maps/noodles/col/` registered via `COLFILE <level>` in `data/noodles_custom.txt`; `build.ts` step 4 writes the level from the manifest `col_level` column.
  - The internal COLL model name in the 22-byte archive header must strictly match the IDE model name (e.g. `rosa_apartment`, not `rosa_apartment.col`).
  - `build.ts` automatically synchronizes `data/noodles_custom.txt` against `models/manifest.csv`, commenting out disabled collision files before packaging.
  - Any model instantiated in `custom.ipl` must be declared in `custom.ide` and present in `gta3.img`, otherwise the engine dereferences a null `pColModel` at `0x0047402D`.
  - `data/maps/noodles/col/*.col` are git symlinks (mode `120000`) to the COL artifacts under `models/<folder>/`; `build.ts` step 4 copies with `copyFollowingSymlinks` so the zip holds real files.
  - Manifest `name` is the IDE model name. `dff` and `col` are the source file names inside the model folder (the exporter writes `<collection>.dff`, e.g. `rosa_apartment.dff`); `build.ts` stages them as `<name>.dff` and `<name>.col` (e.g. `ind_newtenement08.dff`), and `noodles_custom.txt` `COLFILE` lines use `<name>.col`. The stock COL archive entry for `ind_newtenement08` is in `data/maps/industne/INDUSTNE.col`.
  - `build.ts` step 4 writes each manifest folder's `*.pos` (`x y z`) into the matching `custom.ipl` `inst` line (matched by the `dff` basename). Without a `*.pos`, `custom.ipl` stays the source of truth. `custom.ide` has no coordinates and is never synced.
  - Stock `ind_newtenement08` is ID `445` (`industne.ide`: `445, ind_newtenement08, inditaly1, 1, 115, 0`), already placed by `industNE.ipl` at `1160.77, -407.514, 33.3118`. An override in `custom.ide` reuses `445`; a new ID such as `3895` has no stock definition.
  - `col_level`: `ind_newtenement08` loads at `0`; `dinerind` loads at `1` (its stock entry is in `models/coll/indust.col`). `dinerind.col` at level `0` crashed at `0x00411643` with `ESI=0x16C` and `EBP=13` (13 stock boxes × 28 bytes); level `1` did not crash.
  - Collision triangles are one-sided. Run `python scripts/check-col-normals.py <file.col>`: stock and working COL floors report `facing DOWN` (z-normal sign of `(b-a)x(c-a)`); a floor reporting `UP` is wound opposite and the player falls through it. DragonFF flips winding on export, so a floor polygon needs a `+Z` normal in Blender (the in-game result of flipping is not yet recorded). `python scripts/inspect-blend-col.py <blend>` lists each COL object's modifiers and horizontal polygon counts as stored and as evaluated.
  - Blender edits reach a COL or DFF only after the `.blend` is saved and `deno task build` runs; the build skips export when the saved file's hash is unchanged.
  - `deno task install` reruns `build` without flags; for a flagged build (`--skip-asset=...`), run `deno task build --skip-asset=...`, then `scripts/install.ts` directly.
- **Build Incrementality**: `scripts/build.ts` skips unchanged work via SHA-256 hashes in `dist/.build-cache.json`: step 1 and 2 hash each script plus its `{$INCLUDE}` files; step 3 hashes each `.blend`. Outputs must still exist for a skip.
- **Build Shell**: Run `deno task build` from PowerShell. Git Bash's GNU `tar` fails the zip step with "Cannot connect to C: resolve failed"; Windows `tar` works.
- **Frontend TXDs Location**: Frontend and boot textures reside in `data/txd/` (moved from legacy `assets/`) and package into `modloader/Noodles/txd/`.
- **Step Bisection**: `scripts/build.ts` supports interactive bisection and filtering via `--bisect`, `--step=<N>`, `--only=<name>`, and `--skip=<name>`.
- **UAC Bypass Runner**: When Windows sets `WINXPSP3` on `gta3.exe` in HKLM, launching directly throws OS error 740. Hardlink runner `gta3-game.exe` bypasses the exact-path registry flag with zero UAC prompts via `deno task run`.

## Blender Model & Collision Export Architecture
- **Root Collection Naming**: Root collections named `*.dff` and `*.col` in `.blend` files define the output models.
- **Single Atomic DFF Export**: `scripts/export-blend-models.py` merges all render-enabled subitems (`hide_render == False`) into a singular unified atomic mesh with world transformations applied and root frame origin at `(0, 0, 0)`.
- **COL Export Full Scope**: For `*.col` collections, all mesh elements are exported normally (`obj.dff.type = 'COL'`, collision v1), ignoring Blender visibility flags.
- **Export Script**: Automated via `python scripts/export-blend-models.py <blend-file> [out-dir]`.
- **No World Position Compensation**: Never shift IPL or world map placement coordinates (`custom.ipl`, `.pos`) to compensate for local frame offset or unapplied mesh transforms. Model origins and root frame hierarchies must be fixed in the model itself.

## RenderWare GTA III Compatibility Constraints
- **Pipeline Plugin (`0x253F2F3`)**: In DragonFF, `obj.dff.pipeline` must be set to `NONE`. Never export with GTA SA building pipeline (`0x53F20098`), which causes GTA III to fail to bind render pipelines.
- **Night Vertex Colors (`0x253F2F9`)**: Must be disabled (`night_cols = False`). GTA III does not support SA night vertex colors plugin.
- **Collision Plugin (`0x253F2FA`)**: Must not be embedded in DFF (`export_coll = False`). GTA III map objects require external `.col` files.
- **Version**: Export version must strictly target GTA III PC `0x32000` (RenderWare v3.2.0.0 / library ID `0x0800FFFF`), matching all vanilla GTA III models. Do NOT use `0x33002`; DragonFF writes a 12-byte clump struct `(num_atomics, num_lights, num_cameras)` for versions `>= 0x33000`, whereas GTA III PC expects the 4-byte clump struct `(num_atomics)` emitted when version is `< 0x33000` (`0x32000`).
- **Texture Dictionary Platform**: A model's `.txd` must be Direct3D 8 (platform `8`, device `0`, stamp `0x320`). A Direct3D 9 TXD imports without error but leaves its models invisible; convert it with `scripts/convert-txd-d3d9-to-d3d8.py <in.txd> <out.txd>`. See [`reports/bugs/rosa-tenament-invisible.md`](reports/bugs/rosa-tenament-invisible.md).
- **Inspection Tooling**: Use `scripts/inspect-dff.py <model.dff>` to inspect RW version, clump frame hierarchy, geometry vertex/triangle bounds, prelit alpha ranges, texture references, and atomic flags.
- **DragonFF Material Mapping**: Image texture nodes must have clean `node.label` values matching texture names to prevent DragonFF's `clear_extension` from truncating `.txd` prefixes into model texture names. Sampler properties must be set to `tex_filters = 6` (Linear Mipmap Linear) and `tex_u_addr = tex_v_addr = 1` (Wrap).

## Known Issues & Open Bugs
- None open. Resolved bugs live in [`.agents/reports/bugs/`](reports/bugs/).

## Host Disk Constraints
- **Drive C: Free Space**: Drive `C:` has critically low free disk space (~110 MB free). Never write large temporary archive duplicates or run operations that balloon storage on `C:\`.
