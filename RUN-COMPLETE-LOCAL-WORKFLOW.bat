@echo off
REM ================================================================================
REM Complete Local Workflow - Get URLs + Scrape Data + Import
REM ================================================================================

echo.
echo ================================================================================
echo    COMPLETE LOCAL WORKFLOW
echo ================================================================================
echo.
echo This will:
echo   1. Sync 653 campaigns to local database
echo   2. Run Roster Scraper to get SFA URLs
echo   3. Run Stream Data Scraper
echo   4. Import all data to local database
echo.
echo Press Ctrl+C to cancel, or
pause

REM Stage 1: Database Sync
echo.
echo ================================================================================
echo [STAGE 1/4] SYNCING LOCAL DATABASE
echo ================================================================================
echo.

call RUN-FULL-DATABASE-SYNC.bat

if errorlevel 1 (
    echo.
    echo ❌ Database sync failed!
    pause
    exit /b 1
)

echo.
echo ✅ Database sync complete!
echo.

REM Stage 2: Roster Scraper (Get SFA URLs)
echo.
echo ================================================================================
echo [STAGE 2/4] RUNNING ROSTER SCRAPER TO GET SFA URLs
echo ================================================================================
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

REM Stage 3: Stream Data Scraper
echo.
echo ================================================================================
echo [STAGE 3/4] RUNNING STREAM DATA SCRAPER
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

REM Stage 4: Import to Database
echo.
echo ================================================================================
echo [STAGE 4/4] IMPORTING DATA TO LOCAL DATABASE
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
echo    ✅ COMPLETE WORKFLOW FINISHED!
echo ================================================================================
echo.
echo Next Steps:
echo   1. Check local UI to verify data
echo   2. Deploy to production when ready
echo.
pause

