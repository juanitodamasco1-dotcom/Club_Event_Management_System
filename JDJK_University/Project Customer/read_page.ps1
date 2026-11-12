$bytes = [System.IO.File]::ReadAllBytes("C:\Users\juani\Downloads\OFFICIAL EMAIL ACCOUNT MANAGEMENT INFORMATION.pdf")
$str = [System.Text.Encoding]::ASCII.GetString($bytes)

# Find MediaBox
$mBox = [regex]::Match($str, "/MediaBox\s*\[([^\]]+)\]")
Write-Output "MediaBox: $($mBox.Groups[1].Value)"

# Find contents of page
$pMatch = [regex]::Match($str, "(?s)/Type\s*/Page\b.*?/Contents\s+(\d+)\s+0\s+R")
if ($pMatch.Success) {
    $cObj = $pMatch.Groups[1].Value
    Write-Output "Contents obj: $cObj"
    
    $objRegex = [regex]::Match($str, "(?s)$cObj\s+0\s+obj.*?stream\r?\n(.*?)endstream")
    if ($objRegex.Success) {
        $raw = $objRegex.Groups[1].Value
        $start = $objRegex.Groups[1].Index
        $len = $raw.Length
        $sub = New-Object byte[] ($len - 2)
        [System.Buffer]::BlockCopy($bytes, $start + 2, $sub, 0, $len - 2)
        $ms = New-Object System.IO.MemoryStream($sub, 0, $sub.Length)
        $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
        $outMs = New-Object System.IO.MemoryStream
        $ds.CopyTo($outMs)
        $ds.Close()
        $content = [System.Text.Encoding]::UTF8.GetString($outMs.ToArray())
        Write-Output "=== Page Stream Content ==="
        Write-Output $content
    }
}
