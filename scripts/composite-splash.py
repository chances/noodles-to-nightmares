from pathlib import Path
from PIL import Image

def downscale_splash():
    concept_path = Path("docs/rosa-title-splash-concept.jpg")
    output_path = Path("docs/rosa-title-splash.jpg")
    
    if not concept_path.exists():
        raise FileNotFoundError(f"Concept image not found: {concept_path}")
        
    img = Image.open(concept_path).convert("RGB")
    print(f"Loaded concept image: {img.size}")
    
    # Downscale from 2048x2048 to 1024x1024 using Lanczos filter
    target_size = (1024, 1024)
    downscaled = img.resize(target_size, Image.Resampling.LANCZOS)
    
    downscaled.save(output_path, quality=95)
    print(f"Successfully downscaled {concept_path} to {output_path} ({target_size[0]}x{target_size[1]})")

if __name__ == "__main__":
    downscale_splash()
