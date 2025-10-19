#!/usr/bin/env node

/**
 * Create campaign_playlists records from CSV-imported spotify_campaigns data
 * Parses the historical_playlists and playlist_links fields
 */

const { createClient } = require('@supabase/supabase-js');

async function createPlaylistsFromCsvData() {
  try {
    console.log('🎵 Creating playlists from CSV campaign data...\n');

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

    // Get default org
    const { data: defaultOrg } = await supabase
      .from('orgs')
      .select('id')
      .limit(1)
      .single();

    const defaultOrgId = defaultOrg.id;

    // Get all campaigns with playlist data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('spotify_campaigns')
      .select('id, campaign, vendor, vendor_id, historical_playlists, playlist_links')
      .not('historical_playlists', 'is', null)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      throw campaignsError;
    }

    console.log(`📊 Found ${campaigns.length} campaigns with playlist data\n`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const campaign of campaigns) {
      if (!campaign.vendor_id) {
        console.log(`   ⚠️  Campaign "${campaign.campaign}" has no vendor_id, skipping`);
        skipped++;
        continue;
      }

      // Parse playlist names from historical_playlists (JSON array)
      let playlistsData = [];
      try {
        if (typeof campaign.historical_playlists === 'string') {
          playlistsData = JSON.parse(campaign.historical_playlists);
        } else if (Array.isArray(campaign.historical_playlists)) {
          playlistsData = campaign.historical_playlists;
        }
      } catch (e) {
        console.log(`   ⚠️  Error parsing historical_playlists: ${e.message}`);
        skipped++;
        continue;
      }

      console.log(`\n📝 "${campaign.campaign}"`);
      console.log(`   Vendor: ${campaign.vendor}`);
      console.log(`   Playlists: ${playlistsData.length}`);

      // Create campaign_playlists for each playlist
      for (const playlistObj of playlistsData) {
        if (!playlistObj || !playlistObj.name) continue;

        // Clean up playlist name (remove "- " prefix)
        let cleanName = playlistObj.name
          .replace(/^-\s*/, '')
          .trim();

        if (!cleanName) continue;

        // Check if this playlist already exists for this campaign
        const { data: existing } = await supabase
          .from('campaign_playlists')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('vendor_id', campaign.vendor_id)
          .eq('playlist_name', cleanName)
          .single();

        if (existing) {
          console.log(`   ⏭️  Already exists: ${cleanName}`);
          skipped++;
          continue;
        }

        // Check if this is an algorithmic playlist
        const algorithmicKeywords = ['discover weekly', 'release radar', 'daily mix', 'radio', 'your dj', 'daylist', 'smart shuffle'];
        const isAlgorithmic = algorithmicKeywords.some(keyword => 
          cleanName.toLowerCase().includes(keyword)
        );

        // Mark if this is a new playlist from the CSV
        const isNew = playlistObj.isNew === true || playlistObj.isNew === 'true';

        // Insert new campaign_playlist
        const { error: insertError} = await supabase
          .from('campaign_playlists')
          .insert({
            campaign_id: campaign.id,
            vendor_id: campaign.vendor_id,
            playlist_name: cleanName,
            is_algorithmic: isAlgorithmic,
            is_new: isNew,
            added_via_csv: true,
            streams_28d: 0, // Will be populated by scraper
            org_id: defaultOrgId
          });

        if (insertError) {
          console.log(`   ❌ Error inserting "${cleanName}": ${insertError.message}`);
          errors++;
        } else {
          const emoji = isAlgorithmic ? '🎧' : '🎵';
          console.log(`   ${emoji} Created: ${cleanName}`);
          inserted++;
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ PLAYLIST CREATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Playlists created: ${inserted}`);
    console.log(`⏭️  Already existed: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createPlaylistsFromCsvData();

