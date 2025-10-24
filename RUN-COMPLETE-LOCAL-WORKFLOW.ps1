#!/usr/bin/env pwsh
################################################################################
# Complete Local Workflow - Get URLs + Scrape Data + Import
################################################################################

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   COMPLETE LOCAL WORKFLOW" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:"
Write-Host "  1. Sync 653 campaigns to local database"
Write-Host "  2. Run Roster Scraper to get SFA URLs"
Write-Host "  3. Run Stream Data Scraper"
Write-Host "  4. Import all data to local database"
Write-Host ""
Write-Host "Press Ctrl+C to cancel, or press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stage 1: Database Sync
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 1/4] SYNCING LOCAL DATABASE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

& .\RUN-FULL-DATABASE-SYNC.bat

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Database sync failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Database sync complete!" -ForegroundColor Green
Write-Host ""

# Stage 2: Roster Scraper (Get SFA URLs)
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 2/4] RUNNING ROSTER SCRAPER TO GET SFA URLs" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

Push-Location roster_scraper
python run_roster_scraper.py
$rosterResult = $LASTEXITCODE
Pop-Location

if ($rosterResult -ne 0) {
    Write-Host ""
    Write-Host "X Roster scraper failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "SFA URLs collected!" -ForegroundColor Green
Write-Host ""

# Stage 3: Stream Data Scraper
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 3/4] RUNNING STREAM DATA SCRAPER" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

Push-Location spotify_scraper
python run_s4a_list.py
$scraperResult = $LASTEXITCODE
Pop-Location

if ($scraperResult -ne 0) {
    Write-Host ""
    Write-Host "X Stream data scraper failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Stream data scraped!" -ForegroundColor Green
Write-Host ""

# Stage 4: Import to Database
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 4/4] IMPORTING DATA TO LOCAL DATABASE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

node scripts/import-roster-scraped-data.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "X Data import failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Data imported!" -ForegroundColor Green
Write-Host ""

# Final Summary
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   COMPLETE WORKFLOW FINISHED!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Check local UI to verify data"
Write-Host "  2. Deploy to production when ready"
Write-Host ""
Read-Host "Press Enter to exit"

