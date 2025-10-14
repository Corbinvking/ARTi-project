#!/usr/bin/env node

/**
 * Extract unique clients from campaigns and create client records
 */

const { createClient } = require('@supabase/supabase-js');

async function createClients() {
  try {
    console.log('👥 Creating clients from campaign data...\n');

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

    // Get all unique client names from campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('spotify_campaigns')
      .select('client')
      .not('client', 'is', null)
      .not('client', 'eq', '');

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`);
    }

    console.log(`✅ Found ${campaigns.length} campaigns with client data\n`);

    // Extract unique client names
    const clientNames = new Set();
    campaigns.forEach(campaign => {
      const clientName = campaign.client?.trim();
      if (clientName && clientName !== '' && clientName !== 'N/A' && clientName !== 'TBD') {
        clientNames.add(clientName);
      }
    });

    console.log(`📊 Found ${clientNames.size} unique clients\n`);

    const defaultOrgId = '00000000-0000-0000-0000-000000000001';
    let successCount = 0;
    let errorCount = 0;

    // Create each client
    for (const clientName of Array.from(clientNames).sort()) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: clientName,
            org_id: defaultOrgId
          })
          .select()
          .single();

        if (error) {
          console.warn(`⚠️  Error creating client "${clientName}": ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Created client: ${clientName}`);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠️  Error creating client "${clientName}": ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Client Creation Summary:`);
    console.log(`   ✅ Successfully created: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);

    // Now link campaigns to clients
    console.log(`\n🔗 Linking campaigns to clients...`);

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    // Create client name -> ID map
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.name] = client.id;
    });

    let linkedCount = 0;

    // Link each campaign to its client
    for (const campaign of campaigns) {
      const clientName = campaign.client?.trim();
      const clientId = clientMap[clientName];

      if (clientId) {
        const { error: updateError } = await supabase
          .from('spotify_campaigns')
          .update({ client_id: clientId })
          .eq('client', clientName);

        if (!updateError) {
          linkedCount++;
        }
      }
    }

    console.log(`✅ Linked ${linkedCount} campaigns to clients\n`);

    // Show final stats
    const { data: clientStats } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        spotify_campaigns(count)
      `)
      .order('name');

    if (clientStats) {
      console.log('📊 Client Campaign Counts:');
      console.log('─────────────────────────────────────────────────────────');
      clientStats.forEach(client => {
        const count = client.spotify_campaigns?.[0]?.count || 0;
        if (count > 0) {
          console.log(`   ${client.name.padEnd(50)} ${count} campaigns`);
        }
      });
    }

    console.log('\n✅ Client creation and linking complete!');

  } catch (error) {
    console.error('❌ Error creating clients:', error);
    process.exit(1);
  }
}

createClients();

