---
name: visual-identity
description: Guidelines for visual identity, character models, UI branding, and building remodels.
trigger: always_on
---

# Visual Identity & Building Remodels

- **Exterior City**: Vanilla gritty 2001 noir aesthetic preserved.
- **Narrative Anchors**: Storefront signs and select regional billboards.
- **Interior Breaks**: Period-accurate RenderWare limits (256-512 textures, low-poly geometry) with heightened art direction (dense clutter, custom vertex lighting/baked warmth).
- **Protagonist**: Reskinned vanilla ped (Asuka/Maria base) keeping 100% vanilla rigging.
- **UI / HUD**: 100% vanilla in-game HUD (Pricedown font, default meters, radar); custom graphic identity reserved for splash/title/loading screens.
- **Publisher Attribution**: Out-of-universe title card badges include Coldstart Computer Entertainment (royal blue tile, white snowflake, 45x41 px, 1.098 aspect ratio) alongside Rockstar Games and Take-Two; zero in-universe commercial intrusion.
- **Approved Remodels**:
  - Portland: Punk Noodles, Rosa's Apartment, Marco's Bistro, SupaSave.
  - Staunton Island: Staunton Ammu-Nation (shooting range), Newport Docks Warehouse (Heist Pt 1), Bedford Point Penthouse (safehouse).
  - Shoreside Vale: Pike Creek Industrial Vault (The Crown Jewel), Cedar Grove Syndicate Villa (climax villa), Cochrane Dam Control Room (standoff arena).
- **Lighting Pipeline**:
  - RenderWare `Prelit` vertex colors for broad room washes, ceiling gradients, and lamp falloff.
  - Blender Cycles diffuse texture bakes into `.txd` for fine neon bloom, emission decals, and complex shadows.
