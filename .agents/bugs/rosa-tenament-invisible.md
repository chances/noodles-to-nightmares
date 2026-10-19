# Bug Investigation: Rosa's Apartment Model Invisible in GTA III

**Status**: Open  
**Affected Model**: `rosa_apartment` (ID `3154` in `data/maps/noodles/custom.ide`)  
**Occurrence**: In-game (Portland, Liberty City). The building geometry does not render, while collision may be loaded and the asset renders correctly in external tools (Blender, [gtastuff.com/viewer](https://gtastuff.com/viewer)).

---

## 1. Symptoms & Observed Behavior

- Model is totally invisible in-game at its placement coordinates (`custom.ipl`: `1160.770020, -407.515015, 29.460000`).
- Model renders completely in Blender (Cycles/EEVEE) and in WebGL RenderWare tools ([gtastuff.com/viewer](https://gtastuff.com/viewer)).
- `modloader.log` confirms the game streams and imports both assets cleanly:
  ```text
  Importing model file for index 3154 at "modloader\noodles\models\gta3.img\rosa_apartment.dff"
  Importing model file for index 6071 at "modloader\noodles\models\gta3.img\rosa_apartment.txd"
  ```
- No engine crash or missing texture error reported on boot.

---

## 2. Hypotheses Tested & Tooling Improvements Made

### A. Multi-Atomic / Multi-Frame Hierarchy (Addressed)
- **Finding**: Original `rosa_apartment.dff` exported 2 atomics across 2 frames:
  1. `Atomic 0` / Frame `rosa_apartment_l0` (apartment building)
  2. `Atomic 1` / Frame `rosa_apartment_garage` (garage structure)
- **Comparison**: Vanilla static building assets (e.g. `ind_newtenement08.dff`) contain strictly 1 frame and 1 atomic. `custom.ide` defines `MeshCount = 1`.
- **Fix Implemented**: Updated [`scripts/export-blend-models.py`](../../scripts/export-blend-models.py) to automatically duplicate, transform, and merge all render-enabled mesh subitems into a singular unified atomic with identity transform at origin `(0, 0, 0)`.
- **Result**: `rosa_apartment.dff` now exports as 1 frame, 1 atomic, and 1 geometry (452 tris, 682 verts). However, the model remains invisible in-game.

### B. Texture Name Truncation by DragonFF (Addressed)
- **Finding**: The 15th material (`billboard`) exported texture name `"rosa_apartment"` into the DFF instead of `"billboard"` because the image node label was blank, causing DragonFF's `clear_extension()` to truncate at `.txd` from `rosa_apartment.txd/billboard/0`.
- **Fix Implemented**: Auto-synchronized image texture node labels in [`scripts/export-blend-models.py`](../../scripts/export-blend-models.py) and directly in [`Rosa's Apartment.blend`](../../models/Rosa's%20Apartment/Rosa's%20Apartment.blend). DFF now cleanly requests texture `"billboard"`.

### C. Texture Sampler & Addressing Properties (Addressed)
- **Finding**: `billboard` material had `dff.tex_filters = 0` (invalid filter) and `dff.tex_u_addr = 0`, `dff.tex_v_addr = 0` (invalid addressing), whereas vanilla GTA III materials use `6` (Linear Mipmap Linear) and `1` (Wrap).
- **Fix Implemented**: Updated `billboard` material properties in Blender to `tex_filters = 6`, `tex_u_addr = 1`, `tex_v_addr = 1`.

### D. Automated Model Build Pipeline (Addressed)
- **Tooling Enhancement**: Updated [`scripts/build.ts`](../../scripts/build.ts) Step 3 to read [`models/manifest.csv`](../../models/manifest.csv), automatically invoke `scripts/export-blend-models.py` for any `.blend` file in enabled model folders, and patch the 22-byte internal COLL model header.

### E. DFF Byte-Level Inspection Tooling (Added)
- **Tooling Enhancement**: Created [`scripts/inspect-dff.py`](../../scripts/inspect-dff.py) powered by DragonFF's `dff` library. Parses and reports Clump RenderWare version, frame tree, geometry flags, prelit alpha ranges (detecting 0-alpha verts), triangle/vertex counts, exact bounding sphere, vertex extents (min/max bounds on X/Y/Z), material texture mappings, and atomic flags.

---

## 3. Leading Hypothesis: RenderWare Version Mismatch in DFF Export

- **Discovery**: Comparing extracted vanilla GTA III assets (`ind_newtenement08.dff`, `ind_newbuilds03.dff`) against `rosa_apartment.dff`:
  - **Vanilla Models**: RW Version `204800` (`0x32000`, library ID `0x0800FFFF`).
  - **Exported Model**: RW Version `208898` (`0x33002`, library ID `0x0C02FFFF`).
- **Structural Difference in RenderWare Clump Stream**:
  - In DragonFF (`gtaLib/dff.py` lines 2703, 2886):
    - For `version < 0x33000` (e.g. `0x32000`): The Clump data struct contains strictly **4 bytes** (`num_atomics`).
    - For `version >= 0x33000` (e.g. `0x33002`): The Clump data struct contains **12 bytes** (`num_atomics`, `num_lights`, `num_cameras`).
  - Vanilla GTA III PC stream reader expects the 4-byte clump struct. When fed `0x33002`, the 8 extra bytes in the clump struct displace chunk stream alignment or cause early reader failure.
- **Action**: Update `version` in [`scripts/export-blend-models.py`](../../scripts/export-blend-models.py) from `0x33002` to `0x32000` (`v3.2.0.0` / `0x0800FFFF`), rebuild, and re-test.

---

## 4. Secondary Remaining Potential Causes

1. **Atomic Collision Test Flag**: Vanilla models use atomic flags `0x5` (`rpATOMICCOLLISIONTEST | rpATOMICRENDER`), whereas DragonFF exports `0x4` (`rpATOMICRENDER`).
2. **Frustum Culling / Bounding Sphere**: Merged geometry bounding sphere is centered at `(0.118, 13.171, -0.071)` with radius `43.519`. Ensure the expanded radius does not fail engine sector culling.
3. **IPL / IDE Model Type Configuration**: Check draw distance (`300.0` vs vanilla `115.0`) or map sector occlusion.
