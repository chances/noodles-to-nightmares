#!/usr/bin/env python3
"""Slice the exact inner graphic of the billboard (excluding all outer frame and girders)."""

import cv2
import numpy as np


def main():
    img = cv2.imread("docs/fast-cash-billboard.jpg")
    
    # Let's inspect the 4 corners of the inner poster rectangle:
    # In fast-cash-billboard.jpg:
    # 1. Top-Left: inside the black outline of the yellow field
    # 2. Top-Right: inside the black outline near the top-right corner
    # 3. Bottom-Right: inside the black outline at the bottom-right of the red field
    # 4. Bottom-Left: inside the black outline at the bottom-left of the red field
    
    # Let's measure where the inner black border line sits:
    # At Top-Left: x ~ 222, y ~ 92
    # At Top-Right: x ~ 1138, y ~ 143
    # At Bottom-Right: x ~ 1106, y ~ 534
    # At Bottom-Left: x ~ 238, y ~ 654
    
    src_pts = np.float32([
        [223.0, 93.0],    # Inner Top-Left
        [1138.0, 143.0],  # Inner Top-Right
        [1108.0, 534.0],  # Inner Bottom-Right
        [240.0, 654.0]    # Inner Bottom-Left
    ])

    out_w, out_h = 1024, 512
    dst_pts = np.float32([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]])

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img, matrix, (out_w, out_h), flags=cv2.INTER_LANCZOS4)

    # Measure horizontal line angles in the text
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=150, maxLineGap=15)
    
    angles = []
    if lines is not None:
        for l in lines:
            pts = l.reshape(-1)
            x1, y1, x2, y2 = pts[0], pts[1], pts[2], pts[3]
            ang = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if -8 < ang < 8:
                angles.append(ang)
                
    mean_angle = np.mean(angles) if angles else 0.0
    print(f"Text tilt: {mean_angle:.3f} deg")
    
    # If residual tilt exists, rotate so text baselines are horizontal (0.00 deg)
    if abs(mean_angle) > 0.02:
        rot_mat = cv2.getRotationMatrix2D((out_w / 2, out_h / 2), mean_angle, 1.0)
        warped = cv2.warpAffine(warped, rot_mat, (out_w, out_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
        print(f"Applied rotation: {-mean_angle:.3f} deg")

    cv2.imwrite("models/Rosa's Apartment/billboard.jpg", warped, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    print("Updated models/Rosa's Apartment/billboard.jpg")


if __name__ == "__main__":
    main()
