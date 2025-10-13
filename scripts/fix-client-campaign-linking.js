#!/usr/bin/env node

/**
 * Script to properly link campaigns to clients by handling encoding issues
 */

const { createClient } = require('@supabase/supabase-js');

async function fixClientCampaignLinking() {
  try {
    console.log('🔄 Fixing client-campaign linking...');

    // Initialize Supabase client
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
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`📊 Found ${clients.length} clients`);

    // Create a comprehensive client map with various encoding variations
    const clientMap = {};
    clients.forEach(client => {
      const name = client.name;
      clientMap[name] = client.id;

      // Add variations for common encoding issues
      const variations = [
        name,
        name.replace(/Ã©/g, 'é'),
        name.replace(/Ã¡/g, 'á'),
        name.replace(/Ã­/g, 'í'),
        name.replace(/Ã³/g, 'ó'),
        name.replace(/Ãº/g, 'ú'),
        name.replace(/Ã±/g, 'ñ'),
        name.replace(/[^a-zA-Z0-9\s\-&+]/g, ''), // Remove special chars
        name.replace(/Ã©/g, 'e'),
        name.replace(/Ã¡/g, 'a'),
        name.replace(/Ã­/g, 'i'),
        name.replace(/Ã³/g, 'o'),
        name.replace(/Ãº/g, 'u'),
        name.replace(/Ã±/g, 'n'),
        // Common abbreviations and variations
        name.replace(/\s+/g, ''), // Remove spaces
        name.toLowerCase(),
        name.toUpperCase(),
        name.replace(/[^a-zA-Z]/g, ''), // Only letters
      ];

      variations.forEach(variation => {
        if (variation && variation !== name) {
          clientMap[variation] = client.id;
        }
      });
    });

    console.log(`🔍 Created client map with ${Object.keys(clientMap).length} variations`);

    // Get all unlinked campaigns
    const { data: unlinkedCampaigns, error: campaignsError } = await supabase
      .from('spotify_campaigns')
      .select('id, client, campaign')
      .is('client_id', null)
      .not('client', 'is', null)
      .not('client', 'eq', '');

    if (campaignsError) {
      throw new Error(`Failed to fetch unlinked campaigns: ${campaignsError.message}`);
    }

    console.log(`📋 Found ${unlinkedCampaigns.length} unlinked campaigns`);

    let successCount = 0;
    let errorCount = 0;

    // Process each unlinked campaign
    for (const campaign of unlinkedCampaigns) {
      const clientName = campaign.client?.trim();

      if (!clientName || clientName === '' || clientName === 'N/A' || clientName === 'TBD') {
        continue;
      }

      // Try to find the client ID
      let clientId = clientMap[clientName];

      if (!clientId) {
        // Try case-insensitive matching
        const lowerClientName = clientName.toLowerCase();
        for (const [key, id] of Object.entries(clientMap)) {
          if (key.toLowerCase() === lowerClientName) {
            clientId = id;
            break;
          }
        }
      }

      if (!clientId) {
        // Try partial matching
        const lowerClientName = clientName.toLowerCase();
        for (const [key, id] of Object.entries(clientMap)) {
          if (key.toLowerCase().includes(lowerClientName) ||
              lowerClientName.includes(key.toLowerCase())) {
            clientId = id;
            break;
          }
        }
      }

      if (clientId) {
        try {
          const { error: updateError } = await supabase
            .from('spotify_campaigns')
            .update({ client_id: clientId })
            .eq('id', campaign.id);

          if (updateError) {
            console.warn(`⚠️ Error linking campaign ${campaign.campaign}: ${updateError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Error linking campaign ${campaign.campaign}: ${error.message}`);
          errorCount++;
        }
      } else {
        console.warn(`⚠️ No matching client found for: ${clientName}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Linking Summary:`);
    console.log(`   ✅ Successfully linked: ${successCount}`);
    console.log(`   ❌ Failed to link: ${errorCount}`);

    // Verify the results
    const { data: finalStats, error: statsError } = await supabase
      .from('spotify_campaigns')
      .select('client_id')
      .not('client_id', 'is', null);

    if (!statsError) {
      console.log(`\n✅ Final verification: ${finalStats.length} campaigns now linked to clients`);
    }

    // Show top clients by campaign count
    const { data: topClients, error: topError } = await supabase
      .from('clients')
      .select(`
        name,
        spotify_campaigns(count)
      `)
      .order('spotify_campaigns(count)', { ascending: false })
      .limit(10);

    if (!topError && topClients) {
      console.log('\n🏆 Top 10 Clients by Campaign Count:');
      topClients.forEach((client, index) => {
        const count = client.spotify_campaigns?.[0]?.count || 0;
        console.log(`   ${index + 1}. ${client.name}: ${count} campaigns`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing client-campaign linking:', error);
    process.exit(1);
  }
}

// Run the fix
fixClientCampaignLinking();
