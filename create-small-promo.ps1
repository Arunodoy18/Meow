# ============================================================
# Meow AI — Small Promo Tile Generator (440x280)
# ============================================================

Add-Type -AssemblyName System.Drawing

$width = 440
$height = 280
$outputPath = "screenshots-store\promo-small-440x280-new.jpg"

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
for ($i = 0; $i -lt 10; $i++) {
    $x = $i * 60
    $graphics.FillEllipse($overlayBrush, $x, -50, 150, 150)
}

# Text colors
$white = [System.Drawing.Color]::White
$lightWhite = [System.Drawing.Color]::FromArgb(230, 255, 255, 255)
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$lightBrush = New-Object System.Drawing.SolidBrush($lightWhite)

# Main title - "Meow AI" with cat icon
$titleFont = New-Object System.Drawing.Font("Segoe UI", 48, [System.Drawing.FontStyle]::Bold)
$titleText = "Meow AI"
$catText = "🐱 "
$graphics.DrawString($catText, $titleFont, $whiteBrush, 30, 40)
$graphics.DrawString($titleText, $titleFont, $whiteBrush, 100, 40)

# Subtitle
$subtitleFont = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Regular)
$subtitleText = "AI Developer Copilot"
$graphics.DrawString($subtitleText, $subtitleFont, $lightBrush, 30, 110)

# Feature bullets
$featureFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
$checkmark = [char]0x2713
$features = @(
    "$checkmark Context-aware analysis",
    "$checkmark Works everywhere",
    "$checkmark Zero setup required"
)

$y = 150
foreach ($feature in $features) {
    $graphics.DrawString($feature, $featureFont, $lightBrush, 30, $y)
    $y += 30
}

# Decorative paw prints (top right corner)
$pawSize = 25
$pawColor = [System.Drawing.Color]::FromArgb(50, 255, 255, 255)
$pawBrush = New-Object System.Drawing.SolidBrush($pawColor)
for ($i = 0; $i -lt 3; $i++) {
    $px = $width - 120 + ($i * 40)
    $py = 30 + ($i * 25)
    $graphics.FillEllipse($pawBrush, $px, $py, $pawSize, $pawSize)
    $graphics.FillEllipse($pawBrush, $px + 15, $py - 10, $pawSize * 0.6, $pawSize * 0.6)
    $graphics.FillEllipse($pawBrush, $px - 15, $py - 10, $pawSize * 0.6, $pawSize * 0.6)
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
Write-Host "Small Promo Tile created successfully!" -ForegroundColor Green
Write-Host "   Location: $outputPath" -ForegroundColor Cyan
Write-Host "   Size: 440x280 pixels (JPEG)" -ForegroundColor Cyan
Write-Host ""
