@echo off
REM ================================================================================
REM Full Database Sync - Windows Batch File
REM ================================================================================
REM
REM This script runs the complete database sync pipeline:
REM   1. Sync clients from CSV
REM   2. Sync vendors from CSV
REM   3. Sync campaigns from CSV (all 653)
REM   4. Link campaign relationships
REM   5. Verify database health
REM
REM Usage:
REM   Double-click this file OR run: RUN-FULL-DATABASE-SYNC.bat
REM ================================================================================

echo.
echo ================================================================================
echo   FULL DATABASE SYNC
echo ================================================================================
echo.
echo This will sync ALL data from full-databse-chunk.csv to the local database.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo Starting full database sync...
echo.

node scripts/run_full_database_sync.js

echo.
echo ================================================================================
echo   SYNC COMPLETE
echo ================================================================================
echo.
pause

