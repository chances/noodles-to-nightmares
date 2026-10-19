# Visual Identity & Remodeling Specifications

## 1. Visual Identity Core Directives

- **City Exterior**: Vanilla gritty 2001 noir aesthetic preserved.
- **Story Anchors**: Targeted storefronts, custom neon/signage, and contextual billboards (Punk Noodles, local fronts, syndicate ads).
- **Custom Interiors ("Style Breaks")**: Period-accurate technical budget (256x256 to 512x512 textures, low-poly geometry) with heightened art direction (dense clutter, custom vertex lighting/baked warmth).
- **Protagonist**: Re-skinned vanilla ped (Asuka/Maria base) keeping 100% vanilla rigging and skeletal mesh integrity.
- **UI / HUD**: 100% vanilla in-game HUD (Pricedown font, default meters, radar); custom graphic identity reserved for splash/title/loading screens.
- **Publisher Attribution**: Out-of-universe title card badges include Coldstart Computer Entertainment (snowflake emblem tile) alongside Rockstar Games and Take-Two; zero in-universe commercial intrusion (see [`docs/publishing.md`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/docs/publishing.md)).

---

## 2. Island Building Remodel Breakdown

### Island 1: Portland (Current Scope)
- **Punk Noodles**: Full restaurant interior + kitchen (operational hub).
- **Rosa's Apartment**: Northern Portland safehouse interior (cozy, personal clutter).
- **Marco's Bistro**: Mafia dining room interior remodel (tense meeting ground).
- **SupaSave**: Open retail/commercial interior.

---

### Island 2: Staunton Island (Act 2: The Rise)

| Location | Vanilla State | Approved Remodel | Narrative Role |
| :--- | :--- | :--- | :--- |
| **Staunton Ammu-Nation** | Generic retail counter | Open backroom shooting range / armory | Act 2 Combat Tutorial ("You've never handled a gun?!") |
| **Cartel / Mob Warehouse** (Newport Docks) | Flat exterior box | Bi-level warehouse interior (office overlook, crates, forklift lanes) | Mission 4: The Heist (Part 1) infiltration & escape |
| **High-Rise Safehouse / Penthouse** (Bedford Point) | Exterior facade only | Sleek modern apartment with floor-to-ceiling city views | Rosa's Act 2 upgrade safehouse; visual contrast to her cramped Portland home |

---

### Island 3: Shoreside Vale (Act 3: The Takeover)

| Location | Vanilla State | Approved Remodel | Narrative Role |
| :--- | :--- | :--- | :--- |
| **Pike Creek Industrial Vault / Depot** | Exterior facade | Heavy reinforced vault, security office, and loading dock | Mission 7: The Crown Jewel heist |
| **Cedar Grove Syndicate Mansion** | Static walled villa | Grand interior foyer, study, and secure safe room | Mission 6 & 8: Northern Front & Final Climax confrontation |
| **Cochrane Dam Control Room** | Inaccessible exterior prop | Industrial control interior overlooking reservoir | Mission 8 climax parley / high-stakes standoff arena |

---

## 3. Interior Lighting, Vertex Illumination & Bake Pipeline

Lighting and mood palettes map directly to 3D geometry in Blender for Island 1's remodeled spaces (**Punk Noodles**, **Rosa's Apartment**, **Marco's Bistro**, and **SupaSave**).

### Technical Approaches in Blender
1. **Direct Vertex Coloring (`Prelit` Vertex Colors)**:
   - **Mechanism**: Vertex Color attributes (`Col` / `Prelit`) tinted with the palette RGBA.
   - **RenderWare Integration**: Exported natively into `.dff` geometry. Blended with ambient day/night cycles at zero texture cost.
   - **Ideal For**: Broad wall washes, ambient corner occlusion, soft lamp pools, and ceiling gradients.
2. **Diffuse Texture Baking (Blender Cycles Bake)**:
   - **Mechanism**: Bake AO + colored point/spot lights onto diffuse `.txd` maps (or a secondary multiply pass) at 256x256 or 512x512.
   - **RenderWare Integration**: Baked into the single diffuse texture, eliminating low-poly vertex stepping artifacts.
   - **Ideal For**: Intricate surface details, neon sign glow halos on adjacent walls, counter-top reflections, and tight spotlight footprints.

Detailed assets and reference files:
- Technical Guide & Workflow: [`docs/lighting-and-color.md`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/docs/lighting-and-color.md)
- Vertex & Bake Mapping CSV: [`docs/color-swatches.csv`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/docs/color-swatches.csv)
- Visual Demo: [`docs/color-swatches.html`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/docs/color-swatches.html)
