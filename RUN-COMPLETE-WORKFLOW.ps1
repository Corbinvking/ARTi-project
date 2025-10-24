# Complete Workflow - PowerShell Script
# Runs the complete end-to-end Spotify campaign workflow

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "COMPLETE SPOTIFY CAMPAIGN WORKFLOW" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

python scripts/run_complete_workflow.py $args

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

