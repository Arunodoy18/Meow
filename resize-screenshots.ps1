# ============================================================
# Meow AI — Chrome Web Store Screenshot Resizer
# ============================================================
# Usage: 
#   1. Place your screenshots in the "screenshots-raw" folder
#   2. Run: .\resize-screenshots.ps1
#   3. Resized images appear in "screenshots-store" folder
#
# Chrome Web Store requirements:
#   - Screenshots: 1280x800 or 640x400 (PNG/JPEG)
#   - Small promo tile: 440x280
#   - Marquee promo: 1400x560 (optional)
# ============================================================

param(
    [string]$InputDir = "screenshots-raw",
    [string]$OutputDir = "screenshots-store",
    [int]$TargetWidth = 1280,
    [int]$TargetHeight = 800
)

Add-Type -AssemblyName System.Drawing

# Create directories
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inputPath = Join-Path $scriptDir $InputDir
$outputPath = Join-Path $scriptDir $OutputDir

if (-not (Test-Path $inputPath)) {
    New-Item -ItemType Directory -Path $inputPath -Force | Out-Null
    Write-Host ""
    Write-Host "  Created '$InputDir' folder." -ForegroundColor Yellow
    Write-Host "  Place your raw screenshots there, then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit
}

if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
}

$files = @(Get-ChildItem -Path "$inputPath\*" -Include *.png, *.jpg, *.jpeg, *.bmp -File)
if ($files.Count -eq 0) {
    Write-Host ""
    Write-Host "  No images found in '$InputDir'." -ForegroundColor Red
    Write-Host "  Supported formats: PNG, JPG, JPEG, BMP" -ForegroundColor Gray
    Write-Host ""
    exit
}

Write-Host ""
Write-Host "  Meow AI Screenshot Resizer" -ForegroundColor Green
Write-Host "  ==========================" -ForegroundColor Green
Write-Host "  Target: ${TargetWidth}x${TargetHeight}" -ForegroundColor Cyan
Write-Host "  Found $($files.Count) image(s)" -ForegroundColor Cyan
Write-Host ""

$count = 0
foreach ($file in $files) {
    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        # Calculate scaling to cover the target area (crop to fit)
        $scaleX = $TargetWidth / $img.Width
        $scaleY = $TargetHeight / $img.Height
        $scale = [Math]::Max($scaleX, $scaleY)
        
        $scaledWidth = [int]($img.Width * $scale)
        $scaledHeight = [int]($img.Height * $scale)
        
        # Center-crop offsets
        $cropX = [int](($scaledWidth - $TargetWidth) / 2)
        $cropY = [int](($scaledHeight - $TargetHeight) / 2)
        
        # Create output bitmap
        $bmp = New-Object System.Drawing.Bitmap($TargetWidth, $TargetHeight)
        $bmp.SetResolution(96, 96)
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw scaled and cropped
        $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $TargetWidth, $TargetHeight)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $TargetWidth, $TargetHeight)
        
        # Scale first, then crop
        $tempBmp = New-Object System.Drawing.Bitmap($scaledWidth, $scaledHeight)
        $tempGraphics = [System.Drawing.Graphics]::FromImage($tempBmp)
        $tempGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $tempGraphics.DrawImage($img, 0, 0, $scaledWidth, $scaledHeight)
        $tempGraphics.Dispose()
        
        # Crop center
        $graphics.DrawImage($tempBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        $graphics.Dispose()
        $tempBmp.Dispose()
        
        # Save as PNG
        $count++
        $outName = "screenshot-$count.png"
        $outFile = Join-Path $outputPath $outName
        $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
        
        Write-Host "  [$count] $($file.Name) -> $outName (${TargetWidth}x${TargetHeight})" -ForegroundColor Green
        
        $bmp.Dispose()
        $img.Dispose()
        
    } catch {
        Write-Host "  FAILED: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Also generate small promo tile (440x280) from the first screenshot
if ($files.Count -gt 0) {
    try {
        $firstFile = $files[0].FullName
        $img = [System.Drawing.Image]::FromFile($firstFile)
        
        $promoW = 440
        $promoH = 280
        $scaleX = $promoW / $img.Width
        $scaleY = $promoH / $img.Height
        $scale = [Math]::Max($scaleX, $scaleY)
        
        $sw = [int]($img.Width * $scale)
        $sh = [int]($img.Height * $scale)
        $cx = [int](($sw - $promoW) / 2)
        $cy = [int](($sh - $promoH) / 2)
        
        $tempBmp = New-Object System.Drawing.Bitmap($sw, $sh)
        $tg = [System.Drawing.Graphics]::FromImage($tempBmp)
        $tg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $tg.DrawImage($img, 0, 0, $sw, $sh)
        $tg.Dispose()
        
        $promoBmp = New-Object System.Drawing.Bitmap($promoW, $promoH)
        $pg = [System.Drawing.Graphics]::FromImage($promoBmp)
        $pg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $pg.DrawImage($tempBmp, (New-Object System.Drawing.Rectangle(0, 0, $promoW, $promoH)), (New-Object System.Drawing.Rectangle($cx, $cy, $promoW, $promoH)), [System.Drawing.GraphicsUnit]::Pixel)
        $pg.Dispose()
        
        $promoFile = Join-Path $outputPath "promo-small-440x280.png"
        $promoBmp.Save($promoFile, [System.Drawing.Imaging.ImageFormat]::Png)
        
        Write-Host ""
        Write-Host "  [+] Promo tile: promo-small-440x280.png (440x280)" -ForegroundColor Cyan
        
        $promoBmp.Dispose()
        $tempBmp.Dispose()
        $img.Dispose()
    } catch {
        Write-Host "  Promo tile generation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  Done! $count screenshot(s) resized." -ForegroundColor Green
Write-Host "  Output: $outputPath" -ForegroundColor Gray
Write-Host ""
