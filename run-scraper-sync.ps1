# One-Click Spotify Scraper + Local Supabase Sync
# PowerShell version

Write-Host "🚀 Starting One-Click Spotify Scraper + Local Supabase Sync..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if local Supabase is running
Write-Host "🔍 Checking if local Supabase is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:54321/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Local Supabase is running." -ForegroundColor Green
} catch {
    Write-Host "❌ Local Supabase not running. Starting it now..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please wait while Supabase starts..." -ForegroundColor Cyan
    
    # Start Supabase
    npx supabase start
    
    Write-Host ""
    Write-Host "✅ Supabase started. Running scraper now..." -ForegroundColor Green
}

Write-Host ""
Write-Host "🎵 Running scraper and syncing to local Supabase..." -ForegroundColor Cyan
Write-Host ""

# Run the scraper sync script
try {
    node scripts/run-scraper-and-sync.js
    
    Write-Host ""
    Write-Host "🎉 Done! Scraper sync completed successfully!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Error running scraper sync script" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
