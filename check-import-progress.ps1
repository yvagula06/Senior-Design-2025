#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check USDA database import progress

.DESCRIPTION
    Shows current dish count and import log status
#>

Write-Host "`n📊 Database Progress Check" -ForegroundColor Cyan
Write-Host "===========================`n" -ForegroundColor Cyan

# Check current dish count
Write-Host "📦 Current database contents:" -ForegroundColor Yellow
docker exec nutrition_db psql -U postgres -d nutrition -t -c "SELECT COUNT(*) FROM dishes" 2>$null | ForEach-Object {
    $count = $_.Trim()
    Write-Host "   Dishes: " -NoNewline
    Write-Host "$count" -ForegroundColor Green
}

docker exec nutrition_db psql -U postgres -d nutrition -t -c "SELECT COUNT(*) FROM embeddings" 2>$null | ForEach-Object {
    $count = $_.Trim()
    Write-Host "   Embeddings: " -NoNewline
    Write-Host "$count" -ForegroundColor Green
}

# Check if import is still running
Write-Host "`n🔍 Import Status:" -ForegroundColor Yellow
$process = docker exec nutrition_api ps aux 2>$null | Select-String "import_usda_fixed"
if ($process) {
    Write-Host "   ✅ Import is RUNNING" -ForegroundColor Green
    Write-Host "`n   Last 10 lines of log:" -ForegroundColor Gray
    docker exec nutrition_api tail -10 /tmp/import.log 2>$null
} else {
    Write-Host "   ⏸️  Import is NOT running (may be complete)" -ForegroundColor Yellow
    Write-Host "`n   Last 20 lines of log:" -ForegroundColor Gray
    docker exec nutrition_api tail -20 /tmp/import.log 2>$null
}

Write-Host "`n"
