#!/usr/bin/env node
/**
 * Check vendor1 (Club Restricted) campaign allocations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkVendorCampaigns() {
  console.log('🔍 Checking vendor1 (Club Restricted) campaign allocations...\n');

  // 1. Get vendor1 user
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  const vendor1User = users.find(u => u.email === 'vendor1@arti-demo.com');
  if (!vendor1User) {
    console.error('❌ vendor1@arti-demo.com not found');
    return;
  }
  console.log(`✅ Found vendor1 user: ${vendor1User.id}\n`);

  // 2. Get vendor association
  const { data: vendorUsers, error: vendorUsersError } = await supabase
    .from('vendor_users')
    .select('vendor_id, vendors(id, name)')
    .eq('user_id', vendor1User.id);

  if (vendorUsersError) {
    console.error('❌ Error fetching vendor association:', vendorUsersError);
    return;
  }

  if (!vendorUsers || vendorUsers.length === 0) {
    console.error('❌ No vendor association found for vendor1');
    return;
  }

  const vendorId = vendorUsers[0].vendor_id;
  const vendorName = vendorUsers[0].vendors?.name;
  console.log(`✅ Vendor association: ${vendorName} (${vendorId})\n`);

  // 3. Check campaign allocations for this vendor
  const { data: allocations, error: allocError } = await supabase
    .from('campaign_allocations_performance')
    .select('campaign_id, allocated_streams, actual_streams, payment_status')
    .eq('vendor_id', vendorId);

  if (allocError) {
    console.error('❌ Error fetching allocations:', allocError);
    return;
  }

  console.log(`📊 Total allocations: ${allocations?.length || 0}\n`);

  if (!allocations || allocations.length === 0) {
    console.log('⚠️  No campaign allocations found for this vendor');
    console.log('   This means the vendor has no active campaigns assigned.\n');
    return;
  }

  // 4. Get unique campaign IDs
  const campaignIds = [...new Set(allocations.map(a => a.campaign_id))];
  console.log(`📋 Unique campaigns with allocations: ${campaignIds.length}\n`);

  // 5. Check how many are "Active"
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaign_groups')
    .select('id, name, status')
    .in('id', campaignIds);

  if (campaignsError) {
    console.error('❌ Error fetching campaigns:', campaignsError);
    return;
  }

  const activeCampaigns = campaigns?.filter(c => c.status === 'Active') || [];
  const otherCampaigns = campaigns?.filter(c => c.status !== 'Active') || [];

  console.log(`✅ Active campaigns: ${activeCampaigns.length}`);
  console.log(`⏸️  Other status campaigns: ${otherCampaigns.length}\n`);

  if (activeCampaigns.length > 0) {
    console.log('📝 Active campaigns:');
    activeCampaigns.slice(0, 10).forEach(c => {
      console.log(`   - ${c.name} (${c.id})`);
    });
    if (activeCampaigns.length > 10) {
      console.log(`   ... and ${activeCampaigns.length - 10} more`);
    }
  }

  if (otherCampaigns.length > 0) {
    console.log('\n📝 Campaign statuses breakdown:');
    const statusCounts = otherCampaigns.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
  }

  console.log('\n✨ Summary:');
  console.log(`   - Vendor: ${vendorName}`);
  console.log(`   - Total allocations: ${allocations.length}`);
  console.log(`   - Campaigns with allocations: ${campaignIds.length}`);
  console.log(`   - Active campaigns: ${activeCampaigns.length}`);
  console.log(`   - Should see in vendor portal: ${activeCampaigns.length} campaigns`);
}

checkVendorCampaigns().catch(console.error);

