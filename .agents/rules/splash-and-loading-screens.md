# GTA III Splash & Loading Screen Architecture

- **Main Menu & Boot Splash Screens**: The game boot background and title screens (with character lineup and legal notice) are strictly `txd/mainsc1.txd` and `txd/mainsc2.txd` (`1024x1024 @ 8bpp PAL8`, internal texture names `mainsc1` and `mainsc2`).
- **Borough Transition Splash Screens**: Portland boot uses `txd/SPLASH1.TXD` (`512x256 @ 8bpp PAL8`, internal texture name `splash1`). Staunton uses `SPLASH2.TXD` and Shoreside Vale uses `splash3.txd`.
- **Loading Screens Cycle**: Vanilla GTA III PC cycles through a hardcoded 24-entry lookup table (`0x0048d6a0`) referencing `loadsc1` through `loadsc25` (`512x512 @ 8bpp PAL8`). `loadsc0` is never selected by the engine's loading routine.
- **Full Coverage & Verification**: All 31 screens (`mainsc1..2.txd`, `SPLASH1..3.TXD`, `LOADSC0..25.TXD`) are rows in `data/txd/manifest.csv`; `deno task build` rebuilds a row when its source JPG changes (or run `scripts/build-splash-screens.py`). `scripts/install.ts` strictly verifies SHA-256 hashes against target files on installation.
