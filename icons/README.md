# Meow AI Icons

## Required Icon Files

Place the following PNG files in this folder:
- `icon16.png` (16x16 pixels) - Used in extension management and address bar
- `icon48.png` (48x48 pixels) - Used in extensions management page
- `icon128.png` (128x128 pixels) - Used in Chrome Web Store and installation

## Design Guidelines

- **Format**: PNG with transparent background
- **Shape**: Square (equal width and height)
- **Style**: Simple, recognizable at small sizes
- **Theme**: Cat/Meow themed to match brand

## Quick Placeholder Generation

### Option 1: Use Online Tools
- Visit: https://www.favicon-generator.org/
- Upload your logo or design
- Download 16x16, 48x48, and 128x128 versions

### Option 2: Use Design Tools
- Canva, Figma, or Photoshop
- Create 128x128 design first
- Export at different sizes

### Option 3: Temporary Placeholder (Development)
For quick testing, you can create simple colored squares:

**Using PowerShell (Windows):**
```powershell
# This creates basic 1-pixel placeholder files
# Replace with proper icons before production!
Add-Type -AssemblyName System.Drawing
$sizes = @(16, 48, 128)
foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.Clear([System.Drawing.Color]::Purple)
    $bmp.Save("$PSScriptRoot\icon$size.png")
    $graphics.Dispose()
    $bmp.Dispose()
}
```

## Current Status
⚠️ **Icons folder created but empty - add icon files to enable extension**

## Recommended Icon Idea for Meow AI
- Purple/gradient background (matching your brand colors #667eea to #764ba2)
- White cat emoji 🐱 or stylized cat silhouette
- Clean, minimal design
- Readable at 16px size
