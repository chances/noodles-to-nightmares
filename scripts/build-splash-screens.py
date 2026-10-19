#!/usr/bin/env python3
"""
build-splash-screens.py

Generates all GTA III frontend splash (SPLASH1..3.TXD) and loading screens (LOADSC0..25.TXD)
from docs/rosa-title-splash.jpg so that the custom mod artwork appears consistently on game boot,
island transitions, and every new game/save load.
"""

from pathlib import Path
import sys

import importlib.util

spec = importlib.util.spec_from_file_location("manage_txd", Path(__file__).parent / "manage-txd.py")
manage_txd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manage_txd)
build_txd_from_image = manage_txd.build_txd_from_image

PROJECT_ROOT = Path(__file__).parent.parent
IMAGE_SRC = PROJECT_ROOT / "docs" / "rosa-title-splash.jpg"
TXD_DIR = PROJECT_ROOT / "data" / "txd"

def main():
    if not IMAGE_SRC.exists():
        print(f"Error: Source image not found: {IMAGE_SRC}")
        sys.exit(1)

    TXD_DIR.mkdir(parents=True, exist_ok=True)

    print("Building startup & transition splash screens (512x256 @ 8bpp)...")
    for i in range(1, 4):
        name = f"splash{i}"
        dest = TXD_DIR / f"SPLASH{i}.TXD"
        build_txd_from_image(IMAGE_SRC, texture_name=name, output_path=dest, depth=8, target_size=(512, 256))

    print("\nBuilding new game & transition load screens LOADSC0..25 (512x512 @ 8bpp)...")
    for i in range(26):
        name = f"loadsc{i}"
        dest = TXD_DIR / f"LOADSC{i}.TXD"
        build_txd_from_image(IMAGE_SRC, texture_name=name, output_path=dest, depth=8, target_size=(512, 512))

    print("\nBuilding main menu splash screens mainsc1..2 (1024x1024 @ 8bpp)...")
    for i in (1, 2):
        name = f"mainsc{i}"
        dest = TXD_DIR / f"mainsc{i}.txd"
        build_txd_from_image(IMAGE_SRC, texture_name=name, output_path=dest, depth=8, target_size=(1024, 1024))

    print("\nAll splash and load screen TXDs generated successfully in data/txd/.")

if __name__ == "__main__":
    main()
