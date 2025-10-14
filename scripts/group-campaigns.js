#!/usr/bin/env node

/**
 * Script to group spotify_campaigns (songs) into campaign_groups (campaigns)
 * 
 * Logic:
 * - Group songs by: client_id, campaign (song name), start_date, sale_price
 * - Create campaign_group for each unique combination
 * - Link all matching songs to their campaign_group
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

async function groupCampaigns() {
  console.log('🎵 Starting campaign grouping process...\n');

  // Step 1: Fetch all spotify_campaigns
  console.log('📊 Fetching all campaigns...');
  const { data: songs, error: fetchError } = await supabase
    .from('spotify_campaigns')
    .select('*')
    .order('start_date', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching campaigns:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Found ${songs.length} song placements\n`);

  // Step 2: Group songs into campaigns
  // Key: `${client_id}|${campaign}|${start_date}|${sale_price}`
  const campaignGroups = new Map();

  for (const song of songs) {
    // Skip if no campaign name
    if (!song.campaign || song.campaign.trim() === '') {
      console.log(`⚠️  Skipping song ${song.id} - no campaign name`);
      continue;
    }

    // Create grouping key
    const key = `${song.client_id || 'null'}|${song.campaign}|${song.start_date || 'null'}|${song.sale_price || 'null'}`;

    if (!campaignGroups.has(key)) {
      campaignGroups.set(key, {
        client_id: song.client_id,
        name: song.campaign,
        artist_name: extractArtistName(song.campaign),
        start_date: song.start_date,
        salesperson: song.salesperson,
        status: song.status || 'Draft',
        invoice_status: song.invoice || 'Not Invoiced',
        total_budget: parseFloat(song.sale_price?.replace(/[$,]/g, '') || 0),
        total_goal: 0,
        songs: []
      });
    }

    const group = campaignGroups.get(key);
    group.songs.push(song);
    
    // Accumulate total goal
    const goal = parseInt(song.goal) || 0;
    group.total_goal += goal;
  }

  console.log(`📦 Grouped into ${campaignGroups.size} campaigns\n`);

  // Step 3: Create campaign_groups and link songs
  let created = 0;
  let linked = 0;

  for (const [key, group] of campaignGroups) {
    console.log(`\n🎯 Processing campaign: "${group.name}"`);
    console.log(`   Client ID: ${group.client_id || 'N/A'}`);
    console.log(`   Songs: ${group.songs.length}`);
    console.log(`   Total Goal: ${group.total_goal}`);
    console.log(`   Budget: $${group.total_budget}`);

    // Create campaign_group
    const { data: campaignGroup, error: createError } = await supabase
      .from('campaign_groups')
      .insert({
        client_id: group.client_id,
        name: group.name,
        artist_name: group.artist_name,
        total_goal: group.total_goal,
        total_budget: group.total_budget,
        start_date: group.start_date,
        status: normalizeStatus(group.status),
        invoice_status: normalizeInvoiceStatus(group.invoice_status),
        salesperson: group.salesperson
      })
      .select()
      .single();

    if (createError) {
      console.error(`   ❌ Error creating campaign_group:`, createError);
      continue;
    }

    created++;
    console.log(`   ✅ Created campaign_group: ${campaignGroup.id}`);

    // Link all songs to this campaign_group
    const songIds = group.songs.map(s => s.id);
    const { error: updateError } = await supabase
      .from('spotify_campaigns')
      .update({ campaign_group_id: campaignGroup.id })
      .in('id', songIds);

    if (updateError) {
      console.error(`   ❌ Error linking songs:`, updateError);
      continue;
    }

    linked += songIds.length;
    console.log(`   ✅ Linked ${songIds.length} songs`);
  }

  console.log(`\n\n✅ Campaign grouping complete!`);
  console.log(`   📦 Created ${created} campaign groups`);
  console.log(`   🔗 Linked ${linked} songs to campaigns`);
}

/**
 * Extract artist name from campaign name
 * e.g., "Reece Rosé - Back Back" -> "Reece Rosé"
 */
function extractArtistName(campaignName) {
  if (!campaignName) return null;
  
  // Split by " - " and take first part
  const parts = campaignName.split(' - ');
  if (parts.length >= 2) {
    return parts[0].trim();
  }
  
  // If no " - ", return the campaign name
  return campaignName.trim();
}

/**
 * Normalize status values
 */
function normalizeStatus(status) {
  if (!status) return 'Draft';
  
  const normalized = status.trim();
  
  // Map common values
  const statusMap = {
    'Active': 'Active',
    'Pending': 'Pending',
    'Complete': 'Complete',
    'Completed': 'Complete',
    'Cancelled': 'Cancelled',
    'Canceled': 'Cancelled',
    'Unreleased': 'Unreleased',
    'Paused': 'Paused',
    'Draft': 'Draft'
  };
  
  return statusMap[normalized] || 'Draft';
}

/**
 * Normalize invoice status values
 */
function normalizeInvoiceStatus(invoice) {
  if (!invoice) return 'Not Invoiced';
  
  const normalized = invoice.trim();
  
  // Map common values
  const invoiceMap = {
    'Sent': 'Sent',
    'Paid': 'Paid',
    'TBD': 'Not Invoiced',
    'N/A': 'N/A',
    'Not Invoiced': 'Not Invoiced'
  };
  
  return invoiceMap[normalized] || 'Not Invoiced';
}

// Run the script
groupCampaigns().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

