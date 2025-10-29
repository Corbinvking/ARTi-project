#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('🔍 Checking all vendor allocations...\n');

  // Get all vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name');

  console.log(`📋 Total vendors: ${vendors?.length || 0}\n`);

  for (const vendor of vendors || []) {
    const { data: allocations } = await supabase
      .from('campaign_allocations_performance')
      .select('campaign_id')
      .eq('vendor_id', vendor.id);

    const uniqueCampaigns = [...new Set(allocations?.map(a => a.campaign_id) || [])];
    console.log(`${vendor.name}: ${allocations?.length || 0} allocations, ${uniqueCampaigns.length} campaigns`);
  }

  // Check active campaigns
  const { data: activeCampaigns } = await supabase
    .from('campaign_groups')
    .select('id, name, status')
    .eq('status', 'Active');

  console.log(`\n📊 Total Active campaigns in campaign_groups: ${activeCampaigns?.length || 0}`);
}

main().catch(console.error);

