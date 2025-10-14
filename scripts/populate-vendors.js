#!/usr/bin/env node

/**
 * Populate vendors table from spotify_campaigns data
 * Extract unique vendors and calculate their metrics
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

async function populateVendors() {
  console.log('🏢 Populating vendors from campaign data...\n');

  // Fetch all campaigns to analyze vendor data
  const { data: campaigns, error: fetchError } = await supabase
    .from('spotify_campaigns')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching campaigns:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Found ${campaigns.length} song placements\n`);

  // Group by vendor and calculate metrics
  const vendorStats = new Map();

  for (const campaign of campaigns) {
    const vendorName = campaign.vendor?.trim();
    
    if (!vendorName || vendorName === '') continue;

    if (!vendorStats.has(vendorName)) {
      vendorStats.set(vendorName, {
        name: vendorName,
        campaign_count: 0,
        total_daily: 0,
        max_daily_per_campaign: 0,
        active_campaigns: 0,
        total_cost: 0,
        total_streams_delivered: 0
      });
    }

    const stats = vendorStats.get(vendorName);
    stats.campaign_count++;

    // Calculate metrics
    const daily = parseInt(campaign.daily) || 0;
    const remaining = parseInt(campaign.remaining) || 0;
    const goal = parseInt(campaign.goal) || 0;
    const delivered = goal - remaining;

    stats.total_daily += daily;
    stats.max_daily_per_campaign = Math.max(stats.max_daily_per_campaign, daily);
    stats.total_streams_delivered += delivered;

    if (campaign.status?.toLowerCase() === 'active') {
      stats.active_campaigns++;
    }

    // Try to parse cost
    const priceStr = campaign.sale_price?.replace(/[$,]/g, '');
    const price = parseFloat(priceStr) || 0;
    stats.total_cost += price;
  }

  console.log(`📊 Found ${vendorStats.size} unique vendors\n`);

  // Create vendor records
  let created = 0;

  for (const [vendorName, stats] of vendorStats) {
    console.log(`\n🏢 Creating vendor: ${vendorName}`);
    console.log(`   Campaigns: ${stats.campaign_count}`);
    console.log(`   Active: ${stats.active_campaigns}`);
    console.log(`   Total Daily: ${stats.total_daily.toLocaleString()}`);
    console.log(`   Max Daily per Campaign: ${stats.max_daily_per_campaign.toLocaleString()}`);

    // Calculate cost per 1k streams
    const costPer1k = stats.total_streams_delivered > 0 
      ? (stats.total_cost / stats.total_streams_delivered) * 1000 
      : 0;

    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: vendorName,
        max_daily_streams: stats.max_daily_per_campaign,
        max_concurrent_campaigns: stats.active_campaigns,
        cost_per_1k_streams: costPer1k.toFixed(2),
        is_active: stats.active_campaigns > 0,
        org_id: '00000000-0000-0000-0000-000000000001'
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Error creating vendor:`, error.message);
      continue;
    }

    created++;
    console.log(`   ✅ Created vendor: ${data.id}`);
    console.log(`   Cost per 1k streams: $${costPer1k.toFixed(2)}`);
  }

  console.log(`\n\n✅ Vendor population complete!`);
  console.log(`   🏢 Created ${created} vendors`);

  // Display vendor summary
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('max_daily_streams', { ascending: false });

  console.log(`\n📊 Vendor Summary:`);
  console.log('─'.repeat(80));
  console.log(`${'Vendor'.padEnd(20)} ${'Max Daily'.padEnd(12)} ${'Active'.padEnd(8)} ${'Cost/1k'.padEnd(10)} ${'Status'}`);
  console.log('─'.repeat(80));
  
  vendors?.forEach(v => {
    console.log(
      `${v.name.padEnd(20)} ${v.max_daily_streams.toString().padEnd(12)} ${v.max_concurrent_campaigns.toString().padEnd(8)} $${v.cost_per_1k_streams.toString().padEnd(9)} ${v.is_active ? '✅ Active' : '⚠️  Inactive'}`
    );
  });
}

populateVendors().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

