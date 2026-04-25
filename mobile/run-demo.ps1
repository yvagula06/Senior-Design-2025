# run-demo.ps1
# Usage:
#   .\run-demo.ps1              # runs the full demo (all tabs)
#   .\run-demo.ps1 01           # runs only flows/01_label_tab.yaml
#   .\run-demo.ps1 02           # runs only flows/02_explore_tab.yaml
#   .\run-demo.ps1 03           # ...etc.
#
# Prerequisites:
#   - Maestro CLI installed:  curl -Ls "https://get.maestro.mobile.dev" | bash
#   - Android: device/emulator connected (check: adb devices)
#   - iOS:     simulator running   (open in Xcode or: open -a Simulator)
#   - App installed on the target device
#   - Backend running if Flow 1 (Label) should actually generate a label

param(
    [string]$Flow = ""
)

$maestroDir = Join-Path $PSScriptRoot "maestro"

if ($Flow -eq "") {
    $target = Join-Path $maestroDir "demo_main.yaml"
    Write-Host "▶  Running full demo: $target" -ForegroundColor Cyan
} else {
    $match = Get-ChildItem "$maestroDir\flows\${Flow}*.yaml" | Select-Object -First 1
    if ($null -eq $match) {
        Write-Error "No flow file found matching '$Flow' in $maestroDir\flows\"
        exit 1
    }
    $target = $match.FullName
    Write-Host "▶  Running single flow: $target" -ForegroundColor Cyan
}

maestro test $target
