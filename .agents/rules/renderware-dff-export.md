# RenderWare DFF Model Export Rules

- **Target Version**: DFF export version must strictly be `0x32000` (RenderWare v3.2.0.0 / library ID `0x0800FFFF`).
  - *Why*: DragonFF emits a 12-byte Clump struct (`num_atomics, num_lights, num_cameras`) for versions `>= 0x33000` (like `0x33002`), whereas GTA III PC expects the 4-byte Clump struct (`num_atomics`) written only when version is `< 0x33000`.
- **Single Atomic Architecture**: All render-enabled mesh elements in a `.dff` collection must be merged into a singular atomic with world transformations applied and root frame at origin `(0, 0, 0)`.
- **Texture Naming**: Always ensure image texture nodes have explicit labels matching the texture name to prevent DragonFF from truncating `.txd` file prefixes into model texture names.
- **Material Samplers**: Set `tex_filters = 6` (Linear Mipmap Linear) and `tex_u_addr = tex_v_addr = 1` (Wrap).
- **Plugins**: Set `pipeline = 'NONE'` and `night_cols = False`. Do not embed collision plugins (`export_coll = False`).
- **Collision Face Normals**: Every floor and roof in a `*.col` collection needs its normal pointing outward (`+Z` for a floor). After export, run `python scripts/check-col-normals.py <file.col>`; stock floors report `facing DOWN`, and a floor reporting `facing UP` is wound opposite to stock.
- **Collision Inspection**: `python scripts/inspect-blend-col.py <model.blend>` lists each COL object's modifiers and its horizontal polygon counts as stored and as evaluated (modifiers such as Boolean add or cut faces at export).
- **Inspection**: Use `python scripts/inspect-dff.py <model.dff>` to verify RW version, clump frame hierarchy, vertex extents, prelit alpha ranges, and materials.
