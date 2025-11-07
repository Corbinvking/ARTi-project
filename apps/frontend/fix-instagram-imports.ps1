# Instagram Import Path Fixer
# Based on successful YouTube (vidi-health-flow) migration
# Run from: apps/frontend directory
#
# Usage: .\fix-instagram-imports.ps1

Write-Host "`n🔧 Instagram Import Path Fixer" -ForegroundColor Cyan
Write-Host "Based on YouTube migration success" -ForegroundColor Gray
Write-Host "================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\instagram\seedstorm-builder"
$fixCount = 0
$filesChecked = 0
$errors = @()

# Verify we're in the right directory
if (-not (Test-Path $basePath)) {
    Write-Host "❌ Error: Could not find Instagram directory!" -ForegroundColor Red
    Write-Host "   Make sure you're running this from apps/frontend" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Scanning: $basePath" -ForegroundColor Cyan
Write-Host ""

# Find all TypeScript files
$files = Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $filesChecked++
    $relativePath = $file.FullName -replace ".*seedstorm-builder\\", ""
    
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        $fileFixed = $false
        
        # Calculate directory depth for this file
        $depth = ($relativePath -split "\\").Count - 1
        
        # Build correct relative path based on depth
        $upLevels = "../" * $depth
        if (-not $upLevels) { $upLevels = "./" }
        
        # Fix 1: integrations/supabase/client imports
        if ($content -match 'from ["''](\.\./)+integrations/supabase/client["'']') {
            $correctPath = "${upLevels}integrations/supabase/client"
            $content = $content -replace 'from ["''](\.\./)+integrations/supabase/client["'']', "from `"$correctPath`""
            Write-Host "  📝 Fixed supabase/client path in: $relativePath" -ForegroundColor Yellow
            $fileFixed = $true
        }
        
        # Fix 2: integrations/supabase/types imports
        if ($content -match 'from ["''](\.\./)+integrations/supabase/types["'']') {
            $correctPath = "${upLevels}integrations/supabase/types"
            $content = $content -replace 'from ["''](\.\./)+integrations/supabase/types["'']', "from `"$correctPath`""
            Write-Host "  📝 Fixed supabase/types path in: $relativePath" -ForegroundColor Yellow
            $fileFixed = $true
        }
        
        # Fix 3: contexts/AuthContext imports
        if ($content -match 'from ["''](\.\./)+contexts/AuthContext["'']') {
            $correctPath = "${upLevels}contexts/AuthContext"
            $content = $content -replace 'from ["''](\.\./)+contexts/AuthContext["'']', "from `"$correctPath`""
            Write-Host "  📝 Fixed AuthContext path in: $relativePath" -ForegroundColor Yellow
            $fileFixed = $true
        }
        
        # Fix 4 & 5: Quote mismatches - skip for now, will fix manually if needed
        # PowerShell regex has issues with complex quote patterns
        
        # Save if modified
        if ($fileFixed -and $content -ne $originalContent) {
            Set-Content $file.FullName $content -NoNewline -ErrorAction Stop
            $fixCount++
        }
        
    } catch {
        $errors += "Error processing $($file.Name): $($_.Exception.Message)"
        Write-Host "  ❌ Error in: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Checked: $filesChecked files" -ForegroundColor White
Write-Host "   Fixed: $fixCount files" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "   Errors: $($errors.Count)" -ForegroundColor Red
    Write-Host "`n⚠️  Errors encountered:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
}

Write-Host "`n✅ Import path fixing complete!" -ForegroundColor Green
Write-Host "   Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: pnpm run build" -ForegroundColor White
Write-Host "   2. Check for any remaining errors" -ForegroundColor White
Write-Host "   3. See INSTAGRAM-FIXER-UPPER.md for router migration`n" -ForegroundColor White

