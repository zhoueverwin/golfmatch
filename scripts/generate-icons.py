#!/usr/bin/env python3
"""
Generate app icons from source logo image
Creates all required icon sizes for Expo app
"""

from PIL import Image
import os
import sys

# Icon sizes required by Expo
ICON_SIZES = {
    'icon.png': 1024,
    'adaptive-icon.png': 1024,
    'splash-icon.png': 1242,  # Common splash screen size
    'favicon.png': 48,
}

def resize_image(input_path, output_path, size, maintain_aspect=False):
    """Resize image to specified size"""
    try:
        img = Image.open(input_path)
        
        # Convert RGBA if needed (for transparency support)
        if img.mode != 'RGBA':
            # Convert to RGBA to support transparency
            img = img.convert('RGBA')
        
        if maintain_aspect:
            # Maintain aspect ratio, fit within size with padding
            img.thumbnail((size, size), Image.LANCZOS)
            
            # Create square canvas with transparent background
            new_img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
            
            # Calculate position to center the image
            paste_x = (size - img.width) // 2
            paste_y = (size - img.height) // 2
            new_img.paste(img, (paste_x, paste_y), img)
            img = new_img
        else:
            # Stretch to exact size
            img = img.resize((size, size), Image.LANCZOS)
        
        # Save as PNG
        img.save(output_path, 'PNG', optimize=True)
        print(f"✓ Created {output_path} ({size}x{size})")
        return True
    except Exception as e:
        print(f"✗ Error creating {output_path}: {e}")
        return False

def main():
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(script_dir)
    assets_dir = os.path.join(app_dir, 'assets')
    source_image = os.path.join(assets_dir, 'logo-source.jpeg')
    
    # Check if source image exists
    if not os.path.exists(source_image):
        print(f"Error: Source image not found at {source_image}")
        sys.exit(1)
    
    # Create assets directory if it doesn't exist
    os.makedirs(assets_dir, exist_ok=True)
    
    print(f"Generating icons from: {source_image}")
    print("-" * 50)
    
    # Generate each icon size
    success_count = 0
    for filename, size in ICON_SIZES.items():
        output_path = os.path.join(assets_dir, filename)
        
        # For icons, maintain aspect ratio
        # For favicon and splash, we can stretch if needed
        maintain_aspect = filename in ['icon.png', 'adaptive-icon.png']
        
        if resize_image(source_image, output_path, size, maintain_aspect):
            success_count += 1
    
    print("-" * 50)
    print(f"✓ Successfully generated {success_count}/{len(ICON_SIZES)} icons")
    print(f"Icons are in: {assets_dir}")
    
    if success_count == len(ICON_SIZES):
        print("\n✓ All icons generated successfully!")
        print("You can now use them in your Expo app.")
    else:
        print("\n⚠ Some icons failed to generate. Please check the errors above.")
        sys.exit(1)

if __name__ == '__main__':
    main()

