# ARTi Marketing Platform - Unified Stop Script (PowerShell)
# Stops all services in reverse order

Write-Host "🛑 Stopping ARTi Marketing Platform..." -ForegroundColor Red

# Step 1: Stop custom services first
Write-Host "🔧 Stopping custom services..." -ForegroundColor Yellow
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml down
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Failed to stop some custom services" -ForegroundColor DarkYellow
} else {
    Write-Host "✅ Custom services stopped" -ForegroundColor Green
}

# Step 2: Stop Supabase services
Write-Host "📦 Stopping Supabase services..." -ForegroundColor Yellow
npx supabase stop
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Failed to stop some Supabase services" -ForegroundColor DarkYellow
} else {
    Write-Host "✅ Supabase services stopped" -ForegroundColor Green
}

# Step 3: Show final status
Write-Host ""
Write-Host "🎯 ARTi Marketing Platform stopped successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Quick Actions:" -ForegroundColor Cyan
Write-Host "   • Restart platform:   .\start-platform.ps1" -ForegroundColor White
Write-Host "   • View containers:     docker ps -a" -ForegroundColor White
Write-Host "   • Clean up volumes:    docker volume prune" -ForegroundColor White
Write-Host ""
