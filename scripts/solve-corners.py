import cv2
import numpy as np

img = cv2.imread("docs/fast-cash-billboard.jpg")
h, w = img.shape[:2]

# The billboard has an inner black frame line enclosing the yellow/red poster.
# Let's find the exact lines by fitting lines to the edge points:

# Top line:
top_x = np.array([250, 400, 600, 800, 1000, 1120], dtype=float)
# Let's sample exact top edge at these x:
# The top edge is where dark frame (V < 50) transitions to yellow poster (V > 120, H in 15..35)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
is_yellow = (hsv[:, :, 0] >= 14) & (hsv[:, :, 0] <= 35) & (hsv[:, :, 1] > 60) & (hsv[:, :, 2] > 70)

top_pts = []
for x in range(250, 1120, 20):
    ys = np.where(is_yellow[60:200, x])[0] + 60
    if len(ys) > 0:
        top_pts.append((x, ys[0]))
top_pts = np.array(top_pts)
m_top, b_top = np.polyfit(top_pts[:, 0], top_pts[:, 1], 1)
print(f"Top line: y = {m_top:.5f} * x + {b_top:.2f}")

# Bottom line: where red banner transitions to bottom rusty frame
# Red banner hue < 12 or > 168, V > 70, S > 100
is_red = ((hsv[:, :, 0] < 12) | (hsv[:, :, 0] > 168)) & (hsv[:, :, 1] > 100) & (hsv[:, :, 2] > 60)
bot_pts = []
for x in range(260, 1120, 20):
    ys = np.where(is_red[450:700, x])[0] + 450
    if len(ys) > 0:
        bot_pts.append((x, ys[-1]))
bot_pts = np.array(bot_pts)
m_bot, b_bot = np.polyfit(bot_pts[:, 0], bot_pts[:, 1], 1)
print(f"Bottom line: y = {m_bot:.5f} * x + {b_bot:.2f}")

# Left line: where dark left frame transitions to yellow/red poster
is_poster = is_yellow | is_red
left_pts = []
for y in range(120, 640, 10):
    xs = np.where(is_poster[y, 160:350])[0] + 160
    if len(xs) > 0:
        left_pts.append((xs[0], y))
left_pts = np.array(left_pts)
# Fit x as function of y: x = m_left * y + b_left
m_left, b_left = np.polyfit(left_pts[:, 1], left_pts[:, 0], 1)
print(f"Left line: x = {m_left:.5f} * y + {b_left:.2f}")

# Right line: where yellow/red poster transitions to dark right frame
right_pts = []
for y in range(150, 520, 10):
    xs = np.where(is_poster[y, 1050:1200])[0] + 1050
    if len(xs) > 0:
        right_pts.append((xs[-1], y))
right_pts = np.array(right_pts)
m_right, b_right = np.polyfit(right_pts[:, 1], right_pts[:, 0], 1)
print(f"Right line: x = {m_right:.5f} * y + {b_right:.2f}")

# Compute intersections:
# Line 1: y = m_h * x + b_h  <=>  m_h * x - y = -b_h
# Line 2: x = m_v * y + b_v  <=>  x - m_v * y = b_v
def intersect(m_h, b_h, m_v, b_v):
    # x = m_v * y + b_v
    # y = m_h * (m_v * y + b_v) + b_h = m_h * m_v * y + m_h * b_v + b_h
    # y * (1 - m_h * m_v) = m_h * b_v + b_h
    y = (m_h * b_v + b_h) / (1.0 - m_h * m_v)
    x = m_v * y + b_v
    return np.array([x, y], dtype=np.float32)

tl = intersect(m_top, b_top, m_left, b_left)
tr = intersect(m_top, b_top, m_right, b_right)
br = intersect(m_bot, b_bot, m_right, b_right)
bl = intersect(m_bot, b_bot, m_left, b_left)

print(f"TL: {tl}")
print(f"TR: {tr}")
print(f"BR: {br}")
print(f"BL: {bl}")

src_pts = np.float32([tl, tr, br, bl])
out_w, out_h = 1024, 512
dst_pts = np.float32([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]])

M = cv2.getPerspectiveTransform(src_pts, dst_pts)
warped = cv2.warpPerspective(img, M, (out_w, out_h), flags=cv2.INTER_LANCZOS4)

cv2.imwrite("models/Rosa's Apartment/billboard.jpg", warped, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
print("Saved models/Rosa's Apartment/billboard.jpg")
