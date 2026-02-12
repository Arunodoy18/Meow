# ============================================================
# Meow AI — Marquee Promo Tile Generator (1400x560)
# ============================================================

Add-Type -AssemblyName System.Drawing

$width = 1400
$height = 560
$outputPath = "screenshots-store\marquee-promo-1400x560.jpg"

# Create bitmap and graphics object
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Create gradient background (purple to blue)
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$colorStart = [System.Drawing.Color]::FromArgb(88, 86, 214)  # Purple
$colorEnd = [System.Drawing.Color]::FromArgb(41, 128, 185)    # Blue
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorStart, $colorEnd, 45)
$graphics.FillRectangle($brush, $rect)

# Add subtle overlay pattern
$overlayColor = [System.Drawing.Color]::FromArgb(20, 255, 255, 255)
$overlayBrush = New-Object System.Drawing.SolidBrush($overlayColor)
for ($i = 0; $i -lt 20; $i++) {
    $x = $i * 100
    $graphics.FillEllipse($overlayBrush, $x, -100, 300, 300)
}

# Text colors and fonts
$white = [System.Drawing.Color]::White
$lightWhite = [System.Drawing.Color]::FromArgb(230, 255, 255, 255)
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$lightBrush = New-Object System.Drawing.SolidBrush($lightWhite)

# Main title - "Meow AI" with cat icon
$titleFont = New-Object System.Drawing.Font("Segoe UI", 72, [System.Drawing.FontStyle]::Bold)
$titleText = "Meow AI"
$catText = "🐱 "
$graphics.DrawString($catText, $titleFont, $whiteBrush, 70, 80)
$graphics.DrawString($titleText, $titleFont, $whiteBrush, 200, 80)

# Subtitle
$subtitleFont = New-Object System.Drawing.Font("Segoe UI", 32, [System.Drawing.FontStyle]::Regular)
$subtitleText = "Universal AI Developer Copilot"
$graphics.DrawString($subtitleText, $subtitleFont, $lightBrush, 80, 190)

# Feature bullets
$featureFont = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Regular)
$checkmark = [char]0x2713
$features = @(
    "$checkmark Works on GitHub, LeetCode, Stack Overflow and 50+ sites",
    "$checkmark Context-aware code analysis and PR reviews",
    "$checkmark Zero setup - No API keys required"
)

$y = 280
foreach ($feature in $features) {
    $graphics.DrawString($feature, $featureFont, $lightBrush, 80, $y)
    $y += 50
}

# CTA text (bottom right)
$ctaFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$ctaText = "Install Now - Press Alt+M to Start"
$graphics.DrawString($ctaText, $ctaFont, $whiteBrush, 720, 470)

# Add decorative cat paw prints (top right)
$pawSize = 40
$pawColor = [System.Drawing.Color]::FromArgb(50, 255, 255, 255)
$pawBrush = New-Object System.Drawing.SolidBrush($pawColor)
for ($i = 0; $i -lt 4; $i++) {
    $px = $width - 200 + ($i * 60)
    $py = 50 + ($i * 40)
    $graphics.FillEllipse($pawBrush, $px, $py, $pawSize, $pawSize)
    $graphics.FillEllipse($pawBrush, $px + 25, $py - 15, $pawSize * 0.6, $pawSize * 0.6)
    $graphics.FillEllipse($pawBrush, $px - 25, $py - 15, $pawSize * 0.6, $pawSize * 0.6)
}

# Save as JPEG
$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95)

$fullPath = Join-Path (Get-Location) $outputPath
$bitmap.Save($fullPath, $jpegEncoder, $encoderParams)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$brush.Dispose()
$overlayBrush.Dispose()
$whiteBrush.Dispose()
$lightBrush.Dispose()
$pawBrush.Dispose()

Write-Host ""
Write-Host "✅ Marquee Promo Tile created successfully!" -ForegroundColor Green
Write-Host "   Location: $outputPath" -ForegroundColor Cyan
Write-Host "   Size: 1400x560 pixels (JPEG)" -ForegroundColor Cyan
Write-Host ""
