#!/usr/bin/env pwsh
################################################################################
# Quick Production Deployment Script (PowerShell)
# Deploys clean 653 campaigns to production
################################################################################

$ErrorActionPreference = "Stop"

$PROD_SERVER = "root@164.90.129.146"
$PROD_PATH = "/root/arti-project"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "     DEPLOY CLEAN DATABASE TO PRODUCTION" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload CSV and scripts
Write-Host "[Step 1/3] Uploading files to production..." -ForegroundColor Yellow
scp full-databse-chunk.csv "${PROD_SERVER}:${PROD_PATH}/"
scp scripts/reset_to_csv_only.js "${PROD_SERVER}:${PROD_PATH}/scripts/"
scp scripts/fix_campaign_source_type.js "${PROD_SERVER}:${PROD_PATH}/scripts/"
scp scripts/sync_clients_from_csv.js "${PROD_SERVER}:${PROD_PATH}/scripts/"
scp scripts/sync_vendors_from_csv.js "${PROD_SERVER}:${PROD_PATH}/scripts/"
scp scripts/link_campaign_relationships.js "${PROD_SERVER}:${PROD_PATH}/scripts/"
scp scripts/create_campaign_groups_from_campaigns.js "${PROD_SERVER}:${PROD_PATH}/scripts/"
Write-Host "Files uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Run sync on production
Write-Host "[Step 2/3] Running sync on production..." -ForegroundColor Yellow

$syncCommands = @"
cd /root/arti-project

echo 'Importing 653 campaigns...'
node scripts/reset_to_csv_only.js --confirm

echo 'Fixing source and type...'
node scripts/fix_campaign_source_type.js

echo 'Syncing clients...'
node scripts/sync_clients_from_csv.js

echo 'Syncing vendors...'
node scripts/sync_vendors_from_csv.js

echo 'Linking relationships...'
node scripts/link_campaign_relationships.js

echo 'Creating campaign groups...'
node scripts/create_campaign_groups_from_campaigns.js

echo 'Sync complete!'
"@

ssh $PROD_SERVER $syncCommands
Write-Host ""

# Step 3: Verify
Write-Host "[Step 3/3] Verifying deployment..." -ForegroundColor Yellow

$verifyCommands = @"
cd /root/arti-project
node -e `"
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const campaigns = await supabase.from('spotify_campaigns').select('*', { count: 'exact', head: true });
const clients = await supabase.from('clients').select('*', { count: 'exact', head: true });
const vendors = await supabase.from('vendors').select('*', { count: 'exact', head: true });
const groups = await supabase.from('campaign_groups').select('*', { count: 'exact', head: true });

console.log('\\\\n Production Database Status:');
console.log(\\\`   Campaigns:       \\\${campaigns.count}\\\`);
console.log(\\\`   Clients:         \\\${clients.count}\\\`);
console.log(\\\`   Vendors:         \\\${vendors.count}\\\`);
console.log(\\\`   Campaign Groups: \\\${groups.count}\\\\n\\\`);

if (campaigns.count === 653 && clients.count === 203 && vendors.count === 9 && groups.count === 653) {
  console.log('SUCCESS! Production database is clean and matches local!\\\\n');
} else {
  console.log('Warning: Counts do not match expected values\\\\n');
}
`"
"@

ssh $PROD_SERVER $verifyCommands

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "     DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production now has exactly 653 campaigns!" -ForegroundColor Green
Write-Host "Check your production URL to verify" -ForegroundColor Yellow
Write-Host ""
