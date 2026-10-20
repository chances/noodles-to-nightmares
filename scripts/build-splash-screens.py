#!/usr/bin/env python3
"""
build-splash-screens.py

Generates every splash (SPLASH1..3.TXD), loading (LOADSC0..25.TXD), and menu (mainsc1..2.txd) TXD
listed in data/txd/manifest.csv from its source JPG.
"""

from pathlib import Path
import sys

import importlib.util

spec = importlib.util.spec_from_file_location("manage_txd", Path(__file__).parent / "manage-txd.py")
manage_txd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manage_txd)
build_txd_from_image = manage_txd.build_txd_from_image

PROJECT_ROOT = Path(__file__).parent.parent
TXD_DIR = PROJECT_ROOT / "data" / "txd"

def main():
    manifest = TXD_DIR / "manifest.csv"
    if not manifest.exists():
        print(f"Error: Manifest not found: {manifest}")
        sys.exit(1)

    manage_txd.build_manifest(manifest)
    print("\nAll TXDs in data/txd/manifest.csv generated successfully.")

if __name__ == "__main__":
    main()
