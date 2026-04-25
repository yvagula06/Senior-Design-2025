# Quick test script for the Nutrition API
# Run this in PowerShell to test different queries

Write-Host "`n=== Testing Nutrition API ===" -ForegroundColor Green

# Test 1: Search for dishes
Write-Host "`n1. Searching for 'burger'..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:8000/dishes/search?q=burger&k=3" -Method Get
$response | ForEach-Object { Write-Host "   - $($_.name) (similarity: $([math]::Round($_.sim * 100, 1))%)" }

# Test 2: Get nutrition label
Write-Host "`n2. Getting nutrition label for 'grilled chicken salad'..." -ForegroundColor Cyan
$body = @{
    dish_name = "grilled chicken salad"
} | ConvertTo-Json
$label = Invoke-RestMethod -Uri "http://localhost:8000/label/nutrition-label" -Method Post -Body $body -ContentType "application/json"
Write-Host "   Matched: $($label.matched_dish)" -ForegroundColor Yellow
Write-Host "   Calories: $($label.nutrition.calories)" 
Write-Host "   Protein: $($label.nutrition.protein_g)g"
Write-Host "   Carbs: $($label.nutrition.carbs_g)g"
Write-Host "   Fat: $($label.nutrition.fat_g)g"
Write-Host "   Confidence: $([math]::Round($label.confidence * 100, 1))% - $($label.explanation)"

# Test 3: Another search
Write-Host "`n3. Searching for 'chocolate cake'..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:8000/dishes/search?q=chocolate+cake&k=3" -Method Get
$response | ForEach-Object { Write-Host "   - $($_.name) (similarity: $([math]::Round($_.sim * 100, 1))%)" }

Write-Host "`n=== All tests complete! ===" -ForegroundColor Green
Write-Host "Try your own queries at: http://localhost:8000/docs`n" -ForegroundColor Yellow
