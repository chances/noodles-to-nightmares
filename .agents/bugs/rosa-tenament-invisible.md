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

### F. Vanilla Asset Byte-Level Comparison (Completed)
- **Finding**: Inspected vanilla baseline [`models/Rosa's Apartment/ind_newtenement08.dff`](../../models/Rosa's%20Apartment/ind_newtenement08.dff) using [`scripts/inspect-dff.py`](../../scripts/inspect-dff.py).
- **Results**:
  - RW Version: `208898` (`0x33002` / RenderWare 3.3.0.2).
  - Structure: 1 Frame (`ind_newtenement08_l0`, parent `-1`), 1 Geometry (`flags: 0x1002E`, 452 tris, 683 verts), 1 Atomic (`flags: 0x4`).
  - Bounding Sphere: Center `(0.118, 13.171, -0.071)`, radius `43.519`.
  - Geometry Extents: X `(-25.01, 25.24)`, Y `(-6.66, 33.00)`, Z `(-14.53, 14.39)`.
- **Conclusion**: Exported [`rosa_apartment.dff`](../../models/Rosa's%20Apartment/rosa_apartment.dff) matches the vanilla asset in RW version (`208898`), geometry flags (`0x1002E`), atomic flags (`0x4`), frame count (`1`), and bounding extents. RW version `208898` is **not** the cause of invisibility.

### G. Texture Inspection Script Correction (Completed)
- **Finding**: Fixed material texture lookup in [`scripts/inspect-dff.py`](../../scripts/inspect-dff.py) to inspect `m.textures[0]` rather than `m.texture`.
- **Result**: Confirmed all 15 textured materials in `rosa_apartment.dff` cleanly map to textures (`concrete_64HV`, `tenwhitebrick64`, `billboard`, etc.) with zero null or corrupted texture references.

### H. Draw Distance Lowering (Tested - Ruled Out)
- **Test**: Reduced draw distance in [`custom.ide`](../../data/maps/noodles/custom.ide) from `300.0` to `160.0` to match vanilla `ind_newtenement08`.
- **Result**: Manual smoke-test confirmed the model remains invisible. Draw distance ceiling is not the cause.

### I. IPL Explicit Float Formatting (Tested - Ruled Out)
- **Test**: Formatted scale values explicitly as floats (`1.0, 1.0, 1.0`) in [`custom.ipl`](../../data/maps/noodles/custom.ipl).
- **Result**: Manual smoke-test confirmed the model remains invisible. Coordinate / scale token typing is not the cause.

### J. TXD Square Billboard Texture (Tested - Ruled Out)
- **Test**: Resized `billboard.jpg` to square power-of-two dimensions and re-imported into [`rosa_apartment.txd`](../../models/Rosa's%20Apartment/rosa_apartment.txd).
- **Result**: Manual smoke-test confirmed the model remains invisible. Texture aspect/dimension in TXD is not the cause.

---

## 3. Active Investigation: World Sector Culling & Vanilla Building Overlap

### Hypothesis 4: World Sector Culling & Vanilla Building Overlap
- **Evidence**:
  - Position `(1160.770020, -407.515015, 29.460000)` coincides with Portland's existing tenement block where vanilla `ind_newtenement08` resides.
  - In GTA III, if the vanilla building instance is not removed or if the area falls inside a pre-compiled occlusion/cull zone, sector culling or z-buffer / bounding-box overlap may hide the newly instantiated model.
  - Alternatively, island streaming zones or binary IPL (`.ipl` in `gta3.img`) sector instances might override or cull custom text IPL instances in the same world bounding cell.
- **Action Plan**:
  1. **Open Coordinate Isolation**: Spawn `rosa_apartment` at an open test coordinate with no nearby geometry (e.g. Portland beach / docks: `880.0, -600.0, 15.0` or Portland safehouse courtyard) to verify if the asset renders outside the tenement sector.
  2. **Vanilla Instance Replacement**: Identify and remove / cull the original `ind_newtenement08` instance from Portland's placement.
