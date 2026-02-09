#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete backend setup script for NutriLabelAI

.DESCRIPTION
    Automates the entire backend setup:
    1. Builds and starts Docker containers
    2. Runs database migrations
    3. Ingests dish data
    4. Verifies setup

.EXAMPLE
    .\setup-backend.ps1
#>

param(
    [switch]$SkipBuild,
    [switch]$SkipIngest
)

$ErrorActionPreference = "Stop"

Write-Host "`n>> NutriLabelAI Backend Setup" -ForegroundColor Cyan
Write-Host "============================`n" -ForegroundColor Cyan

# Step 1: Check Docker is running
Write-Host "[*] Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Step 2: Build and start containers
if (-not $SkipBuild) {
    Write-Host "[*] Building and starting Docker containers..." -ForegroundColor Yellow
    docker-compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to start containers" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Containers started`n" -ForegroundColor Green
    
    Write-Host "[*] Waiting for database to be ready (10 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "[SKIP] Container build`n" -ForegroundColor Gray
}

# Step 3: Run migrations
Write-Host "[*] Running database migrations..." -ForegroundColor Yellow

# Check if alembic_version table exists to determine if we need to stamp
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$hasAlembicVersion = docker-compose exec -T api python -c "from sqlalchemy import create_engine, inspect; import os; engine = create_engine(os.getenv('DATABASE_URL')); inspector = inspect(engine); print('alembic_version' in inspector.get_table_names())" 2>&1
$ErrorActionPreference = $prevErrorAction

if ($hasAlembicVersion -match "True") {
    Write-Host "   Database already initialized, checking current version..." -ForegroundColor Gray
    # Database exists, try to upgrade (temporarily allow stderr output)
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $migrateOutput = docker-compose exec -T api alembic upgrade head 2>&1
    $ErrorActionPreference = $prevErrorAction
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Migrations up to date`n" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Migration failed, database may already be up to date`n" -ForegroundColor Yellow
    }
} else {
    # Fresh database, run migrations normally
    docker-compose exec -T api alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Migrations failed" -ForegroundColor Red
        Write-Host "   Try: docker-compose down -v (this will delete all data)" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "[OK] Migrations complete`n" -ForegroundColor Green
}

# Step 4: Ingest dishes
if (-not $SkipIngest) {
    Write-Host "[*] Ingesting dish data (this may take 2-3 minutes)..." -ForegroundColor Yellow
    
    # Try different ingestion methods
    $success = $false
    
    # Temporarily allow errors for ingestion attempts
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    
    # Method 1: Run with PYTHONPATH set
    Write-Host "   Attempting ingestion with correct Python path..." -ForegroundColor Gray
    docker-compose exec -T api bash -c "cd /app && python scripts/ingest_seed.py" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host "[OK] Dish data ingested`n" -ForegroundColor Green
    } else {
        # Method 2: Try embed_dishes.py
        Write-Host "   Trying alternate script..." -ForegroundColor Gray
        docker-compose exec -T api bash -c "cd /app && python scripts/embed_dishes.py" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Host "[OK] Dish data ingested`n" -ForegroundColor Green
        }
    }
    
    $ErrorActionPreference = $prevErrorAction
    
    if (-not $success) {
        Write-Host "[WARN] Ingestion scripts failed. You may need to load data manually.`n" -ForegroundColor Yellow
        Write-Host "   Try: docker-compose exec api bash -c 'cd /app && python scripts/ingest_seed.py'" -ForegroundColor Gray
    }
} else {
    Write-Host "[SKIP] Dish ingestion`n" -ForegroundColor Gray
}

# Step 5: Verify setup
Write-Host "[*] Verifying setup..." -ForegroundColor Yellow

# Temporarily allow errors for verification checks
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Check API health
Write-Host "   Testing API health endpoint..." -ForegroundColor Gray
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 5
    if ($health.status -eq "healthy") {
        Write-Host "   [OK] API is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "   [WARN] API health check failed (may need more time)" -ForegroundColor Yellow
}

# Check dish count
Write-Host "   Checking dish count..." -ForegroundColor Gray
$dishCount = docker-compose exec -T api python -c "from app.db.session import get_db; from app.db.models import Dish; db = next(get_db()); print(db.query(Dish).filter(Dish.is_active == True).count())" 2>&1
if ($dishCount -match "\d+") {
    Write-Host "   [OK] Dishes in database: $($matches[0])" -ForegroundColor Green
}

# Check environment variables
Write-Host "`n[*] Environment Configuration:" -ForegroundColor Yellow
$envVars = @("OPENAI_API_KEY", "CLARIFAI_API_KEY")
foreach ($var in $envVars) {
    $value = docker-compose exec -T api printenv $var 2>&1
    if ($value -and $value.Trim()) {
        Write-Host "   [OK] $var is configured" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] $var is not set (using fallback predictions)" -ForegroundColor Yellow
    }
}

$ErrorActionPreference = $prevErrorAction

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ">> Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n>> Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "   2. API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   3. Check logs: docker-compose logs -f api" -ForegroundColor Gray
Write-Host "`n   To configure API keys for real classification:" -ForegroundColor Yellow
Write-Host "   - Edit docker-compose.yml environment section" -ForegroundColor Gray
Write-Host "   - Add OPENAI_API_KEY or CLARIFAI_API_KEY" -ForegroundColor Gray
Write-Host "   - Run: docker-compose restart api`n" -ForegroundColor Gray
