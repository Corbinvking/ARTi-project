@echo off
echo 🚀 Starting One-Click Spotify Scraper + Local Supabase Sync...
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
    echo ✅ Supabase started. Running scraper now...
) else (
    echo ✅ Local Supabase is running.
)

echo.
echo 🎵 Running scraper and syncing to local Supabase...
echo.

REM Run the scraper sync script
node scripts/run-scraper-and-sync.js

echo.
echo 🎉 Done! Press any key to exit...
pause >nul
