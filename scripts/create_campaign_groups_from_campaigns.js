#!/usr/bin/env node
/**
 * Create Campaign Groups from Spotify Campaigns
 * 
 * Creates a campaign_group for each spotify_campaign
 * and links them together
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🔄 Creating campaign groups from spotify campaigns...\n');
  
  // Get all spotify campaigns
  const { data: campaigns, error: fetchError } = await supabase
    .from('spotify_campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching campaigns:', fetchError);
    process.exit(1);
  }
  
  console.log(`📊 Found ${campaigns.length} campaigns\n`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const num = i + 1;
    
    console.log(`[${num}/${campaigns.length}] Processing: ${campaign.campaign || 'Unnamed'}`);
    
    // Check if campaign_group already exists
    if (campaign.campaign_group_id) {
      console.log(`   ⏭️  Already has campaign_group_id`);
      updated++;
      continue;
    }
    
    // Create campaign group
    const groupData = {
      org_id: DEFAULT_ORG_ID,
      client_id: campaign.client_id,
      name: campaign.campaign || 'Unnamed Campaign',
      artist_name: campaign.client || '',
      total_goal: parseInt(campaign.goal) || 0,
      total_budget: parseFloat(campaign.sale_price) || 0,
      start_date: campaign.start_date || campaign.created_at?.split('T')[0],
      status: campaign.status || 'Active',
      invoice_status: campaign.invoice || 'Not Invoiced',
      created_at: campaign.created_at,
      updated_at: new Date().toISOString()
    };
    
    const { data: group, error: groupError } = await supabase
      .from('campaign_groups')
      .insert(groupData)
      .select()
      .single();
    
    if (groupError) {
      console.log(`   ❌ Error creating group: ${groupError.message}`);
      errors++;
      continue;
    }
    
    // Link campaign to group
    const { error: linkError } = await supabase
      .from('spotify_campaigns')
      .update({ campaign_group_id: group.id })
      .eq('id', campaign.id);
    
    if (linkError) {
      console.log(`   ❌ Error linking: ${linkError.message}`);
      errors++;
      continue;
    }
    
    console.log(`   ✅ Created group and linked`);
    created++;
  }
  
  console.log('\n================================================================================');
  console.log('📊 SUMMARY');
  console.log('================================================================================\n');
  console.log(`✅ Created:  ${created}`);
  console.log(`⏭️  Skipped:  ${updated}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📊 Total:    ${campaigns.length}\n`);
  
  console.log('🎉 Campaign groups created!\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

