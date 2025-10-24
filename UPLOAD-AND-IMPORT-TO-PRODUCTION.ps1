#!/usr/bin/env pwsh
################################################################################
# Upload scraped data to production and import
################################################################################

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   UPLOAD & IMPORT TO PRODUCTION" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$PROD_SERVER = "root@164.90.129.146"
$PROD_PATH = "/root/arti-marketing-ops"

# Step 1: Upload scraped data files
Write-Host "[Step 1/2] Uploading scraped JSON files to production..." -ForegroundColor Yellow
Write-Host ""

# Upload roster JSON files (from spotify_scraper/data/)
Write-Host "Uploading stream data files..."
scp spotify_scraper/data/song_*.json "${PROD_SERVER}:${PROD_PATH}/spotify_scraper/data/"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Failed to upload files!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Files uploaded successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Run import on production
Write-Host "[Step 2/2] Running import on production..." -ForegroundColor Yellow
Write-Host ""

$importCommand = @"
cd /root/arti-marketing-ops
node scripts/import-roster-scraped-data.js
"@

ssh $PROD_SERVER $importCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Import failed on production!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   SUCCESS! Data uploaded and imported to production!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Check production UI to verify playlist data"
Write-Host "  2. Click on campaigns to see stream counts"
Write-Host ""
Read-Host "Press Enter to exit"

