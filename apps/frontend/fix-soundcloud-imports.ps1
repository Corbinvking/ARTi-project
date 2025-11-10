# SoundCloud Import Path Fixer
# Based on YouTube & Instagram success
# Fixes relative import paths after moving files to Next.js structure

Write-Host "`n🔧 SoundCloud Import Path Fixer" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\soundcloud\soundcloud-app"
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
    
    # Fix 1: integrations/supabase imports
    if ($content -match 'from ["'']@/integrations/supabase') {
        $correctPath = "${upLevels}integrations/supabase"
        $content = $content -replace 'from ["'']@/integrations/supabase/client["'']', "from `"${correctPath}/client`""
        $content = $content -replace 'from ["'']@/integrations/supabase/types["'']', "from `"${correctPath}/types`""
        $fileChanged = $true
    }
    
    # Fix 2: contexts/AuthContext imports
    if ($content -match 'from ["'']@/contexts/AuthContext["'']') {
        $correctPath = "${upLevels}contexts/AuthContext"
        $content = $content -replace 'from ["'']@/contexts/AuthContext["'']', "from `"$correctPath`""
        $fileChanged = $true
    }
    
    # Fix 3: contexts imports (other contexts)
    if ($content -match "from [`"`']@/contexts/") {
        $correctPath = "${upLevels}contexts"
        $content = $content -replace "from [`"`']@/contexts/([^`"`']+)[`"`']", "from `"$correctPath/`$1`""
        $fileChanged = $true
    }
    
    # Fix 4: lib/utils imports
    if ($content -match "from [`"`']@/lib/utils[`"`']") {
        $correctPath = "${upLevels}lib/utils"
        $content = $content -replace "from [`"`']@/lib/utils[`"`']", "from `"$correctPath`""
        $fileChanged = $true
    }
    
    # Fix 5: hooks imports (within soundcloud-app)
    if ($content -match "from [`"`']@/hooks/") {
        $correctPath = "${upLevels}hooks"
        $content = $content -replace "from [`"`']@/hooks/([^`"`']+)[`"`']", "from `"$correctPath/`$1`""
        $fileChanged = $true
    }
    
    # Fix 6: types imports (within soundcloud-app)
    if ($content -match "from [`"`']@/types/") {
        $correctPath = "${upLevels}types"
        $content = $content -replace "from [`"`']@/types/([^`"`']+)[`"`']", "from `"$correctPath/`$1`""
        $fileChanged = $true
    }
    
    # Fix 7: utils imports (within soundcloud-app)
    if ($content -match "from [`"`']@/utils/") {
        $correctPath = "${upLevels}utils"
        $content = $content -replace "from [`"`']@/utils/([^`"`']+)[`"`']", "from `"$correctPath/`$1`""
        $fileChanged = $true
    }
    
    # Fix 8: components imports WITHIN soundcloud-app (not shared UI)
    # Only fix if it is importing from soundcloud-app components, not shared UI
    if ($content -match "from [`"`']@/components/(dashboard|portal|admin|auth|calendar|notifications|public)/") {
        $correctPath = "${upLevels}components"
        $content = $content -replace "from [`"`']@/components/(dashboard|portal|admin|auth|calendar|notifications|public)/([^`"`']+)[`"`']", "from `"$correctPath/`$1/`$2`""
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
Write-Host "  Success rate:   $([math]::Round(($fixCount/$filesProcessed)*100, 1))%" -ForegroundColor Yellow

Write-Host "`n✨ Import paths fixed!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: " -NoNewline -ForegroundColor Gray
Write-Host ".\map-soundcloud-env.ps1" -ForegroundColor Yellow
Write-Host "  2. Then: " -NoNewline -ForegroundColor Gray
Write-Host "pnpm run build" -ForegroundColor Yellow
Write-Host ""

