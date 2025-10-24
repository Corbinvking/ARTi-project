# Upload ALL scraped JSON files to production and import them

Write-Host "=== Uploading ALL Scraped Stream Data to Production ===" -ForegroundColor Cyan
Write-Host ""

# Count local files
$localFiles = Get-ChildItem spotify_scraper/data/song_*.json
Write-Host "Local scraped files: $($localFiles.Count)" -ForegroundColor Green

# Upload all JSON files
Write-Host ""
Write-Host "Uploading to production..." -ForegroundColor Yellow
scp spotify_scraper/data/song_*.json root@164.90.129.146:/root/arti-marketing-ops/spotify_scraper/data/

if ($LASTEXITCODE -eq 0) {
    Write-Host "Upload complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Run this on production SSH:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "cd /root/arti-marketing-ops" -ForegroundColor White
    Write-Host "python3 scripts/generate_sql_import.py" -ForegroundColor White
    Write-Host "psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql" -ForegroundColor White
} else {
    Write-Host "Upload failed!" -ForegroundColor Red
}
