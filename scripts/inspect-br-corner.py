import cv2
import numpy as np

img = cv2.imread("docs/fast-cash-billboard.jpg")

# The bottom-right corner of the billboard:
# In fast-cash-billboard.jpg, let's look at the region x in [1080, 1160], y in [500, 640]
crop_br = img[500:640, 1080:1160]
cv2.imwrite("scripts/debug_br.png", crop_br)

# Let's inspect the edge transitions:
# Where is the right edge of the billboard frame in y in [500, 600]?
# Where is the bottom edge of the billboard frame in x in [1080, 1160]?

hsv = cv2.cvtColor(crop_br, cv2.COLOR_BGR2HSV)
# Red banner:
is_red = ((hsv[:, :, 0] < 12) | (hsv[:, :, 0] > 168)) & (hsv[:, :, 1] > 80) & (hsv[:, :, 2] > 50)
ys, xs = np.where(is_red)
if len(xs) > 0:
    print(f"In crop_br (offset (1080, 500)):")
    print(f"Max x of red banner: {xs.max()} (global x = {1080 + xs.max()})")
    print(f"Max y of red banner: {ys.max()} (global y = {500 + ys.max()})")
    # Corner of red banner is the point maximizing x + y in this region:
    br_idx = np.argmax(xs + ys)
    print(f"Max (x+y) red point: global ({1080 + xs[br_idx]}, {500 + ys[br_idx]})")

# Also look at the rusty metal frame corner:
# Outside the red banner, there is a brown/rusty frame, then grey sky / building behind it.
# Let's find the outer corner of the billboard frame itself!
gray = cv2.cvtColor(crop_br, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 50, 150)
ey, ex = np.where(edges)
print(f"Edges max x: {1080 + ex.max()}, max y: {500 + ey.max()}")
