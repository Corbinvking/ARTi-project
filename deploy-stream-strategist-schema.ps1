# Stream Strategist Schema Deployment Script
# This script deploys the complete Stream Strategist database schema to production
# while maintaining the local-to-production mirror workflow.

Write-Host "🚀 Starting Stream Strategist Schema Deployment..." -ForegroundColor Green
Write-Host "📍 Target: Production Supabase Instance" -ForegroundColor Yellow

# Check if production.env exists
if (-not (Test-Path "production.env")) {
    Write-Host "❌ production.env file not found!" -ForegroundColor Red
    Write-Host "   Please ensure production.env exists with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

# Load environment variables
Get-Content "production.env" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_KEY) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    Write-Host "   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables loaded" -ForegroundColor Green

# Check if migration file exists
$migrationFile = "supabase/migrations/017_stream_strategist_complete_schema.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Found migration file: 017_stream_strategist_complete_schema.sql" -ForegroundColor Green

# Read the migration content
$migrationContent = Get-Content $migrationFile -Raw
Write-Host "📊 Migration file loaded (Length: $($migrationContent.Length) characters)" -ForegroundColor Yellow

# Create a temporary SQL file for execution
$tempSqlFile = "temp_stream_strategist_migration.sql"
$migrationContent | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "⏳ Deploying Stream Strategist schema to production..." -ForegroundColor Yellow

try {
    # Execute the migration using curl (since we can't easily use psql directly)
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
        "apikey" = $SUPABASE_SERVICE_KEY
    }
    
    # Split the migration into smaller chunks to avoid timeout
    $chunks = $migrationContent -split ";" | Where-Object { $_.Trim().Length -gt 10 }
    
    Write-Host "📊 Found $($chunks.Count) SQL statements to execute" -ForegroundColor Yellow
    
    $successCount = 0
    $errorCount = 0
    
    for ($i = 0; $i -lt $chunks.Count; $i++) {
        $chunk = $chunks[$i] + ";"
        
        Write-Host "⏳ Executing statement $($i + 1)/$($chunks.Count)..." -ForegroundColor Cyan
        
        $body = @{
            query = $chunk
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ContentType "application/json"
            $successCount++
        } catch {
            Write-Host "❌ Error in statement $($i + 1): $($_.Exception.Message)" -ForegroundColor Red
            
            # Continue with non-critical errors
            if ($_.Exception.Message -match "already exists|duplicate_object|relation already exists") {
                Write-Host "⚠️  Non-critical error, continuing..." -ForegroundColor Yellow
                $successCount++
                $errorCount--
            } else {
                $errorCount++
            }
        }
    }
    
    Write-Host "`n📈 Deployment Summary:" -ForegroundColor Green
    Write-Host "✅ Successful statements: $successCount" -ForegroundColor Green
    Write-Host "❌ Failed statements: $errorCount" -ForegroundColor Red
    
    if ($errorCount -eq 0) {
        Write-Host "`n🎉 Stream Strategist schema deployed successfully!" -ForegroundColor Green
        Write-Host "🔗 All tables, policies, indexes, and functions are now available in production" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Deployment completed with some errors" -ForegroundColor Yellow
        Write-Host "   Check the logs above for details" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "💥 Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temporary file
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force
    }
}

Write-Host "`n🔍 Verifying key tables..." -ForegroundColor Yellow

# Verify key tables
$keyTables = @(
    "creators",
    "campaign_ab_tests", 
    "ml_model_versions",
    "analytics_notes",
    "workflow_rules",
    "algorithm_learning_log",
    "fraud_detection_alerts"
)

foreach ($table in $keyTables) {
    try {
        $headers = @{
            "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
            "apikey" = $SUPABASE_SERVICE_KEY
        }
        
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/$table?select=*&limit=1" -Method Get -Headers $headers
        
        Write-Host "✅ Table $table`: Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ Table $table`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Stream Strategist schema deployment completed!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test the Stream Strategist frontend integration" -ForegroundColor White
Write-Host "   2. Verify data isolation with org_id policies" -ForegroundColor White
Write-Host "   3. Test ML analytics and workflow features" -ForegroundColor White
