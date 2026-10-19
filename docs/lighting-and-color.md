# Interior Lighting and Color Palette Guide

This guide establishes the atmospheric mood, lighting intent, and narrative progression for interior environments across Liberty City's three islands in *Noodles to Nightmares*.

---

---

## Technical Lighting Constraints & Blender Workflows

### 1. Vertex Illumination (`Prelit` Vertex Colors)
- **Engine Role**: In RenderWare / GTA III, geometry uses prelit vertex RGBA colors to simulate lighting without runtime lighting overhead.
- **Blender Setup**:
  1. Add a Vertex Color layer on your mesh named `Prelit` (or `Color` depending on DragonFF/GTA DFF exporter).
  2. Switch to **Vertex Paint Mode**. Set paint color to the target RGBA from [`color-swatches.csv`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/docs/color-swatches.csv).
  3. Paint broad ambient washes on corners, ceilings, and light falloffs around lamps.
  4. Ensure geometry has adequate tessellation around light sources to avoid coarse vertex interpolation.

### 2. Diffuse Texture Baking (Cycles Bake to `.txd`)
- **Engine Role**: For fine details (neon glow halos, complex surface reflections, intricate signage bleed), baking lighting directly into the diffuse `.txd` image prevents vertex-density dependency.
- **Blender Workflow**:
  1. Add point/spot lights with the exact palette color in Blender.
  2. In Shader Editor, select an Image Texture node pointing to your diffuse map (256x256 or 512x512).
  3. In Render Properties, set engine to **Cycles**, Bake Type to **Diffuse** (Direct + Color) or **Emit**.
  4. Hit **Bake**, then save the resulting image and import into the model's `.txd` package via TXD Workshop or MagicTXD.

---

## Island 1 Model Implementation Matrix

| Model File | Target Room / Area | Vertex Color Application | Texture Bake Application |
| :--- | :--- | :--- | :--- |
| **`models/Punk Noodles/Punk Noodles.blend`** | Dining & Kitchen | Sodium Amber (`#FFB347`) on ceiling/wall corners; Tungsten (`#FFA040`) near woks | Neon Magenta (`#FF2A6D`) bloom baked onto storefront diffuse map in `newbuildind.txd` |
| **`models/Rosa's Apartment/Rosa's Apartment.blend`** | Living room & Bed | Soft 2700K (`#F4E8C1`) radial vertex gradients around desk/bedside lamps | AO + Worn Timber (`#6E473B`) baked into `rosa_apartment.txd` floorboards |
| **`models/Marco's Bistro/Marco's Bistro.blend`** | Dining booths | Candle Amber (`#D9822B`) tight radial vertex pools over dining tables | Crimson Shadow (`#3D0C11`) multiply baked into booth fabric texture in `iten_club01.dff` |
| **`models/SupaSave/SupaSave.blend`** | Aisle & Registers | Commercial Fluorescent (`#E0F2E9`) linear strip vertex shading along ceiling rafters | Linoleum floor reflection bake into `indsupasave.txd` |

---


## Island 1: Portland — Grimy Warmth & Survival Refuge

### Atmospheric Concept
Portland is defined by dreary industrial fog, damp asphalt, and relentless rain. Custom interiors must serve as visceral sanctuaries of warmth, steam, and life, contrasting starkly with the cold exterior.

### Locations
- **Punk Noodles (Chinatown)**:
  - *Tones*: Deep sodium amber, neon magenta/hot pink, and tungsten wok glow.
  - *Feel*: Cramped, humid, fragrant, bustling refuge. Neon reflections on grease-sheened surfaces.
- **Rosa's Apartment (North Portland)**:
  - *Tones*: Soft 2700K incandescent lamplight, faded parchment walls, worn timber.
  - *Feel*: Cozy, deeply personal, tired comfort after exhausting shifts.
- **Marco's Bistro (Saint Mark's)**:
  - *Tones*: Low-wattage amber candle pools, deep burgundy upholstery, smoke-tinted gloom.
  - *Feel*: Traditional Italian mafia dining; intimate, heavy, tense.
- **SupaSave (Portland View)**:
  - *Tones*: Buzzing, slightly green-shifted cool white fluorescents with faded linoleum reflections.
  - *Feel*: Bland, mundane commercial sterility.

---

## Island 2: Staunton Island — Corporate Cold & Rising Ambition

### Atmospheric Concept
Staunton Island represents institutional power, finance, and organized syndicates. The mood shifts from survival warmth to clinical, calculating sharpness. Lighting is colder, cleaner, and more vertical.

### Locations
- **Staunton Ammu-Nation Shooting Range**:
  - *Tones*: High-lumen industrial cyan-white fluorescents, bright phosphor green exit signs.
  - *Feel*: Echoey, functional, stark, utilitarian.
- **Newport Docks Warehouse (The Heist Pt 1)**:
  - *Tones*: Overhead sodium vapor lamps carving sharp amber cones through murky navy/slate shadows.
  - *Feel*: Cavernous industrial floor, lurking danger, high-contrast hiding spots.
- **Bedford Point High-Rise Penthouse**:
  - *Tones*: Frosted architectural downlights, crisp neutral whites, slate gray walls with exterior city neon bleed.
  - *Feel*: Detached luxury, modern minimalism, symbolizing Rosa's criminal ascension.

---

## Island 3: Shoreside Vale — Terminal Stakes & Opulent Climax

### Atmospheric Concept
Shoreside Vale balances isolation against absolute authority. The lighting palette diverges into two stark poles: raw industrial fortification versus decadent mob nobility.

### Locations
- **Pike Creek Industrial Vault (The Crown Jewel)**:
  - *Tones*: Pulsing alarm amber, razor security crimson, cold monolithic cast-concrete charcoals.
  - *Feel*: Fortified, claustrophobic, intense, high-security target.
- **Cedar Grove Syndicate Villa (Final Confrontation)**:
  - *Tones*: Warm antique chandelier gold, polished dark mahogany, royal crimson carpets.
  - *Feel*: The apex of syndicate wealth and power; quiet, grand, suffocatingly authoritative.
- **Cochrane Dam Control Room (Standoff Overlook)**:
  - *Tones*: Cold cathode teal (`#3A7D8C`), turbine warning amber (`#FFAE19`), stormy dark reservoir gray (`#1C262B`).
  - *Feel*: High-altitude vertigo, hum of heavy turbines, panoramic rain-streaked window overlooking the abyss.

