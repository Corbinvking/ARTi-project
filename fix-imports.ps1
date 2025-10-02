# Fix import paths in Stream Strategist components

$streamStrategistPath = "app/(dashboard)/spotify/stream-strategist"

# Fix hooks imports
Get-ChildItem -Path "$streamStrategistPath/hooks/*.ts", "$streamStrategistPath/hooks/*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '@/integrations/supabase/client', '../integrations/supabase/client'
    $content = $content -replace '@/lib/', '../lib/'
    $content = $content -replace '@/hooks/', '../hooks/'
    $content = $content -replace '@/types', '../types'
    Set-Content $_.FullName -Value $content
}

# Fix components imports
Get-ChildItem -Path "$streamStrategistPath/components/*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '@/integrations/supabase/client', '../integrations/supabase/client'
    $content = $content -replace '@/lib/', '../lib/'
    $content = $content -replace '@/hooks/', '../hooks/'
    $content = $content -replace '@/types', '../types'
    Set-Content $_.FullName -Value $content
}

# Fix pages imports
Get-ChildItem -Path "$streamStrategistPath/pages/*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '@/integrations/supabase/client', '../integrations/supabase/client'
    $content = $content -replace '@/lib/', '../lib/'
    $content = $content -replace '@/hooks/', '../hooks/'
    $content = $content -replace '@/types', '../types'
    $content = $content -replace '@/components/', '../components/'
    Set-Content $_.FullName -Value $content
}

Write-Host "Import paths fixed successfully!"
