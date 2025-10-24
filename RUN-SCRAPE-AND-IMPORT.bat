@echo off
REM ================================================================================
REM Scrape URLs + Stream Data + Import to Database
REM ================================================================================
REM
REM This script:
REM   1. Collects SFA URLs from Roster (2-4 hours)
REM   2. Scrapes stream/playlist data (3-6 hours)
REM   3. Imports to local database (5-10 min)
REM
REM Campaigns must already be in the database!
REM ================================================================================

echo.
echo ================================================================================
echo    SCRAPE URLs + Stream Data + Import
echo ================================================================================
echo.
echo This will:
echo   1. Collect SFA URLs from Spotify for Artists Roster
echo   2. Scrape stream/playlist data for all songs
echo   3. Import data to local database
echo.
echo Press Ctrl+C to cancel, or
pause

REM Stage 1: Roster Scraper (Get SFA URLs)
echo.
echo ================================================================================
echo [STAGE 1/3] COLLECTING SFA URLs FROM ROSTER
echo ================================================================================
echo.
echo You will need to LOG IN to Spotify for Artists when prompted!
echo.

cd roster_scraper
python run_roster_scraper.py
cd ..

if errorlevel 1 (
    echo.
    echo ❌ Roster scraper failed!
    pause
    exit /b 1
)

echo.
echo ✅ SFA URLs collected!
echo.

REM Stage 1.5: Import URLs to Database
echo.
echo ================================================================================
echo [STAGE 1.5/4] SAVING SFA URLs TO DATABASE
echo ================================================================================
echo.

node scripts/import-roster-urls.js

if errorlevel 1 (
    echo.
    echo ⚠️ URL import had issues, but continuing...
)

echo.
echo ✅ SFA URLs saved to database!
echo.

REM Stage 2: Stream Data Scraper
echo.
echo ================================================================================
echo [STAGE 2/3] SCRAPING STREAM DATA
echo ================================================================================
echo.

cd spotify_scraper
python run_s4a_list.py
cd ..

if errorlevel 1 (
    echo.
    echo ❌ Stream data scraper failed!
    pause
    exit /b 1
)

echo.
echo ✅ Stream data scraped!
echo.

REM Stage 3: Import to Database
echo.
echo ================================================================================
echo [STAGE 3/3] IMPORTING DATA TO LOCAL DATABASE
echo ================================================================================
echo.

node scripts/import-roster-scraped-data.js

if errorlevel 1 (
    echo.
    echo ❌ Data import failed!
    pause
    exit /b 1
)

echo.
echo ✅ Data imported!
echo.

REM Final Summary
echo.
echo ================================================================================
echo    ✅ COMPLETE! All data scraped and imported!
echo ================================================================================
echo.
echo Next Steps:
echo   1. Check local UI at http://localhost:3000
echo   2. Click on a campaign to see playlist data
echo   3. Deploy to production when ready
echo.
pause

