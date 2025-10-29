#!/usr/bin/env node
/**
 * Check what data exists for each vendor
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('📊 Checking vendor data...\n');

  // Get all vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .in('name', ['Club Restricted', 'Glenn', 'Majed']);

  for (const vendor of vendors) {
    console.log(`\n🏢 ${vendor.name} (${vendor.id})`);
    console.log('─'.repeat(60));

    // Check playlists
    const { data: playlists } = await supabase
      .from('playlists')
      .select('*')
      .eq('vendor_id', vendor.id);
    
    console.log(`  📋 Playlists: ${playlists?.length || 0}`);
    if (playlists && playlists.length > 0) {
      playlists.slice(0, 3).forEach(p => {
        console.log(`     - ${p.name} (${p.avg_daily_streams} daily streams)`);
      });
      if (playlists.length > 3) {
        console.log(`     ... and ${playlists.length - 3} more`);
      }
    }

    // Check campaign_playlists
    const { data: campaignPlaylists } = await supabase
      .from('campaign_playlists')
      .select(`
        id,
        playlist_name,
        streams_7d,
        campaign_id,
        spotify_campaigns!inner (
          campaign_name
        )
      `)
      .eq('vendor_id', vendor.id);
    
    console.log(`  🎵 Campaign Playlists: ${campaignPlaylists?.length || 0}`);
    if (campaignPlaylists && campaignPlaylists.length > 0) {
      // Group by campaign
      const byCampaign = campaignPlaylists.reduce((acc, cp) => {
        const campaignName = cp.spotify_campaigns?.campaign_name || 'Unknown';
        if (!acc[campaignName]) acc[campaignName] = [];
        acc[campaignName].push(cp);
        return acc;
      }, {});

      Object.entries(byCampaign).slice(0, 3).forEach(([campaign, playlists]) => {
        const totalStreams = playlists.reduce((sum, p) => sum + (p.streams_7d || 0), 0);
        console.log(`     - ${campaign}: ${playlists.length} playlists, ${totalStreams.toLocaleString()} streams (7d)`);
      });
      
      const campaignCount = Object.keys(byCampaign).length;
      if (campaignCount > 3) {
        console.log(`     ... and ${campaignCount - 3} more campaigns`);
      }
    }

    // Check vendor_users
    const { data: vendorUsers } = await supabase
      .from('vendor_users')
      .select(`
        user_id,
        users (
          email
        )
      `)
      .eq('vendor_id', vendor.id);
    
    console.log(`  👤 Users: ${vendorUsers?.length || 0}`);
    vendorUsers?.forEach(vu => {
      console.log(`     - ${vu.users?.email}`);
    });
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);

