# Deploy Ratio Fixer to Droplet
# This script packages the necessary files for deployment

Write-Host "Creating Ratio Fixer deployment package..." -ForegroundColor Cyan

# Create temporary deployment directory
$deployDir = "ratio-fixer-deploy"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy necessary files
Write-Host "Copying application files..." -ForegroundColor Yellow

# Core Python files
Copy-Item "main.py" -Destination $deployDir
Copy-Item "campaign.py" -Destination $deployDir
Copy-Item "jingle_smm.py" -Destination $deployDir
Copy-Item "logger.py" -Destination $deployDir
Copy-Item "requirements.txt" -Destination $deployDir
Copy-Item ".env" -Destination $deployDir

# Templates (if used)
if (Test-Path "templates") {
    Copy-Item -Recurse "templates" -Destination $deployDir
}

# Static files (if used)
if (Test-Path "static") {
    Copy-Item -Recurse "static" -Destination $deployDir
}

# Google Cloud service account
if (Test-Path "rich-phenomenon-428302-q5-dba5f2f381c1.json") {
    Copy-Item "rich-phenomenon-428302-q5-dba5f2f381c1.json" -Destination $deployDir
}

Write-Host "Files copied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the '$deployDir' folder to your droplet:"
Write-Host "   scp -r $deployDir root@165.227.91.129:/opt/ratio-fixer" -ForegroundColor Gray
Write-Host ""
Write-Host "2. SSH to droplet and run setup:" -ForegroundColor Yellow
Write-Host "   ssh root@165.227.91.129" -ForegroundColor Gray
Write-Host "   cd /opt/ratio-fixer" -ForegroundColor Gray
Write-Host "   python3 -m venv venv" -ForegroundColor Gray
Write-Host "   source venv/bin/activate" -ForegroundColor Gray
Write-Host "   pip install -r requirements.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test the app:" -ForegroundColor Yellow
Write-Host "   python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Set up systemd service (see deployment guide)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Deployment package ready in: $deployDir" -ForegroundColor Green

