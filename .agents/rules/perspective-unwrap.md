# Texture Perspective Rectification Guidelines

- **Photoshop Perspective Crop Alignment**: When unwrapping perspective mockups (billboards, storefront signs, posters) into rectangular game textures, identify the exact 4 corner pins of the target quad (`TL`, `TR`, `BR`, `BL`).
- **Homography Transform**: Map the 4 corner points directly to destination rectangular coordinates `(0, 0)`, `(W, 0)`, `(W, H)`, `(0, H)` using `cv2.getPerspectiveTransform` and `cv2.warpPerspective`.
- **No Post-Warp Affine Rotations**: Never apply `cv2.warpAffine` rotation after perspective transformation. Rotating inside a rectangular canvas slants horizontal baselines, shears borders, and clips texture corners.
- **Save Scripts to Repo**: Save all diagnostic, crop, and unwrap scripts into `./scripts/` in kebab-case (`scripts/unwrap-billboard.py`); never execute raw multi-line inline Python shell commands.
