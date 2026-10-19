# Publishing & Distribution Specifications

## 1. Publishing Entity & Corporate Hierarchy

- **Publishing Imprint**: **Coldstart Computer Entertainment**
- **Corporate Parent**: A d.b.a. subsidiary of **Snow Developments** (**Snow Developments, LLC**)
- **Official Website**: [https://snowdevelopments.co](https://snowdevelopments.co)
- **Role**: Publisher, distribution coordinator, and build packager for *Noodles to Nightmares*.

---

## 2. In-Universe / Lore Policy

- **Strictly Out-of-Universe**: Attribution and branding for Coldstart Computer Entertainment and Snow Developments are strictly limited to external documentation, build archives, release metadata, and out-of-universe splash/loading screens.
- **No In-Game Lore Pollution**: No in-universe commercial fronts, tech billboards, or radio ads shall carry Coldstart or Snow Developments names within Liberty City to preserve period-accurate 2001 immersion.

---

## 3. Splash Screen & Title Attribution Specs

In title cards and splash screens (such as [`docs/rosa-title-splash.jpg`](file:///c:/Users/enigm/Documents/GTA%203/Projects/Noodles%20to%20Nightmares/docs/rosa-title-splash.jpg)):
- **Bottom Left**: Take-Two Interactive (`T2`) badge.
- **Bottom Right**:
  - **Coldstart Computer Entertainment**: Electric royal blue rounded tile badge (`#2563EB`) housing the signature white snowflake emblem, sized at 45x41 px (7px corner radius, matching the exact 1.098 aspect ratio and footprint of the adjacent Rockstar Games badge).
  - **Rockstar Games**: Canonical orange-yellow square badge (`#D98A1D`) with black "R" and white star.
  - **Spacing**: 14px horizontal gutter between Coldstart and Rockstar tiles.

---

## 4. Legal & Fair-Use Disclaimers

> **Disclaimer**: *Grand Theft Auto*, *Grand Theft Auto III*, and associated trademarks, logos, and audio-visual assets are registered trademarks of Rockstar Games, Inc. and Take-Two Interactive Software, Inc. *Noodles to Nightmares* is an unofficial, non-commercial fan modification created for educational, creative, and historical preservation purposes under fair use. Coldstart Computer Entertainment and Snow Developments, LLC are not affiliated with, endorsed by, or sponsored by Take-Two Interactive or Rockstar Games.

---

## 5. Release Packaging & Distribution Channels

### Distribution Archive Layout (`dist/Drag-N-Drop.zip`)
```
NoodlesToNightmares_Release/
├── cleo/
│   ├── 0_tutorial.cm
│   ├── 1_shady_job.cm
│   ├── 2_proving_herself.cm
│   ├── side_debt_collect.cm
│   └── side_supply_run.cm
├── models/
│   ├── gta3.img (modified DFF/TXD/COL entries)
│   └── txd/ (loading splash & menu TXD)
├── text/
│   └── UL_TEXT.fxt
├── README.txt (Installation & credits)
└── LICENSE.txt
```

### Community Channels
- **ModDB**: Primary mod hosting and changelog releases.
- **GTAForums**: Project development thread, technical discussion, and player feedback.
- **GitHub Releases**: Tagged build artifacts and checksum hashes (`Drag-N-Drop.zip`).
