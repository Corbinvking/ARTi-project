# SoundCloud Environment Variable Mapper
# Maps Vite/CRA env vars to Next.js equivalents
# Based on YouTube & Instagram success

Write-Host "`n🔐 SoundCloud Environment Variable Mapper" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\soundcloud\soundcloud-app"
$mappedCount = 0
$filesProcessed = 0

if (-not (Test-Path $basePath)) {
    Write-Host "❌ Error: Directory '$basePath' not found!" -ForegroundColor Red
    exit 1
}

# Define environment variable mappings
$envMappings = @{
    'VITE_SUPABASE_URL' = 'NEXT_PUBLIC_SUPABASE_URL'
    'VITE_SUPABASE_ANON_KEY' = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    'VITE_SUPABASE_KEY' = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    'VITE_API_URL' = 'NEXT_PUBLIC_API_URL'
    'REACT_APP_SUPABASE_URL' = 'NEXT_PUBLIC_SUPABASE_URL'
    'REACT_APP_SUPABASE_ANON_KEY' = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    'REACT_APP_API_URL' = 'NEXT_PUBLIC_API_URL'
    'REACT_APP_VAPID_PUBLIC_KEY' = 'NEXT_PUBLIC_VAPID_KEY'
    'PUBLIC_URL' = '""' # Empty string for Next.js (or '/soundcloud' if needed)
}

Write-Host "📂 Scanning files...`n" -ForegroundColor Gray

Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $file = $_
    $filesProcessed++
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanged = $false
    $relativePath = $file.FullName -replace ".*soundcloud-app\\", ""
    
    foreach ($oldVar in $envMappings.Keys) {
        $newVar = $envMappings[$oldVar]
        
        # Replace process.env.OLD_VAR with process.env.NEW_VAR
        if ($content -match "process\.env\.$oldVar\b") {
            if ($newVar -match '^"') {
                # Special case: replace with literal value
                $content = $content -replace "process\.env\.$oldVar\b", $newVar
            } else {
                $content = $content -replace "process\.env\.$oldVar\b", "process.env.$newVar"
            }
            Write-Host "  📝 $relativePath" -ForegroundColor Yellow
            Write-Host "     $oldVar → $newVar" -ForegroundColor Gray
            $fileChanged = $true
        }
        
        # Replace import.meta.env.OLD_VAR (Vite style) with process.env.NEW_VAR
        if ($content -match "import\.meta\.env\.$oldVar\b") {
            if ($newVar -match '^"') {
                # Special case: replace with literal value
                $content = $content -replace "import\.meta\.env\.$oldVar\b", $newVar
            } else {
                $content = $content -replace "import\.meta\.env\.$oldVar\b", "process.env.$newVar"
            }
            Write-Host "  📝 $relativePath" -ForegroundColor Yellow
            Write-Host "     import.meta.env.$oldVar → process.env.$newVar" -ForegroundColor Gray
            $fileChanged = $true
        }
    }
    
    # Replace any remaining import.meta.env.MODE references
    if ($content -match "import\.meta\.env\.MODE") {
        $content = $content -replace "import\.meta\.env\.MODE", "process.env.NODE_ENV"
        Write-Host "  📝 $relativePath" -ForegroundColor Yellow
        Write-Host "     import.meta.env.MODE → process.env.NODE_ENV" -ForegroundColor Gray
        $fileChanged = $true
    }
    
    # Replace import.meta.env.DEV
    if ($content -match "import\.meta\.env\.DEV") {
        $content = $content -replace "import\.meta\.env\.DEV", "(process.env.NODE_ENV === 'development')"
        Write-Host "  📝 $relativePath" -ForegroundColor Yellow
        Write-Host "     import.meta.env.DEV → process.env.NODE_ENV check" -ForegroundColor Gray
        $fileChanged = $true
    }
    
    # Replace import.meta.env.PROD
    if ($content -match "import\.meta\.env\.PROD") {
        $content = $content -replace "import\.meta\.env\.PROD", "(process.env.NODE_ENV === 'production')"
        Write-Host "  📝 $relativePath" -ForegroundColor Yellow
        Write-Host "     import.meta.env.PROD → process.env.NODE_ENV check" -ForegroundColor Gray
        $fileChanged = $true
    }
    
    if ($fileChanged) {
        Set-Content $file.FullName $content -NoNewline
        $mappedCount++
    }
}

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Files scanned:  $filesProcessed" -ForegroundColor Gray
Write-Host "  Files updated:  $mappedCount" -ForegroundColor Green

Write-Host "`n✨ Environment variables mapped!" -ForegroundColor Green

Write-Host "`n📋 Required environment variables in .env.local:" -ForegroundColor Cyan
$uniqueVars = $envMappings.Values | Where-Object { $_ -notmatch '^"' } | Sort-Object -Unique
foreach ($var in $uniqueVars) {
    Write-Host "  $var=your_value_here" -ForegroundColor Gray
}

Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update apps/frontend/.env.local with the variables above" -ForegroundColor Gray
Write-Host "  2. Run: " -NoNewline -ForegroundColor Gray
Write-Host ".\migrate-soundcloud-router.ps1" -ForegroundColor Yellow
Write-Host "  3. Then: " -NoNewline -ForegroundColor Gray
Write-Host "pnpm run build" -ForegroundColor Yellow
Write-Host ""

