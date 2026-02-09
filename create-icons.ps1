# Meow AI - Quick Icon Generator
# Creates placeholder icons for development

Write-Host "🐱 Meow AI - Creating Placeholder Icons..." -ForegroundColor Cyan
Write-Host ""

# Load required assembly
Add-Type -AssemblyName System.Drawing

# Define icon sizes
$sizes = @(16, 48, 128)
$iconFolder = "$PSScriptRoot\icons"

# Ensure icons folder exists
if (-not (Test-Path $iconFolder)) {
    New-Item -ItemType Directory -Path $iconFolder | Out-Null
    Write-Host "✓ Created icons folder" -ForegroundColor Green
}

# Create each icon size
foreach ($size in $sizes) {
    $filePath = Join-Path $iconFolder "icon$size.png"
    
    try {
        # Create bitmap
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Enable anti-aliasing for smoother graphics
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        
        # Create gradient brush (purple gradient matching brand)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
        $colorStart = [System.Drawing.Color]::FromArgb(102, 126, 234)  # #667eea
        $colorEnd = [System.Drawing.Color]::FromArgb(118, 75, 162)     # #764ba2
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect, 
            $colorStart, 
            $colorEnd, 
            45  # Diagonal gradient
        )
        
        # Fill background with gradient
        $graphics.FillRectangle($brush, $rect)
        
        # Add white text "M" for Meow
        if ($size -ge 32) {
            $fontSize = [Math]::Floor($size * 0.6)
            $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
            $textBrush = [System.Drawing.Brushes]::White
            $format = New-Object System.Drawing.StringFormat
            $format.Alignment = [System.Drawing.StringAlignment]::Center
            $format.LineAlignment = [System.Drawing.StringAlignment]::Center
            $graphics.DrawString("M", $font, $textBrush, ($size / 2), ($size / 2), $format)
            $font.Dispose()
        }
        
        # Save as PNG
        $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $brush.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
        
        Write-Host "✓ Created $filePath" -ForegroundColor Green
        
    } catch {
        Write-Host "✗ Failed to create icon$size.png: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Icon creation complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Go to chrome://extensions/" -ForegroundColor White
Write-Host "  2. Click the 'Reload' button under Meow AI" -ForegroundColor White
Write-Host "  3. Your extension should now load without errors!" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: These are placeholder icons for development." -ForegroundColor Yellow
Write-Host "   Replace with professional icons before production." -ForegroundColor Yellow
Write-Host ""

# Verify files were created
$createdFiles = Get-ChildItem $iconFolder -Filter "*.png"
Write-Host "📁 Created files:" -ForegroundColor Cyan
$createdFiles | ForEach-Object {
    Write-Host "   - $($_.Name) ($($_.Length) bytes)" -ForegroundColor White
}
