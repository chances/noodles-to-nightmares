import cv2
import numpy as np

img = cv2.imread("docs/fast-cash-billboard.jpg")
h, w = img.shape[:2]

# The billboard has a very clear outer rectangular metal frame and inner yellow/red content.
# Let's detect lines with Canny and HoughLinesP
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 50, 150)

# Mask out areas far outside the billboard:
mask = np.zeros_like(gray)
mask[50:720, 100:1250] = 255
edges = cv2.bitwise_and(edges, mask)

lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100, minLineLength=100, maxLineGap=20)

# Categorize lines into Top, Bottom, Left, Right
# Top line: slope near (136-80)/(1154-212) ~ 0.06
# Bottom line: slope near (550-676)/(1115-260) ~ -0.14 ? Wait!
# Let's print out the longest lines found:
lines_info = []
for line in lines:
    pts = line.reshape(-1)
    x1, y1, x2, y2 = pts[0], pts[1], pts[2], pts[3]
    length = np.hypot(x2 - x1, y2 - y1)
    slope = (y2 - y1) / (x2 - x1 + 1e-6)
    lines_info.append((length, x1, y1, x2, y2, slope))

lines_info.sort(key=lambda x: x[0], reverse=True)
for l in lines_info[:20]:
    print(f"Len: {l[0]:.1f}, ({l[1]},{l[2]}) -> ({l[3]},{l[4]}), slope: {l[5]:.3f}")
