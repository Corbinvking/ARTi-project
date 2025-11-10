# SoundCloud Import Path Fixer (Simplified Version)
# Fixes relative import paths after moving files to Next.js structure

Write-Host "`n🔧 SoundCloud Import Path Fixer" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$basePath = "app\`(dashboard`)\soundcloud\soundcloud-app"
$fixCount = 0
$filesProcessed = 0

if (-not (Test-Path $basePath)) {
    Write-Host "❌ Error: Directory '$basePath' not found!" -ForegroundColor Red
    Write-Host "   Make sure you've copied the source files first." -ForegroundColor Yellow
    exit 1
}

Write-Host "📂 Scanning files in: $basePath`n" -ForegroundColor Gray

Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $file = $_
    $filesProcessed++
    $relativePath = $file.FullName -replace ".*soundcloud-app\\", ""
    
    # Calculate depth (how many folders deep from soundcloud-app root)
    $pathParts = $relativePath -split "\\"
    $depth = $pathParts.Count - 1  # Subtract 1 for the file itself
    
    # Build the correct relative path prefix
    $upLevels = if ($depth -gt 0) { "../" * $depth } else { "./" }
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanged = $false
    
    # Fix integrations/supabase imports
    if ($content -match '@/integrations/supabase') {
        $correctPath = "${upLevels}integrations/supabase"
        $content = $content -replace '@/integrations/supabase/client', "$correctPath/client"
        $content = $content -replace '@/integrations/supabase/types', "$correctPath/types"
        $fileChanged = $true
    }
    
    # Fix contexts/AuthContext imports
    if ($content -match '@/contexts/AuthContext') {
        $correctPath = "${upLevels}contexts/AuthContext"
        $content = $content -replace '@/contexts/AuthContext', $correctPath
        $fileChanged = $true
    }
    
    # Fix other contexts imports
    if ($content -match '@/contexts/') {
        $correctPath = "${upLevels}contexts"
        $content = $content -replace '@/contexts/', "$correctPath/"
        $fileChanged = $true
    }
    
    # Fix lib/utils imports
    if ($content -match '@/lib/utils') {
        $correctPath = "${upLevels}lib/utils"
        $content = $content -replace '@/lib/utils', $correctPath
        $fileChanged = $true
    }
    
    # Fix hooks imports (within soundcloud-app)
    if ($content -match '@/hooks/') {
        $correctPath = "${upLevels}hooks"
        $content = $content -replace '@/hooks/', "$correctPath/"
        $fileChanged = $true
    }
    
    # Fix types imports (within soundcloud-app)
    if ($content -match '@/types/') {
        $correctPath = "${upLevels}types"
        $content = $content -replace '@/types/', "$correctPath/"
        $fileChanged = $true
    }
    
    # Fix utils imports (within soundcloud-app)
    if ($content -match '@/utils/') {
        $correctPath = "${upLevels}utils"
        $content = $content -replace '@/utils/', "$correctPath/"
        $fileChanged = $true
    }
    
    # Fix components imports WITHIN soundcloud-app (dashboard, portal, admin, auth, calendar, notifications, public)
    if ($content -match '@/components/dashboard/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/dashboard/', "$correctPath/dashboard/"
        $fileChanged = $true
    }
    if ($content -match '@/components/portal/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/portal/', "$correctPath/portal/"
        $fileChanged = $true
    }
    if ($content -match '@/components/admin/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/admin/', "$correctPath/admin/"
        $fileChanged = $true
    }
    if ($content -match '@/components/auth/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/auth/', "$correctPath/auth/"
        $fileChanged = $true
    }
    if ($content -match '@/components/calendar/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/calendar/', "$correctPath/calendar/"
        $fileChanged = $true
    }
    if ($content -match '@/components/notifications/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/notifications/', "$correctPath/notifications/"
        $fileChanged = $true
    }
    if ($content -match '@/components/public/') {
        $correctPath = "${upLevels}components"
        $content = $content -replace '@/components/public/', "$correctPath/public/"
        $fileChanged = $true
    }
    
    # NOTE: Leave @/components/ui/* imports unchanged - they point to shared UI components
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "  ✅ Fixed: $relativePath" -ForegroundColor Green
        $fixCount++
    }
}

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Files scanned:  $filesProcessed" -ForegroundColor Gray
Write-Host "  Files fixed:    $fixCount" -ForegroundColor Green
if ($filesProcessed -gt 0) {
    Write-Host "  Success rate:   $([math]::Round(($fixCount/$filesProcessed)*100, 1))%" -ForegroundColor Yellow
}

Write-Host "`nImport paths fixed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run map-soundcloud-env.ps1" -ForegroundColor Gray
Write-Host "  2. Then run pnpm build" -ForegroundColor Gray
Write-Host ""

