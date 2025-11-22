# Generate base64-encoded file contents for droplet deployment
# This creates commands you can copy-paste on the droplet

$files = @("main.py", "campaign.py", "jingle_smm.py", "logger.py", "requirements.txt", ".env")
$sourceDir = "ratio_app copy"
$outputFile = "ratio-fixer-deploy-commands.sh"

Write-Host "Generating deployment commands..." -ForegroundColor Cyan

$commands = @"
#!/bin/bash
# Ratio Fixer File Deployment Script
# Run this on the droplet: bash ratio-fixer-deploy-commands.sh

cd /opt/ratio-fixer

"@

foreach ($file in $files) {
    $filePath = Join-Path $sourceDir $file
    if (Test-Path $filePath) {
        Write-Host "Processing $file..." -ForegroundColor Yellow
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
        
        $commands += @"

# Creating $file
cat > $file << 'ENDOFFILE'
$content
ENDOFFILE
echo "Created $file"

"@
    } else {
        Write-Host "Warning: $file not found" -ForegroundColor Red
    }
}

$commands += @"

echo ""
echo "All files created successfully!"
echo "Next steps:"
echo "1. Check files: ls -la"
echo "2. Activate venv: source venv/bin/activate"
echo "3. Install deps: pip install -r requirements.txt"
echo "4. Test: python main.py"
"@

$commands | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host ""
Write-Host "Generated: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the contents of $outputFile" -ForegroundColor White
Write-Host "2. On droplet, create the file:" -ForegroundColor White
Write-Host "   nano /tmp/deploy.sh" -ForegroundColor Gray
Write-Host "3. Paste the contents and save (Ctrl+X, Y, Enter)" -ForegroundColor White
Write-Host "4. Run: bash /tmp/deploy.sh" -ForegroundColor White



