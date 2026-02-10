#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Continuously import USDA data until complete

.DESCRIPTION
    Runs import in a loop, automatically restarting on errors
#>

Write-Host "🚀 Starting continuous USDA import..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Yellow

$iterations = 0
$lastCount = 0

while ($true) {
    $iterations++
    Write-Host "`n[$iterations] Running import batch..." -ForegroundColor Green
    
    # Run import
    docker exec nutrition_api bash -c "cd /app && timeout 300 python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv 2>&1 | tail -5"
    
    # Check current count
    $count = docker exec nutrition_db psql -U postgres -d nutrition -t -c "SELECT COUNT(*) FROM dishes" 2>$null
    $count = $count.Trim()
    
    Write-Host "   Current dishes: $count" -ForegroundColor Cyan
    
    # If no new dishes were added, we're done
    if ($count -eq $lastCount) {
        Write-Host "`n✅ Import complete! No new dishes to add." -ForegroundColor Green
        Write-Host "   Total dishes: $count" -ForegroundColor Cyan
        break
    }
    
    $lastCount = $count
    
    # Wait a bit before next iteration
    Start-Sleep -Seconds 2
}

Write-Host "`n🎉 Database fully populated!`n" -ForegroundColor Green
