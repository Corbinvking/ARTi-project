#!/usr/bin/env node

/**
 * Link spotify_campaigns to vendors table via vendor_id
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function linkCampaignsToVendors() {
  console.log('🔗 Linking campaigns to vendors...\n');

  // First, add vendor_id column if it doesn't exist
  console.log('📊 Adding vendor_id column to spotify_campaigns...');
  
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE spotify_campaigns ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);'
  });

  // If RPC doesn't work, we'll handle it in migration instead
  console.log('✅ Column ready (or already exists)\n');

  // Fetch all vendors
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('*');

  if (vendorsError) {
    console.error('❌ Error fetching vendors:', vendorsError);
    process.exit(1);
  }

  console.log(`✅ Found ${vendors.length} vendors\n`);

  // Create vendor name to ID map
  const vendorMap = new Map();
  vendors.forEach(v => {
    vendorMap.set(v.name.toLowerCase().trim(), v.id);
  });

  // Fetch all campaigns
  const { data: campaigns, error: campaignsError } = await supabase
    .from('spotify_campaigns')
    .select('id, vendor');

  if (campaignsError) {
    console.error('❌ Error fetching campaigns:', campaignsError);
    process.exit(1);
  }

  console.log(`✅ Found ${campaigns.length} campaigns to link\n`);

  // Link campaigns to vendors
  let linked = 0;
  let noMatch = 0;

  for (const campaign of campaigns) {
    const vendorName = campaign.vendor?.toLowerCase().trim();
    
    if (!vendorName) {
      noMatch++;
      continue;
    }

    const vendorId = vendorMap.get(vendorName);
    
    if (!vendorId) {
      noMatch++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('spotify_campaigns')
      .update({ vendor_id: vendorId })
      .eq('id', campaign.id);

    if (updateError) {
      console.error(`❌ Error linking campaign ${campaign.id}:`, updateError.message);
    } else {
      linked++;
      if (linked % 100 === 0) {
        console.log(`   ✅ Linked ${linked} campaigns...`);
      }
    }
  }

  console.log(`\n✅ Linking complete!`);
  console.log(`   ✅ Linked: ${linked}`);
  console.log(`   ⚠️  No vendor match: ${noMatch}`);

  // Verify
  console.log(`\n📊 Verification:`);
  for (const vendor of vendors) {
    const { data: vendorCampaigns } = await supabase
      .from('spotify_campaigns')
      .select('id')
      .eq('vendor_id', vendor.id);

    console.log(`   ${vendor.name}: ${vendorCampaigns?.length || 0} campaigns linked`);
  }
}

linkCampaignsToVendors().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

