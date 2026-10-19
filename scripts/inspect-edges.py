import cv2
import numpy as np

img = cv2.imread("docs/fast-cash-billboard.jpg")

# Let's inspect the billboard frame lines carefully.
# The billboard is a planar rectangular surface in 3D.
# Let's find the inner dark border enclosing the yellow poster.
# The 4 corners of the inner poster rectangle:
# Let's test a grid of candidate points and draw them on a debug image.

# Let's find the line of the bottom of the red banner:
# The red banner ends right where the red transitions to the rusty metal bottom frame.
# In column 300: what y does red end?
# In column 500: what y does red end?
# In column 700: what y does red end?
# In column 900: what y does red end?
# In column 1100: what y does red end?

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
# Red banner hue is near 0 or 175
is_red = ((hsv[:, :, 0] < 12) | (hsv[:, :, 0] > 168)) & (hsv[:, :, 1] > 100) & (hsv[:, :, 2] > 70)

test_cols = [250, 400, 600, 800, 1000, 1100]
bottom_red_ys = []
for c in test_cols:
    # Look between y=450 and y=700
    ys = np.where(is_red[450:700, c])[0] + 450
    if len(ys) > 0:
        bottom_red_ys.append((c, ys[-1]))
print("Bottom of red banner along columns:", bottom_red_ys)

# Top of yellow poster:
is_yellow = (hsv[:, :, 0] >= 14) & (hsv[:, :, 0] <= 35) & (hsv[:, :, 1] > 70) & (hsv[:, :, 2] > 80)
top_yellow_ys = []
for c in test_cols:
    ys = np.where(is_yellow[60:250, c])[0] + 60
    if len(ys) > 0:
        top_yellow_ys.append((c, ys[0]))
print("Top of yellow poster along columns:", top_yellow_ys)

# Left of yellow/red poster:
test_rows = [150, 250, 350, 450, 550, 650]
is_poster = is_yellow | is_red
left_xs = []
for r in test_rows:
    xs = np.where(is_poster[r, 150:400])[0] + 150
    if len(xs) > 0:
        left_xs.append((xs[0], r))
print("Left of poster along rows:", left_xs)

right_xs = []
for r in test_rows:
    xs = np.where(is_poster[r, 1000:1250])[0] + 1000
    if len(xs) > 0:
        right_xs.append((xs[-1], r))
print("Right of poster along rows:", right_xs)
