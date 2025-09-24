# ARTi Marketing Platform - Unified Start Script (PowerShell)
# Starts Supabase services + custom services in correct order

Write-Host "🚀 Starting ARTi Marketing Platform..." -ForegroundColor Green

# Step 1: Start Supabase services first
Write-Host "📦 Starting Supabase services..." -ForegroundColor Yellow
npx supabase start
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Supabase services" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Supabase services started" -ForegroundColor Green

# Step 2: Start custom services (API, Worker, n8n, Caddy)
Write-Host "🔧 Starting custom services..." -ForegroundColor Yellow
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start custom services" -ForegroundColor Red
    Write-Host "🛑 Stopping Supabase services..." -ForegroundColor Yellow
    npx supabase stop
    exit 1
}
Write-Host "✅ Custom services started" -ForegroundColor Green

# Step 3: Show status
Write-Host ""
Write-Host "🎉 ARTi Marketing Platform is now running!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Endpoints:" -ForegroundColor Cyan
Write-Host "   • Platform Health:    http://localhost:8080/health" -ForegroundColor White
Write-Host "   • Custom API:         http://localhost:8080/api/" -ForegroundColor White
Write-Host "   • Supabase Studio:    http://127.0.0.1:54323" -ForegroundColor White
Write-Host "   • n8n Automation:     http://127.0.0.1:5678" -ForegroundColor White
Write-Host "   • Direct API:         http://127.0.0.1:3001" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Authentication:" -ForegroundColor Cyan
Write-Host "   • Supabase URL:       http://127.0.0.1:54321" -ForegroundColor White
Write-Host "   • Test Login:         admin@arti-demo.com / Password123!" -ForegroundColor White
Write-Host ""
Write-Host "📋 Management Commands:" -ForegroundColor Cyan
Write-Host "   • View logs:          docker-compose -p arti-marketing-ops logs -f" -ForegroundColor White
Write-Host "   • Stop platform:      .\stop-platform.ps1" -ForegroundColor White
Write-Host "   • Restart services:   .\stop-platform.ps1; .\start-platform.ps1" -ForegroundColor White
Write-Host ""
