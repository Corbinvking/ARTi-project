# SoundCloud Router Migration Helper
# Automates 80% of React Router → Next.js migration
# Based on YouTube & Instagram success

Write-Host "`n🔄 SoundCloud Router Migration Helper" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\soundcloud\soundcloud-app"
$migratedCount = 0
$skippedCount = 0
$filesProcessed = 0

if (-not (Test-Path $basePath)) {
    Write-Host "❌ Error: Directory '$basePath' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Scanning for React Router files...`n" -ForegroundColor Gray

Get-ChildItem -Path $basePath -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $relativePath = $file.FullName -replace ".*soundcloud-app\\", ""
    
    # Skip if already migrated to Next.js
    if ($content -match 'from [''"]next/navigation[''"]') {
        $skippedCount++
        return
    }
    
    # Only process files with react-router
    if ($content -notmatch 'from [''"]react-router-dom[''"]') {
        return
    }
    
    $filesProcessed++
    Write-Host "🔧 Migrating: $relativePath" -ForegroundColor Yellow
    
    # Step 1: Add "use client" if not present
    if ($content -notmatch '^[''"]use client[''"]') {
        $content = '"use client"' + "`n`n" + $content
    }
    
    # Step 2: Remove old React Router imports
    $content = $content -replace 'import\s+\{[^}]*\}\s+from\s+[''"]react-router-dom[''"]\s*;?\s*\n?', ''
    
    # Step 3: Add Next.js imports (after "use client")
    $nextImports = @"
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
"@
    
    if ($content -notmatch 'from [''"]next/navigation[''"]') {
        # Insert after "use client" directive
        $content = $content -replace '([''"]use client[''"])\s*\n', "`$1`n`n$nextImports`n"
    }
    
    # Step 4: Replace hook declarations
    $content = $content -replace '\bconst\s+navigate\s*=\s*useNavigate\s*\(\s*\)\s*;?', 'const router = useRouter();'
    $content = $content -replace '\bconst\s+location\s*=\s*useLocation\s*\(\s*\)\s*;?', 'const pathname = usePathname();'
    $content = $content -replace '\bconst\s+\[searchParams\]\s*=\s*useSearchParams\s*\(\s*\)\s*;?', 'const searchParams = useSearchParams();'
    $content = $content -replace '\bconst\s+\[searchParams,\s*setSearchParams\]\s*=\s*useSearchParams\s*\(\s*\)\s*;?', 'const searchParams = useSearchParams(); // Note: setSearchParams not available in Next.js'
    
    # Step 5: Replace navigate calls (simple patterns)
    # navigate('/path') → router.push('/soundcloud/path')
    $content = $content -replace "navigate\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", 'router.push(''/soundcloud$1'')'
    
    # navigate(-1) → router.back()
    $content = $content -replace 'navigate\s*\(\s*-1\s*\)', 'router.back()'
    
    # navigate(1) → router.forward()
    $content = $content -replace 'navigate\s*\(\s*1\s*\)', 'router.forward()'
    
    # Step 6: Replace location.pathname references
    $content = $content -replace '\blocation\.pathname\b', 'pathname'
    $content = $content -replace '\blocation\.search\b', 'pathname // Note: Use searchParams instead'
    
    # Step 7: Add optional chaining to searchParams
    $content = $content -replace 'searchParams\.get\(', 'searchParams?.get('
    $content = $content -replace 'searchParams\.has\(', 'searchParams?.has('
    $content = $content -replace 'searchParams\.getAll\(', 'searchParams?.getAll('
    
    # Step 8: Replace Link components
    # <Link to="/path"> → <Link href="/soundcloud/path">
    $content = $content -replace '<Link\s+to\s*=\s*[''"]([^''"]+)[''"]', '<Link href="/soundcloud$1"'
    
    # Handle template literals in to prop
    $content = $content -replace '<Link\s+to\s*=\s*\{`([^`]+)`\}', '<Link href={`/soundcloud$1`}'
    
    # Step 9: Handle NavLink (more complex - add comment for manual review)
    if ($content -match '<NavLink') {
        $content = $content -replace '<NavLink\s+to\s*=\s*[''"]([^''"]+)[''"]([^>]*className\s*=\s*\{[^}]*isActive[^}]*\}[^>]*)>', '/* TODO: Manual review needed */ <Link href="/soundcloud$1"$2>'
        $content = $content -replace '<NavLink', '/* TODO: Replace with <Link> and manual active state */ <Link'
        $content = $content -replace '</NavLink>', '</Link>'
    }
    
    # Step 10: Clean up multiple blank lines
    $content = $content -replace '\n\n\n+', "`n`n"
    
    # Save if changed
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "  ✅ Migrated: $relativePath" -ForegroundColor Green
        $migratedCount++
    }
}

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Migration Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Files processed:    $filesProcessed" -ForegroundColor Gray
Write-Host "  Files migrated:     $migratedCount" -ForegroundColor Green
Write-Host "  Already migrated:   $skippedCount" -ForegroundColor Gray

Write-Host "`n✨ Router migration complete!" -ForegroundColor Green

Write-Host "`n⚠️  Manual review needed for:" -ForegroundColor Yellow
Write-Host "  • NavLink components (search for TODO comments)" -ForegroundColor Gray
Write-Host "  • Complex navigate() calls with state objects" -ForegroundColor Gray
Write-Host "  • Dynamic URL construction" -ForegroundColor Gray
Write-Host "  • setSearchParams usage (Next.js handles this differently)" -ForegroundColor Gray

Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Search for 'TODO' comments and fix manually" -ForegroundColor Gray
Write-Host "  2. Run: " -NoNewline -ForegroundColor Gray
Write-Host "pnpm run build" -ForegroundColor Yellow
Write-Host "  3. Fix any remaining errors" -ForegroundColor Gray
Write-Host ""

