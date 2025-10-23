#!/usr/bin/env pwsh
################################################################################
# Full Database Sync - PowerShell Script
################################################################################
#
# This script runs the complete database sync pipeline:
#   1. Sync clients from CSV
#   2. Sync vendors from CSV
#   3. Sync campaigns from CSV (all 653)
#   4. Link campaign relationships
#   5. Verify database health
#
# Usage:
#   .\RUN-FULL-DATABASE-SYNC.ps1
################################################################################

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  FULL DATABASE SYNC" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will sync ALL data from full-databse-chunk.csv to the local database." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Starting full database sync..." -ForegroundColor Green
Write-Host ""

node scripts/run_full_database_sync.js

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  SYNC COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

