@echo off
echo.
echo ========================================================================
echo    S4A SCRAPER - AUTOMATED WORKFLOW
echo ========================================================================
echo.
echo This will:
echo   1. Open a browser window to Spotify for Artists
echo   2. Give you 60 SECONDS to log in (if not already logged in)
echo   3. Scrape all 16 songs from s4alist.md (~20-30 minutes)
echo   4. Automatically import all data to the database
echo.
echo IMPORTANT:
echo   - Your login session will be saved for future runs
echo   - You only need to log in ONCE
echo   - Keep this window open until scraping is complete
echo.
echo ========================================================================
echo.
pause
echo.
echo Starting scraper...
echo.

node scripts/scrape-and-import-s4a-list.js

echo.
echo ========================================================================
echo.
pause

