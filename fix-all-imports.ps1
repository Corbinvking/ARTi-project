# Fix all remaining import issues in Stream Strategist

$basePath = "app/(dashboard)/spotify/stream-strategist"

Write-Host "Fixing all remaining import issues..."

# Fix all UI components
Get-ChildItem -Path "$basePath/components/ui" -Include "*.tsx", "*.ts" | ForEach-Object {
    Write-Host "Fixing UI component: $($_.Name)"
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'from "\.\./lib/utils"', 'from "@/lib/utils"'
    $content = $content -replace 'from "\./ui/', 'from "./'
    Set-Content $_.FullName -Value $content
}

# Fix any remaining @/ imports in components
Get-ChildItem -Path "$basePath/components" -Include "*.tsx", "*.ts" | ForEach-Object {
    Write-Host "Fixing component: $($_.Name)"
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'from "@/components/([^"]*)"', 'from "./$1"'
    $content = $content -replace 'from "@/hooks/([^"]*)"', 'from "../hooks/$1"'
    $content = $content -replace 'from "@/lib/([^"]*)"', 'from "../lib/$1"'
    $content = $content -replace 'from "@/types"', 'from "../types"'
    $content = $content -replace 'from "@/integrations/supabase/client"', 'from "../integrations/supabase/client"'
    $content = $content -replace 'from "@/utils/([^"]*)"', 'from "../utils/$1"'
    Set-Content $_.FullName -Value $content
}

# Fix any remaining @/ imports in hooks
Get-ChildItem -Path "$basePath/hooks" -Include "*.tsx", "*.ts" | ForEach-Object {
    Write-Host "Fixing hook: $($_.Name)"
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'from "@/components/([^"]*)"', 'from "../components/$1"'
    $content = $content -replace 'from "@/hooks/([^"]*)"', 'from "./$1"'
    $content = $content -replace 'from "@/lib/([^"]*)"', 'from "../lib/$1"'
    $content = $content -replace 'from "@/types"', 'from "../types"'
    $content = $content -replace 'from "@/integrations/supabase/client"', 'from "../integrations/supabase/client"'
    $content = $content -replace 'from "@/utils/([^"]*)"', 'from "../utils/$1"'
    Set-Content $_.FullName -Value $content
}

# Fix any remaining @/ imports in pages
Get-ChildItem -Path "$basePath/pages" -Include "*.tsx", "*.ts" | ForEach-Object {
    Write-Host "Fixing page: $($_.Name)"
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'from "@/components/([^"]*)"', 'from "../components/$1"'
    $content = $content -replace 'from "@/hooks/([^"]*)"', 'from "../hooks/$1"'
    $content = $content -replace 'from "@/lib/([^"]*)"', 'from "../lib/$1"'
    $content = $content -replace 'from "@/types"', 'from "../types"'
    $content = $content -replace 'from "@/integrations/supabase/client"', 'from "../integrations/supabase/client"'
    $content = $content -replace 'from "@/utils/([^"]*)"', 'from "../utils/$1"'
    Set-Content $_.FullName -Value $content
}

Write-Host "All import issues fixed!"
