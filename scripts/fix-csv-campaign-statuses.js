#!/usr/bin/env node

/**
 * Fix status for CSV-imported campaigns
 * All CSV-imported campaigns should have status = 'Active'
 */

const { createClient } = require('@supabase/supabase-js');

async function fixCampaignStatuses() {
  try {
    console.log('🔧 Fixing CSV Campaign Statuses...\n');

    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Update spotify_campaigns status
    console.log('📝 Updating spotify_campaigns...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('spotify_campaigns')
      .update({ status: 'Active' })
      .eq('source', 'CSV Import (Full)')
      .is('status', null)
      .select('id');

    if (campaignsError) {
      throw campaignsError;
    }

    console.log(`✅ Updated ${campaigns?.length || 0} spotify_campaigns to status = 'Active'\n`);

    // Update campaign_groups status
    console.log('📝 Updating campaign_groups...');
    const { data: groups, error: groupsError } = await supabase
      .from('campaign_groups')
      .update({ status: 'active' })
      .is('status', null)
      .select('id');

    if (groupsError) {
      throw groupsError;
    }

    console.log(`✅ Updated ${groups?.length || 0} campaign_groups to status = 'active'\n`);

    // Verify results
    const { data: activeCount } = await supabase
      .from('spotify_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Active')
      .eq('source', 'CSV Import (Full)');

    const { data: groupActiveCount } = await supabase
      .from('campaign_groups')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    console.log('='.repeat(70));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(70));
    console.log(`✅ spotify_campaigns with status='Active' (CSV): ${activeCount?.length || 0}`);
    console.log(`✅ campaign_groups with status='active': ${groupActiveCount?.length || 0}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixCampaignStatuses();

