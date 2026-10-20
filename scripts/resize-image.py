"""Resize an image and save it as 24-bit BMP: resize-image.py <input> <width> <height> <output>"""
import sys
from PIL import Image

src, width, height, dest = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
Image.open(src).convert("RGB").resize((width, height), Image.Resampling.LANCZOS).save(dest, "BMP")
