@echo off
echo 🚀 Complete Spotify Scraper Workflow
echo.
echo This will:
echo   1. 🎵 Run the Python scraper
echo   2. 📊 Parse raw data into structured tables  
echo   3. 📋 Show you the results
echo   4. 🔍 Provide data viewing options
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if local Supabase is running
echo 🔍 Checking if local Supabase is running...
curl -s http://localhost:54321/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Local Supabase not running. Starting it now...
    echo.
    echo Please wait while Supabase starts...
    npx supabase start
    echo.
    echo ✅ Supabase started. Running complete workflow now...
) else (
    echo ✅ Local Supabase is running.
)

echo.
echo 🎵 Running complete scraper workflow...
echo.

REM Run the complete workflow
node scripts/run-complete-scraper-workflow.js

echo.
echo 🎉 Complete workflow finished! Press any key to exit...
pause >nul
