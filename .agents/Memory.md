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


