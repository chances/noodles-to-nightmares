import subprocess, io
from PIL import Image, ImageDraw

def composite_coldstart_badge():
    # Load original clean splash image from git HEAD
    orig_bytes = subprocess.check_output(['git', 'show', 'HEAD:docs/rosa-title-splash.jpg'])
    splash = Image.open(io.BytesIO(orig_bytes)).convert("RGBA")
    
    snowflake_path = r"C:/Users/enigm/.gemini/antigravity/brain/99e43952-42ba-4cfb-a5db-176723e48faa/.user_uploaded/media_1792419457791.png"
    snow_src = Image.open(snowflake_path).convert("RGBA")
    
    # Rockstar logo footprint is exactly width=45, height=41 (aspect ratio: 45/41 = 1.0976)
    # y spans [714, 754], Rockstar x spans [1309, 1353]
    badge_w = 45
    badge_h = 41
    radius = 7
    
    # Supersample 4x for smooth antialiased corners and crisp geometry
    scale = 4
    s_w = badge_w * scale
    s_h = badge_h * scale
    s_r = radius * scale
    
    badge = Image.new("RGBA", (s_w, s_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    
    # Royal blue background and border
    bg_color = (37, 99, 235, 255) # Royal Blue #2563EB
    border_color = (30, 64, 175, 255) # Border #1E40AF
    draw.rounded_rectangle([0, 0, s_w - 1, s_h - 1], radius=s_r, fill=bg_color, outline=border_color, width=scale)
    
    # Center the white snowflake inside the badge proportionally
    # Inner snowflake height ~ 31px (scaled to 31 * scale)
    snow_size = int(31 * scale)
    snow_resized = snow_src.resize((snow_size, snow_size), Image.Resampling.LANCZOS)
    
    # Recolor to solid crisp white
    _, _, _, a_ch = snow_resized.split()
    white_snow = Image.merge("RGBA", (
        Image.new("L", snow_resized.size, 255),
        Image.new("L", snow_resized.size, 255),
        Image.new("L", snow_resized.size, 255),
        a_ch
    ))
    
    # Centering coordinates
    offset_x = (s_w - snow_size) // 2
    offset_y = (s_h - snow_size) // 2
    badge.alpha_composite(white_snow, (offset_x, offset_y))
    
    # Downscale with high quality Lanczos filter
    final_badge = badge.resize((badge_w, badge_h), Image.Resampling.LANCZOS)
    
    # Position: exact y=714 matching Rockstar tile (y=714..754)
    # Rockstar tile starts at x=1309. With a 14px gap, Coldstart ends at x=1294 -> starts at x=1250
    x_pos = 1250
    y_pos = 714
    
    splash.alpha_composite(final_badge, (x_pos, y_pos))
    splash.convert("RGB").save("docs/rosa-title-splash.jpg", quality=95)
    print(f"Successfully composited Coldstart badge: {badge_w}x{badge_h} (Aspect Ratio: {badge_w/badge_h:.4f}) at ({x_pos}, {y_pos})")

if __name__ == "__main__":
    composite_coldstart_badge()
