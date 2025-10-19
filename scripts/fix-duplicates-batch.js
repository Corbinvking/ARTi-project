#!/usr/bin/env node

/**
 * Fix duplicate clients in batches
 */

const { createClient } = require('@supabase/supabase-js');

async function fixDuplicatesBatch() {
  try {
    console.log('🔧 Fixing Duplicate Clients (Batch Processing)...\n');

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

    // Get all clients
    const { data: allClients } = await supabase
      .from('clients')
      .select('name, id, created_at')
      .order('name, created_at');

    // Group by name
    const nameGroups = new Map();
    allClients.forEach(client => {
      if (!nameGroups.has(client.name)) {
        nameGroups.set(client.name, []);
      }
      nameGroups.get(client.name).push(client);
    });

    console.log(`Total clients: ${allClients.length}`);
    console.log(`Unique client names: ${nameGroups.size}\n`);

    let totalUpdated = 0;
    let totalDeleted = 0;

    // Process each group
    for (const [name, clients] of nameGroups.entries()) {
      if (clients.length > 1) {
        const keepClient = clients[0]; // Keep the oldest
        const duplicates = clients.slice(1); // Delete the rest

        console.log(`Processing "${name}" (${clients.length} copies)...`);

        // Update campaigns and campaign_groups
        for (const duplicate of duplicates) {
          // Update spotify_campaigns
          const { error: campaignError, count: campaignCount } = await supabase
            .from('spotify_campaigns')
            .update({ client_id: keepClient.id })
            .eq('client_id', duplicate.id)
            .select('*', { count: 'exact', head: true });

          if (!campaignError && campaignCount) {
            console.log(`   ✅ Updated ${campaignCount} campaigns from duplicate to ${keepClient.id}`);
            totalUpdated += campaignCount;
          }

          // Update campaign_groups
          const { error: groupError } = await supabase
            .from('campaign_groups')
            .update({ client_id: keepClient.id })
            .eq('client_id', duplicate.id);

          if (!groupError) {
            console.log(`   ✅ Updated campaign_groups`);
          }

          // Now delete the duplicate
          const { error: deleteError } = await supabase
            .from('clients')
            .delete()
            .eq('id', duplicate.id);

          if (!deleteError) {
            console.log(`   🗑️  Deleted duplicate client ${duplicate.id}`);
            totalDeleted++;
          } else {
            console.log(`   ⚠️  Error deleting ${duplicate.id}: ${deleteError.message}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ DUPLICATE CLEANUP SUMMARY');
    console.log('='.repeat(70));
    console.log(`🔄 Total campaign references updated: ${totalUpdated}`);
    console.log(`🗑️  Total duplicate clients deleted: ${totalDeleted}`);
    console.log(`👥 Unique clients remaining: ${nameGroups.size}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicatesBatch();

