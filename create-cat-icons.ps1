# Meow AI - Cat Icon Generator
# Creates cat face icons in 16x16, 48x48, and 128x128 sizes

Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)

foreach ($size in $sizes) {
    # Create bitmap
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable anti-aliasing for smooth graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Create gradient background (purple to blue)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $colorStart = [System.Drawing.Color]::FromArgb(102, 126, 234)
    $colorEnd = [System.Drawing.Color]::FromArgb(118, 75, 162)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorStart, $colorEnd, 45)
    $g.FillRectangle($brush, $rect)
    
    # Calculate sizes based on icon size
    $centerX = $size / 2
    $centerY = $size / 2
    
    if ($size -eq 16) {
        # For 16x16, draw a simple cat silhouette
        $white = [System.Drawing.Brushes]::White
        
        # Cat head (circle)
        $headSize = 10
        $g.FillEllipse($white, $centerX - $headSize/2, $centerY - $headSize/2 + 1, $headSize, $headSize)
        
        # Ears (triangles)
        $earSize = 3
        $leftEar = @(
            [System.Drawing.Point]::new($centerX - 4, $centerY - 3),
            [System.Drawing.Point]::new($centerX - 2, $centerY - 6),
            [System.Drawing.Point]::new($centerX - 1, $centerY - 3)
        )
        $rightEar = @(
            [System.Drawing.Point]::new($centerX + 1, $centerY - 3),
            [System.Drawing.Point]::new($centerX + 2, $centerY - 6),
            [System.Drawing.Point]::new($centerX + 4, $centerY - 3)
        )
        $g.FillPolygon($white, $leftEar)
        $g.FillPolygon($white, $rightEar)
        
    } elseif ($size -eq 48) {
        # For 48x48, draw a detailed cat face
        $white = [System.Drawing.Brushes]::White
        $black = [System.Drawing.Brushes]::Black
        $pink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 182, 193))
        
        # Cat head
        $headSize = 28
        $g.FillEllipse($white, $centerX - $headSize/2, $centerY - $headSize/2 + 3, $headSize, $headSize)
        
        # Ears
        $leftEar = @(
            [System.Drawing.Point]::new($centerX - 11, $centerY - 8),
            [System.Drawing.Point]::new($centerX - 6, $centerY - 16),
            [System.Drawing.Point]::new($centerX - 3, $centerY - 8)
        )
        $rightEar = @(
            [System.Drawing.Point]::new($centerX + 3, $centerY - 8),
            [System.Drawing.Point]::new($centerX + 6, $centerY - 16),
            [System.Drawing.Point]::new($centerX + 11, $centerY - 8)
        )
        $g.FillPolygon($white, $leftEar)
        $g.FillPolygon($white, $rightEar)
        
        # Inner ears (pink)
        $leftInnerEar = @(
            [System.Drawing.Point]::new($centerX - 9, $centerY - 8),
            [System.Drawing.Point]::new($centerX - 6, $centerY - 13),
            [System.Drawing.Point]::new($centerX - 4, $centerY - 8)
        )
        $rightInnerEar = @(
            [System.Drawing.Point]::new($centerX + 4, $centerY - 8),
            [System.Drawing.Point]::new($centerX + 6, $centerY - 13),
            [System.Drawing.Point]::new($centerX + 9, $centerY - 8)
        )
        $g.FillPolygon($pink, $leftInnerEar)
        $g.FillPolygon($pink, $rightInnerEar)
        
        # Eyes
        $eyeSize = 4
        $g.FillEllipse($black, $centerX - 8, $centerY + 2, $eyeSize, $eyeSize)
        $g.FillEllipse($black, $centerX + 4, $centerY + 2, $eyeSize, $eyeSize)
        
        # Nose
        $noseSize = 3
        $g.FillEllipse($pink, $centerX - $noseSize/2, $centerY + 8, $noseSize, $noseSize)
        
        # Mouth
        $pen = New-Object System.Drawing.Pen($black, 1.5)
        $g.DrawArc($pen, $centerX - 4, $centerY + 8, 4, 3, 0, 180)
        $g.DrawArc($pen, $centerX, $centerY + 8, 4, 3, 0, 180)
        $pen.Dispose()
        
        $pink.Dispose()
        
    } else {
        # For 128x128, draw an even more detailed cat face
        $white = [System.Drawing.Brushes]::White
        $black = [System.Drawing.Brushes]::Black
        $pink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 182, 193))
        $gray = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(200, 200, 200))
        
        # Cat head
        $headSize = 80
        $g.FillEllipse($white, $centerX - $headSize/2, $centerY - $headSize/2 + 8, $headSize, $headSize)
        
        # Ears
        $leftEar = @(
            [System.Drawing.Point]::new($centerX - 30, $centerY - 20),
            [System.Drawing.Point]::new($centerX - 18, $centerY - 45),
            [System.Drawing.Point]::new($centerX - 8, $centerY - 20)
        )
        $rightEar = @(
            [System.Drawing.Point]::new($centerX + 8, $centerY - 20),
            [System.Drawing.Point]::new($centerX + 18, $centerY - 45),
            [System.Drawing.Point]::new($centerX + 30, $centerY - 20)
        )
        $g.FillPolygon($white, $leftEar)
        $g.FillPolygon($white, $rightEar)
        
        # Inner ears (pink)
        $leftInnerEar = @(
            [System.Drawing.Point]::new($centerX - 26, $centerY - 20),
            [System.Drawing.Point]::new($centerX - 18, $centerY - 38),
            [System.Drawing.Point]::new($centerX - 12, $centerY - 20)
        )
        $rightInnerEar = @(
            [System.Drawing.Point]::new($centerX + 12, $centerY - 20),
            [System.Drawing.Point]::new($centerX + 18, $centerY - 38),
            [System.Drawing.Point]::new($centerX + 26, $centerY - 20)
        )
        $g.FillPolygon($pink, $leftInnerEar)
        $g.FillPolygon($pink, $rightInnerEar)
        
        # Eyes (larger and more detailed)
        $eyeSize = 12
        $g.FillEllipse($black, $centerX - 22, $centerY + 5, $eyeSize, $eyeSize)
        $g.FillEllipse($black, $centerX + 10, $centerY + 5, $eyeSize, $eyeSize)
        
        # Eye highlights (white dots)
        $highlightSize = 4
        $highlightBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, 255, 255, 255))
        $g.FillEllipse($highlightBrush, $centerX - 19, $centerY + 7, $highlightSize, $highlightSize)
        $g.FillEllipse($highlightBrush, $centerX + 13, $centerY + 7, $highlightSize, $highlightSize)
        $highlightBrush.Dispose()
        
        # Nose
        $noseSize = 8
        $g.FillEllipse($pink, $centerX - $noseSize/2, $centerY + 22, $noseSize, $noseSize)
        
        # Mouth
        $pen = New-Object System.Drawing.Pen($black, 3)
        $g.DrawArc($pen, $centerX - 12, $centerY + 22, 12, 8, 0, 180)
        $g.DrawArc($pen, $centerX, $centerY + 22, 12, 8, 0, 180)
        
        # Whiskers
        $whiskerPen = New-Object System.Drawing.Pen($gray, 2)
        # Left whiskers
        $g.DrawLine($whiskerPen, $centerX - 40, $centerY + 15, $centerX - 15, $centerY + 18)
        $g.DrawLine($whiskerPen, $centerX - 40, $centerY + 22, $centerX - 15, $centerY + 22)
        $g.DrawLine($whiskerPen, $centerX - 40, $centerY + 29, $centerX - 15, $centerY + 26)
        # Right whiskers  
        $g.DrawLine($whiskerPen, $centerX + 15, $centerY + 18, $centerX + 40, $centerY + 15)
        $g.DrawLine($whiskerPen, $centerX + 15, $centerY + 22, $centerX + 40, $centerY + 22)
        $g.DrawLine($whiskerPen, $centerX + 15, $centerY + 26, $centerX + 40, $centerY + 29)
        
        $whiskerPen.Dispose()
        $pen.Dispose()
        $pink.Dispose()
        $gray.Dispose()
    }
    
    # Save icon
    $bmp.Save("icons\icon$size.png")
    
    # Cleanup
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "✅ Created icon$size.png (cat face)" -ForegroundColor Green
}

Write-Host "`n🐱 Meow! Cat icons created successfully!" -ForegroundColor Cyan
