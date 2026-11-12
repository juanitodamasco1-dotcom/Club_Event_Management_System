Add-Type -AssemblyName System.Drawing

$bytes = [System.IO.File]::ReadAllBytes("C:\Users\juani\Downloads\OFFICIAL EMAIL ACCOUNT MANAGEMENT INFORMATION.pdf")
$str = [System.Text.Encoding]::ASCII.GetString($bytes)

function Extract-Stream($objNum) {
    $pattern = "(?s)" + $objNum + "\s+0\s+obj.*?stream\r?\n"
    $m = [regex]::Match($str, $pattern)
    if (!$m.Success) { throw "Obj $objNum not found" }
    $start = $m.Index + $m.Length
    $endPattern = "endstream"
    $end = $str.IndexOf($endPattern, $start)
    $len = [int]($end - $start)
    
    $sub = New-Object byte[] ($len - 2)
    [System.Buffer]::BlockCopy($bytes, $start + 2, $sub, 0, $len - 2)
    
    $ms = New-Object System.IO.MemoryStream($sub, 0, $sub.Length)
    $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
    $outMs = New-Object System.IO.MemoryStream
    $ds.CopyTo($outMs)
    $ds.Close()
    return $outMs.ToArray()
}

function Save-Image($rgbObj, $alphaObj, $width, $height, $outputPath) {
    $rgb = Extract-Stream $rgbObj
    $alpha = Extract-Stream $alphaObj
    
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $stride = $bmpData.Stride
    $scan0 = $bmpData.Scan0
    $totalBytes = $stride * $height
    $pixels = New-Object byte[] $totalBytes
    
    for ($y = 0; $y -lt $height; $y++) {
        $rowOffset = $y * $stride
        $rgbRowOffset = $y * $width * 3
        $alphaRowOffset = $y * $width
        for ($x = 0; $x -lt $width; $x++) {
            $r = $rgb[$rgbRowOffset + $x * 3]
            $g = $rgb[$rgbRowOffset + $x * 3 + 1]
            $b = $rgb[$rgbRowOffset + $x * 3 + 2]
            $a = $alpha[$alphaRowOffset + $x]
            
            $pixelOffset = $rowOffset + $x * 4
            $pixels[$pixelOffset] = $b
            $pixels[$pixelOffset + 1] = $g
            $pixels[$pixelOffset + 2] = $r
            $pixels[$pixelOffset + 3] = $a
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($pixels, 0, $scan0, $totalBytes)
    $bmp.UnlockBits($bmpData)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Saved $outputPath"
}

Save-Image 5 6 1655 300 "C:\Users\juani\Desktop\IDE\VS Code\JavaScript\Project Customer\header.png"
Save-Image 8 9 1700 178 "C:\Users\juani\Desktop\IDE\VS Code\JavaScript\Project Customer\footer.png"
