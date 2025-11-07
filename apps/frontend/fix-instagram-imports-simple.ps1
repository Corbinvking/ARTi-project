# Instagram Import Path Fixer - Simplified Version
# Run from: apps/frontend directory

Write-Host "`n🔧 Instagram Import Path Fixer (Simple)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\instagram\seedstorm-builder"
$fixCount = 0
$filesChecked = 0

# Verify directory exists
if (-not (Test-Path $basePath)) {
    Write-Host "❌ Error: Could not find Instagram directory!" -ForegroundColor Red
    Write-Host "   Make sure you're running this from apps/frontend" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Scanning: $basePath`n" -ForegroundColor Cyan

# Get all TypeScript files
$files = Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $filesChecked++
    $relativePath = $file.FullName -replace ".*seedstorm-builder\\", ""
    
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        $fileFixed = $false
        
        # Calculate directory depth
        $depth = ($relativePath -split "\\").Count - 1
        
        # Build correct relative path
        $upLevels = ""
        for ($i = 0; $i -lt $depth; $i++) {
            $upLevels += "../"
        }
        if (-not $upLevels) { $upLevels = "./" }
        
        # Fix integrations/supabase/client imports
        if ($content -match 'integrations/supabase/client') {
            $correctPath = "${upLevels}integrations/supabase/client"
            # Replace any ../../../ or similar patterns
            $content = $content -replace '(from\s+[''"])(\.\./)+integrations/supabase/client([''"])', "`$1$correctPath`$3"
            Write-Host "  📝 Fixed supabase/client in: $relativePath" -ForegroundColor Yellow
            $fileFixed = $true
        }
        
        # Fix integrations/supabase/types imports
        if ($content -match 'integrations/supabase/types') {
            $correctPath = "${upLevels}integrations/supabase/types"
            $content = $content -replace '(from\s+[''"])(\.\./)+integrations/supabase/types([''"])', "`$1$correctPath`$3"
            Write-Host "  📝 Fixed supabase/types in: $relativePath" -ForegroundColor Yellow
            $fileFixed = $true
        }
        
        # Fix contexts/AuthContext imports
        if ($content -match 'contexts/AuthContext') {
            $correctPath = "${upLevels}contexts/AuthContext"
            $content = $content -replace '(from\s+[''"])(\.\./)+contexts/AuthContext([''"])', "`$1$correctPath`$3"
            Write-Host "  📝 Fixed AuthContext in: $relativePath" -ForegroundColor Yellow
            $fileFixed = $true
        }
        
        # Save if modified
        if ($fileFixed -and $content -ne $originalContent) {
            Set-Content $file.FullName $content -NoNewline -ErrorAction Stop
            $fixCount++
        }
        
    } catch {
        Write-Host "  ❌ Error in: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Checked: $filesChecked files" -ForegroundColor White
Write-Host "   Fixed: $fixCount files" -ForegroundColor Green

Write-Host "`n✅ Import path fixing complete!" -ForegroundColor Green
Write-Host "   Next: Run pnpm run build to check for errors" -ForegroundColor Cyan
Write-Host ""

