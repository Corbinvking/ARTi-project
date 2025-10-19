#!/usr/bin/env node

/**
 * Create missing vendor "Majed" and link their campaigns with playlists
 */

const { createClient } = require('@supabase/supabase-js');

async function createMissingVendorAndPlaylists() {
  try {
    console.log('🔧 Creating Missing Vendor and Playlists...\n');

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

    const defaultOrgId = defaultOrg?.id;

    // Step 1: Create vendor "Majed" if doesn't exist
    console.log('📝 Creating vendor "Majed"...');
    
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id, name')
      .ilike('name', 'Majed')
      .single();

    let vendorId;
    
    if (existingVendor) {
      console.log(`   ✅ Vendor "Majed" already exists (ID: ${existingVendor.id})`);
      vendorId = existingVendor.id;
    } else {
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          name: 'Majed',
          cost_per_1k_streams: 0,
          org_id: defaultOrgId
        })
        .select()
        .single();

      if (vendorError) {
        throw vendorError;
      }

      vendorId = newVendor.id;
      console.log(`   ✅ Created vendor "Majed" (ID: ${vendorId})`);
    }

    // Step 2: Update campaigns with vendor_id
    console.log('\n📝 Linking campaigns to vendor...');
    
    const { data: updatedCampaigns, error: updateError } = await supabase
      .from('spotify_campaigns')
      .update({ vendor_id: vendorId })
      .eq('vendor', 'Majed')
      .is('vendor_id', null)
      .select('id, campaign');

    if (updateError) {
      throw updateError;
    }

    console.log(`   ✅ Updated ${updatedCampaigns.length} campaigns with vendor_id`);
    updatedCampaigns.forEach(c => {
      console.log(`      - ${c.campaign}`);
    });

    // Step 3: Create campaign_playlists for these campaigns
    console.log('\n📝 Creating playlists for Majed campaigns...');
    
    const { data: majedCampaigns } = await supabase
      .from('spotify_campaigns')
      .select('id, campaign, historical_playlists, vendor_id')
      .eq('vendor', 'Majed')
      .not('historical_playlists', 'is', null);

    let playlistsCreated = 0;

    for (const campaign of majedCampaigns) {
      const playlists = campaign.historical_playlists || [];
      
      for (const playlistObj of playlists) {
        const playlistName = playlistObj.name?.trim();
        if (!playlistName) continue;

        // Check if playlist already exists
        const { data: existing } = await supabase
          .from('campaign_playlists')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('playlist_name', playlistName)
          .single();

        if (existing) {
          console.log(`   ⏭️  Playlist "${playlistName}" already exists for "${campaign.campaign}"`);
          continue;
        }

        // Check if algorithmic
        const algorithmicKeywords = ['discover weekly', 'release radar', 'daily mix', 'radio', 'your dj', 'daylist', 'smart shuffle'];
        const isAlgorithmic = algorithmicKeywords.some(keyword => 
          playlistName.toLowerCase().includes(keyword)
        );

        // Insert playlist
        const { error: insertError } = await supabase
          .from('campaign_playlists')
          .insert({
            campaign_id: campaign.id,
            vendor_id: campaign.vendor_id,
            playlist_name: playlistName,
            is_algorithmic: isAlgorithmic,
            streams_28d: 0,
            org_id: defaultOrgId
          });

        if (insertError) {
          console.log(`   ❌ Error inserting "${playlistName}": ${insertError.message}`);
        } else {
          console.log(`   ✅ Created playlist "${playlistName}" for "${campaign.campaign}"`);
          playlistsCreated++;
        }
      }
    }

    console.log(`\n✅ Created ${playlistsCreated} new playlists\n`);

    // Step 4: Verify results
    const { data: majedPlaylistCount } = await supabase
      .from('campaign_playlists')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId);

    const { data: activeMajedCampaigns } = await supabase
      .from('spotify_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .ilike('status', 'active');

    console.log('='.repeat(70));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(70));
    console.log(`✅ Vendor "Majed" ID: ${vendorId}`);
    console.log(`✅ Active Majed campaigns: ${activeMajedCampaigns?.length || 0}`);
    console.log(`✅ Total Majed playlists: ${majedPlaylistCount?.length || 0}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createMissingVendorAndPlaylists();

