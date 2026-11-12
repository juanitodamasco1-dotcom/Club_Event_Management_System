$pdfPath = "C:\Users\juani\Downloads\OFFICIAL EMAIL ACCOUNT MANAGEMENT INFORMATION.pdf"
$docxPath = "C:\Users\juani\Downloads\OFFICIAL EMAIL ACCOUNT MANAGEMENT INFORMATION.docx"
$workspaceDocx = "C:\Users\juani\Desktop\IDE\VS Code\JavaScript\Project Customer\OFFICIAL EMAIL ACCOUNT MANAGEMENT INFORMATION.docx"

$word = New-Object -ComObject Word.Application
$word.Visible = $true

Write-Output "Word started..."
$doc = $word.Documents.Open($pdfPath)
Write-Output "Document opened!"
$doc.SaveAs2($docxPath, 16)
$doc.SaveAs2($workspaceDocx, 16)
$doc.Close()
$word.Quit()
Write-Output "Done!"
