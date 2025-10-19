#!/usr/bin/env node

/**
 * Fix duplicate clients and properly link vendors
 */

const { createClient } = require('@supabase/supabase-js');

async function fixDuplicatesAndVendors() {
  try {
    console.log('🔧 Fixing Duplicates and Vendors...\n');

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

    // Step 1: Fix duplicate clients
    console.log('📋 Step 1: Finding and fixing duplicate clients...');
    
    const { data: duplicateGroups } = await supabase
      .from('clients')
      .select('name, id, created_at, emails')
      .order('name, created_at');

    const clientMap = new Map();
    const duplicatesToDelete = [];
    const campaignsToUpdate = [];

    // Group clients by name
    duplicateGroups.forEach(client => {
      if (!clientMap.has(client.name)) {
        clientMap.set(client.name, client);
      } else {
        // This is a duplicate, mark for deletion
        duplicatesToDelete.push(client.id);
        // We'll need to update campaigns pointing to this
        campaignsToUpdate.push({
          oldId: client.id,
          newId: clientMap.get(client.name).id
        });
      }
    });

    console.log(`   ✅ Found ${duplicatesToDelete.length} duplicate clients to remove`);
    console.log(`   ✅ Will keep ${clientMap.size} unique clients`);

    // Update campaigns to point to the kept client
    for (const update of campaignsToUpdate) {
      await supabase
        .from('spotify_campaigns')
        .update({ client_id: update.newId })
        .eq('client_id', update.oldId);

      await supabase
        .from('campaign_groups')
        .update({ client_id: update.newId })
        .eq('client_id', update.oldId);
    }

    console.log(`   ✅ Updated ${campaignsToUpdate.length} campaign references`);

    // Delete duplicate clients
    if (duplicatesToDelete.length > 0) {
      const { error } = await supabase
        .from('clients')
        .delete()
        .in('id', duplicatesToDelete);

      if (error) {
        console.log('   ⚠️  Error deleting duplicates:', error.message);
      } else {
        console.log(`   ✅ Deleted ${duplicatesToDelete.length} duplicate clients`);
      }
    }

    // Step 2: Create vendors from campaign data
    console.log('\n📋 Step 2: Creating vendors from campaign data...');

    const { data: uniqueVendors } = await supabase
      .from('spotify_campaigns')
      .select('vendor')
      .not('vendor', 'is', null)
      .not('vendor', 'eq', '');

    const vendorNames = new Set(uniqueVendors.map(v => v.vendor));
    console.log(`   ✅ Found ${vendorNames.size} unique vendor names in campaigns`);

    // Get existing vendors
    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('name, id');

    const existingVendorMap = new Map(existingVendors.map(v => [v.name, v.id]));

    // Get default org
    const { data: defaultOrg } = await supabase
      .from('orgs')
      .select('id')
      .limit(1)
      .single();

    const defaultOrgId = defaultOrg.id;

    let vendorsCreated = 0;

    // Create missing vendors
    for (const vendorName of vendorNames) {
      if (!existingVendorMap.has(vendorName)) {
        const { data: newVendor, error } = await supabase
          .from('vendors')
          .insert({
            name: vendorName,
            org_id: defaultOrgId,
            status: 'active'
          })
          .select()
          .single();

        if (!error && newVendor) {
          existingVendorMap.set(vendorName, newVendor.id);
          vendorsCreated++;
          console.log(`   ✅ Created vendor: ${vendorName}`);
        }
      }
    }

    console.log(`   ✅ Created ${vendorsCreated} new vendors`);

    // Step 3: Link campaigns to vendors via vendor_id
    console.log('\n📋 Step 3: Linking campaigns to vendors...');

    let campaignsLinked = 0;

    for (const [vendorName, vendorId] of existingVendorMap.entries()) {
      const { error } = await supabase
        .from('spotify_campaigns')
        .update({ vendor_id: vendorId })
        .eq('vendor', vendorName)
        .is('vendor_id', null);

      if (!error) {
        const { count } = await supabase
          .from('spotify_campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('vendor', vendorName);

        campaignsLinked += count || 0;
        console.log(`   ✅ Linked ${count} campaigns to ${vendorName}`);
      }
    }

    console.log(`\n✅ Total campaigns linked to vendors: ${campaignsLinked}`);

    // Step 4: Update playlist-vendor links
    console.log('\n📋 Step 4: Updating campaign_playlists vendor links...');

    const { data: campaignPlaylists } = await supabase
      .from('campaign_playlists')
      .select('id, campaign_id');

    let playlistsLinked = 0;

    for (const playlist of campaignPlaylists) {
      // Get the campaign's vendor_id
      const { data: campaign } = await supabase
        .from('spotify_campaigns')
        .select('vendor_id')
        .eq('id', playlist.campaign_id)
        .single();

      if (campaign && campaign.vendor_id) {
        await supabase
          .from('campaign_playlists')
          .update({ vendor_id: campaign.vendor_id })
          .eq('id', playlist.id);

        playlistsLinked++;
      }
    }

    console.log(`   ✅ Linked ${playlistsLinked} playlists to vendors`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ CLEANUP SUMMARY');
    console.log('='.repeat(70));
    console.log(`🗑️  Duplicate clients removed: ${duplicatesToDelete.length}`);
    console.log(`👥 Unique clients remaining: ${clientMap.size}`);
    console.log(`🏢 Vendors created: ${vendorsCreated}`);
    console.log(`🔗 Campaigns linked to vendors: ${campaignsLinked}`);
    console.log(`🎵 Playlists linked to vendors: ${playlistsLinked}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDuplicatesAndVendors();

