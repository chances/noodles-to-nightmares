#!/usr/bin/env python3
"""Unwrap and perspective-rectify angled billboard mockups into flat game textures."""

import argparse
import sys
import cv2
import numpy as np


def unwrap_billboard(input_path: str, output_path: str, out_w: int = 1024, out_h: int = 512):
    img = cv2.imread(input_path)
    if img is None:
        print(f"Error: Could not load image from '{input_path}'", file=sys.stderr)
        sys.exit(1)
    # Exact 4 corners of the billboard poster face matching Photoshop Perspective Crop:
    # Top-Left, Top-Right, Bottom-Right, Bottom-Left
    src_pts = np.float32([
        [239.0, 98.0],    # TL
        [1139.0, 145.0],  # TR
        [1112.0, 514.0],  # BR
        [270.0, 666.0]    # BL
    ])


    dst_pts = np.float32([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]])

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img, matrix, (out_w, out_h), flags=cv2.INTER_LANCZOS4)

    cv2.imwrite(output_path, warped, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    print(f"Successfully unwrapped {input_path} -> {output_path} ({out_w}x{out_h})")


def main():
    parser = argparse.ArgumentParser(description="Unwrap angled billboard mockups into flat game textures")
    parser.add_argument("--input", "-i", default="docs/fast-cash-billboard.jpg", help="Source billboard mockup image")
    parser.add_argument("--output", "-o", default="models/Rosa's Apartment/billboard.jpg", help="Target texture path")
    parser.add_argument("--width", "-W", type=int, default=1024, help="Output texture width (default: 1024)")
    parser.add_argument("--height", "-H", type=int, default=512, help="Output texture height (default: 512)")

    args = parser.parse_args()
    unwrap_billboard(args.input, args.output, args.width, args.height)


if __name__ == "__main__":
    main()
