# Transfer Ratio Fixer files to droplet
# This script creates a tarball and provides instructions for transfer

$sourceDir = "ratio_app copy"
$outputFile = "ratio-fixer-files.tar.gz"

Write-Host "Creating tarball of Ratio Fixer files..." -ForegroundColor Cyan

# Create tarball (using tar if available, or zip)
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $outputFile -C $sourceDir main.py campaign.py jingle_smm.py logger.py requirements.txt .env rich-phenomenon-428302-q5-dba5f2f381c1.json 2>$null
    Write-Host "Created: $outputFile" -ForegroundColor Green
} else {
    # Fallback to zip
    $zipFile = "ratio-fixer-files.zip"
    Compress-Archive -Path "$sourceDir\main.py", "$sourceDir\campaign.py", "$sourceDir\jingle_smm.py", "$sourceDir\logger.py", "$sourceDir\requirements.txt" -DestinationPath $zipFile -Force
    Write-Host "Created: $zipFile" -ForegroundColor Green
    $outputFile = $zipFile
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload the file to your droplet using one of these methods:" -ForegroundColor White
Write-Host ""
Write-Host "   Option A - Using SCP (if SSH works):" -ForegroundColor Cyan
Write-Host "   scp $outputFile root@165.227.91.129:/tmp/" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B - Using a temporary web server:" -ForegroundColor Cyan
Write-Host "   python -m http.server 8000" -ForegroundColor Gray
Write-Host "   Then on droplet: wget http://YOUR_LOCAL_IP:8000/$outputFile" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option C - Upload to GitHub and download:" -ForegroundColor Cyan
Write-Host "   git add $outputFile" -ForegroundColor Gray
Write-Host "   git commit -m 'Add ratio fixer files package'" -ForegroundColor Gray
Write-Host "   git push" -ForegroundColor Gray
Write-Host "   Then on droplet: wget https://raw.githubusercontent.com/.../$outputFile" -ForegroundColor Gray
Write-Host ""
Write-Host "2. On droplet, extract the files:" -ForegroundColor White
Write-Host "   cd /opt/ratio-fixer" -ForegroundColor Gray
Write-Host "   tar -xzf /tmp/$outputFile" -ForegroundColor Gray
Write-Host "   # OR for zip:" -ForegroundColor Gray
Write-Host "   unzip /tmp/$outputFile" -ForegroundColor Gray



