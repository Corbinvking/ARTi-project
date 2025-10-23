# Upload Scraped Data to Production (PowerShell version)
# Usage: .\scripts\upload_to_production.ps1 [-ServerIP "164.90.129.146"]

param(
    [string]$ServerIP = "164.90.129.146",
    [string]$ServerUser = "root",
    [string]$ServerPath = "~/arti-marketing-ops/spotify_scraper/data/"
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "📤 Upload Data to Production" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Count files to upload
$files = Get-ChildItem -Path "spotify_scraper/data/roster_*.json" -ErrorAction SilentlyContinue
$fileCount = ($files | Measure-Object).Count

if ($fileCount -eq 0) {
    Write-Host "❌ No scraped data files found in spotify_scraper/data/" -ForegroundColor Red
    Write-Host "   Run the scraper first: python scripts/run_full_stream_data_pipeline.py"
    exit 1
}

Write-Host "📊 Found $fileCount JSON files to upload" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Target server: $ServerUser@$ServerIP"
Write-Host "📁 Target path: $ServerPath"
Write-Host ""

# Confirm upload
$confirmation = Read-Host "Continue with upload? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Upload cancelled"
    exit 0
}

Write-Host ""
Write-Host "📤 Uploading files..." -ForegroundColor Yellow
Write-Host ""

# Upload files using scp
$scpCommand = "scp spotify_scraper/data/roster_*.json ${ServerUser}@${ServerIP}:${ServerPath}"

try {
    Invoke-Expression $scpCommand
    
    Write-Host ""
    Write-Host "✅ Upload complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps on production server:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   ssh $ServerUser@$ServerIP" -ForegroundColor Yellow
    Write-Host "   cd ~/arti-marketing-ops" -ForegroundColor Yellow
    Write-Host "   source venv/bin/activate  # if using venv" -ForegroundColor Yellow
    Write-Host "   node scripts/import-roster-scraped-data.js" -ForegroundColor Yellow
    Write-Host ""
}
catch {
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    exit 1
}

