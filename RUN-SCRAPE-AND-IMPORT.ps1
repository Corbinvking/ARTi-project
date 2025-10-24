#!/usr/bin/env pwsh
################################################################################
# Scrape URLs + Stream Data + Import to Database
################################################################################

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   SCRAPE URLs + Stream Data + Import" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:"
Write-Host "  1. Collect SFA URLs from Spotify for Artists Roster"
Write-Host "  2. Scrape stream/playlist data for all songs"
Write-Host "  3. Import data to local database"
Write-Host ""
Write-Host "Press Ctrl+C to cancel, or press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stage 1: Roster Scraper (Get SFA URLs)
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 1/3] COLLECTING SFA URLs FROM ROSTER" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You will need to LOG IN to Spotify for Artists when prompted!" -ForegroundColor Yellow
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

# Stage 1.5: Import URLs to Database
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 1.5/4] SAVING SFA URLs TO DATABASE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

node scripts/import-roster-urls.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Warning: URL import had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "SFA URLs saved to database!" -ForegroundColor Green
Write-Host ""

# Stage 2: Stream Data Scraper
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 2/3] SCRAPING STREAM DATA" -ForegroundColor Cyan
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

# Stage 3: Import to Database
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[STAGE 3/3] IMPORTING DATA TO LOCAL DATABASE" -ForegroundColor Cyan
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
Write-Host "   COMPLETE! All data scraped and imported!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Check local UI at http://localhost:3000"
Write-Host "  2. Click on a campaign to see playlist data"
Write-Host "  3. Deploy to production when ready"
Write-Host ""
Read-Host "Press Enter to exit"

