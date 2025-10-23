# ================================================================================
# COMPLETE 1-CLICK STREAM DATA PIPELINE
# From CSV to Production in One Click
# ================================================================================

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE STREAM DATA PIPELINE" -ForegroundColor Cyan
Write-Host "  CSV -> URLs -> Scraping -> Local DB -> Production DB" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to script directory
Set-Location $PSScriptRoot

# Check if venv exists, activate it
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
}

# Run the complete pipeline
Write-Host "Starting complete pipeline..." -ForegroundColor Green
Write-Host ""

try {
    python scripts\run_complete_pipeline.py
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================================================================" -ForegroundColor Green
        Write-Host "  SUCCESS! Pipeline completed successfully!" -ForegroundColor Green
        Write-Host "================================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Check your production UI: https://artistinfluence.com" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "================================================================================" -ForegroundColor Red
        Write-Host "  ERROR! Pipeline failed. Check logs above for details." -ForegroundColor Red
        Write-Host "================================================================================" -ForegroundColor Red
        Write-Host ""
    }
}
catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

