@echo off
REM ================================================================================
REM Clean Database & Fresh Sync - Windows Batch File
REM ================================================================================
REM
REM ⚠️  WARNING: This will DELETE ALL existing data!
REM
REM This creates a clean database with ONLY the 653 campaigns from CSV:
REM   - Deletes all existing campaigns, clients, vendors, playlists
REM   - Syncs fresh data from CSV
REM   - Creates clean relationships
REM
REM Result: Airtight database ready for Spotify for Artists data
REM ================================================================================

echo.
echo ================================================================================
echo   CLEAN DATABASE ^& FRESH SYNC
echo ================================================================================
echo.
echo WARNING: This will DELETE ALL existing data and sync ONLY the 653 campaigns
echo from the CSV. This creates a clean, airtight database.
echo.
echo Press Ctrl+C now to cancel, or
pause

echo.
echo Starting clean and sync...
echo.

node scripts/clean_and_sync_database.js

echo.
echo ================================================================================
echo   COMPLETE
echo ================================================================================
echo.
pause

