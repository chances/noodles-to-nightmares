#!/usr/bin/env python3
"""Precisely unwrap and square the billboard texture to eliminate skew."""

import cv2
import numpy as np


def measure_and_correct():
    img = cv2.imread("docs/fast-cash-billboard.jpg")
    h, w = img.shape[:2]

    # The billboard's actual 4 outer corners on the billboard face:
    # Let's inspect the corner coordinates directly.
    # Looking closely at the image:
    # Top-Left corner of billboard frame: near (213, 85)
    # Top-Right corner of billboard frame: near (1152, 137)
    # Bottom-Right corner of billboard frame: near (1122, 590) -> wait! At x=1122, the bottom red bar extends down to y=600!
    # Bottom-Left corner of billboard frame: near (244, 690) -> wait!
    
    # Let's find the 4 corners of the dark metallic outer rim of the billboard.
    # The billboard is bounded by a rusty metallic frame.
    # Let's find the lines with Hough transform on strong gradients.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 60, 180)

    # Mask to billboard area
    roi = np.zeros_like(edges)
    roi[70:720, 180:1220] = 255
    edges = cv2.bitwise_and(edges, roi)

    # Let's test a precise corner set and check the resulting unwarped text horizontality
    # In the rectified image, the text lines "LIBERTY FAST CASH", "NEED CASH TODAY?", "CALL 555-FAST-CASH"
    # MUST be strictly horizontal (angle = 0.0 degrees) and vertical edges must be 90.0 degrees.

    # Let's find the optimal corners that make the text lines in the unwarped image perfectly horizontal:
    # We can parameterize corners:
    # TL = (tl_x, tl_y)
    # TR = (tr_x, tr_y)
    # BR = (br_x, br_y)
    # BL = (bl_x, bl_y)

    # From visual analysis of fast-cash-billboard.jpg:
    # Top edge runs from (212, 82) to (1152, 137)
    # Bottom edge:
    # At x=242, the bottom edge of the billboard frame is at y=672
    # At x=1126, the bottom edge of the billboard frame is at y=588
    # Left edge: (212, 82) to (242, 672)
    # Right edge: (1152, 137) to (1126, 588)
    
    # Let's test this corner quad:
    src_pts = np.float32([
        [213.0, 83.0],    # Top-Left
        [1152.0, 138.0],  # Top-Right
        [1126.0, 588.0],  # Bottom-Right
        [243.0, 673.0]    # Bottom-Left
    ])

    out_w, out_h = 1024, 512
    dst_pts = np.float32([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]])

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img, matrix, (out_w, out_h), flags=cv2.INTER_LANCZOS4)

    # Now let's test the angle of horizontal lines in this unwarped image:
    w_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    w_edges = cv2.Canny(w_gray, 50, 150)
    lines = cv2.HoughLinesP(w_edges, 1, np.pi / 180, 100, minLineLength=150, maxLineGap=15)
    
    angles = []
    if lines is not None:
        for l in lines:
            pts = l.reshape(-1)
            x1, y1, x2, y2 = pts[0], pts[1], pts[2], pts[3]
            ang = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if -10 < ang < 10:
                angles.append(ang)
    
    mean_angle = np.mean(angles) if angles else 0.0
    print(f"Mean horizontal tilt angle: {mean_angle:.3f} degrees (count: {len(angles)})")

    # If there's any remaining tilt, rotate to be strictly 0.0 degrees
    if abs(mean_angle) > 0.05:
        rot_mat = cv2.getRotationMatrix2D((out_w / 2, out_h / 2), mean_angle, 1.0)
        warped = cv2.warpAffine(warped, rot_mat, (out_w, out_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
        print(f"Applied fine rotation correction: {-mean_angle:.3f} degrees")

    out_path = "models/Rosa's Apartment/billboard.jpg"
    cv2.imwrite(out_path, warped, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    print(f"Saved perfectly aligned billboard to {out_path}")


if __name__ == "__main__":
    measure_and_correct()
