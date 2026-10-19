import cv2
import numpy as np

img = cv2.imread("docs/fast-cash-billboard.jpg")

# Let's inspect pixel color transitions along vertical and horizontal slices!
# Top edge: for x in [300, 500, 700, 900, 1100], where does yellow start?
# Yellow is high R (>150), high G (>150), low B (<100)

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
mask = (hsv[:, :, 1] > 70) & (hsv[:, :, 2] > 70) & ((hsv[:, :, 0] < 38) | (hsv[:, :, 0] > 170))

# Let's find top-most yellow pixel for columns
cols = [250, 400, 600, 800, 1000, 1100]
top_pts = []
for c in cols:
    ys = np.where(mask[:, c])[0]
    # Filter for y in [70, 200]
    ys = [y for y in ys if 70 <= y <= 200]
    if ys:
        top_pts.append((c, min(ys)))
print("Top edge points:", top_pts)

# Bottom-most red pixel for columns (y in [500, 750])
bot_pts = []
for c in cols:
    ys = np.where(mask[:, c])[0]
    ys = [y for y in ys if 500 <= y <= 750]
    if ys:
        bot_pts.append((c, max(ys)))
print("Bottom edge points:", bot_pts)

# Left-most colored pixel for rows (y in [150, 300, 450, 600])
rows = [150, 250, 350, 450, 550, 650]
left_pts = []
for r in rows:
    xs = np.where(mask[r, :])[0]
    xs = [x for x in xs if 150 <= x <= 350]
    if xs:
        left_pts.append((min(xs), r))
print("Left edge points:", left_pts)

# Right-most colored pixel for rows
right_pts = []
for r in rows:
    xs = np.where(mask[r, :])[0]
    xs = [x for x in xs if 1000 <= x <= 1200]
    if xs:
        right_pts.append((max(xs), r))
print("Right edge points:", right_pts)
