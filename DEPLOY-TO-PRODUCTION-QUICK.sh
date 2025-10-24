#!/bin/bash
################################################################################
# Quick Production Deployment Script
# Deploys clean 653 campaigns to production
################################################################################

set -e  # Exit on error

PROD_SERVER="root@164.90.129.146"
PROD_PATH="/root/arti-project"

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║     🚀 DEPLOY CLEAN DATABASE TO PRODUCTION                                ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Upload CSV and scripts
echo "📤 Step 1/3: Uploading files to production..."
scp full-databse-chunk.csv "$PROD_SERVER:$PROD_PATH/"
scp scripts/reset_to_csv_only.js "$PROD_SERVER:$PROD_PATH/scripts/"
scp scripts/fix_campaign_source_type.js "$PROD_SERVER:$PROD_PATH/scripts/"
scp scripts/sync_clients_from_csv.js "$PROD_SERVER:$PROD_PATH/scripts/"
scp scripts/sync_vendors_from_csv.js "$PROD_SERVER:$PROD_PATH/scripts/"
scp scripts/link_campaign_relationships.js "$PROD_SERVER:$PROD_PATH/scripts/"
scp scripts/create_campaign_groups_from_campaigns.js "$PROD_SERVER:$PROD_PATH/scripts/"
echo "✅ Files uploaded!"
echo ""

# Step 2: Run sync on production
echo "🔄 Step 2/3: Running sync on production..."
ssh "$PROD_SERVER" << 'ENDSSH'
cd /root/arti-project

echo "📊 Importing 653 campaigns..."
node scripts/reset_to_csv_only.js --confirm

echo "🔧 Fixing source and type..."
node scripts/fix_campaign_source_type.js

echo "👥 Syncing clients..."
node scripts/sync_clients_from_csv.js

echo "🏢 Syncing vendors..."
node scripts/sync_vendors_from_csv.js

echo "🔗 Linking relationships..."
node scripts/link_campaign_relationships.js

echo "📦 Creating campaign groups..."
node scripts/create_campaign_groups_from_campaigns.js

echo "✅ Sync complete!"
ENDSSH
echo ""

# Step 3: Verify
echo "✅ Step 3/3: Verifying deployment..."
ssh "$PROD_SERVER" << 'ENDSSH'
cd /root/arti-project
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const campaigns = await supabase.from('spotify_campaigns').select('*', { count: 'exact', head: true });
const clients = await supabase.from('clients').select('*', { count: 'exact', head: true });
const vendors = await supabase.from('vendors').select('*', { count: 'exact', head: true });
const groups = await supabase.from('campaign_groups').select('*', { count: 'exact', head: true });

console.log('\\n📊 Production Database Status:');
console.log(\`   Campaigns:       \${campaigns.count}\`);
console.log(\`   Clients:         \${clients.count}\`);
console.log(\`   Vendors:         \${vendors.count}\`);
console.log(\`   Campaign Groups: \${groups.count}\\n\`);

if (campaigns.count === 653 && clients.count === 203 && vendors.count === 9 && groups.count === 653) {
  console.log('✅ SUCCESS! Production database is clean and matches local!\\n');
} else {
  console.log('⚠️  Warning: Counts don\\'t match expected values\\n');
}
"
ENDSSH

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║     ✅ DEPLOYMENT COMPLETE!                                                ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Production now has exactly 653 campaigns!"
echo "🌐 Check your production URL to verify"
echo ""

