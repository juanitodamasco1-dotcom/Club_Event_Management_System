Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::RootElement
$p = Get-Process winword -ErrorAction SilentlyContinue
if ($p) {
    $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $p.Id)
    $elements = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    foreach ($el in $elements) {
        $cName = $el.Current.ClassName
        $name = $el.Current.Name
        Write-Output "Top Window: Class=$cName, Name=$name"
        $children = $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
        foreach ($c in $children) {
            $cText = $c.Current.Name
            $cType = $c.Current.ControlType.ProgrammaticName
            if ($cText) {
                Write-Output "    Child: $cType - $cText"
            }
        }
    }
}
