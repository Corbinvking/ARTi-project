#!/usr/bin/env node

/**
 * Rebuild client list with ONLY clean, valid client names
 */

const { createClient } = require('@supabase/supabase-js');

function isValidClientName(name) {
  if (!name || name.trim() === '') return false;
  
  // Reject if it's just numbers
  if (/^\d+$/.test(name)) return false;
  
  // Reject if it contains email addresses
  if (/@/.test(name)) return false;
  
  // Reject if it starts with a date pattern
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(name)) return false;
  
  // Reject if it contains URLs
  if (/https?:\/\//.test(name)) return false;
  
  // Reject if it's a common instruction/note phrase
  const junkPhrases = [
    'please pitch',
    'let us know',
    'adn get the song',
    'dont need referral',
    'if not then go',
    'put clinet name',
    'but then the curator',
    'which is TBD',
    'put the set with',
    'start asap',
    'the curator I worked',
    'almost done',
    'electronic & mainstream',
    'mix Ciara best',
    'mix Dax best',
    'mix Sech',
    'GYM - TEMAZOS',
    'Forza Horizon',
    'Complete | Exceeded',
    'i miss you',
    'please put the single'
  ];
  
  const lowerName = name.toLowerCase();
  if (junkPhrases.some(phrase => lowerName.includes(phrase))) return false;
  
  // Reject if it's mostly numbers and symbols
  const alphaChars = (name.match(/[a-zA-Z]/g) || []).length;
  if (alphaChars < 3) return false;
  
  // Reject common junk patterns
  if (name.includes(',,')) return false;
  if (name.endsWith(',')) return false;
  
  return true;
}

async function rebuildClients() {
  try {
    console.log('🔄 Rebuilding client list with clean data...\n');

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

    const defaultOrgId = '00000000-0000-0000-0000-000000000001';

    // Step 1: Delete ALL existing clients
    console.log('🗑️  Clearing existing clients...');
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.warn(`Warning during delete: ${deleteError.message}`);
    }

    // Step 2: Get unique CLEAN client names from campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('spotify_campaigns')
      .select('client')
      .not('client', 'is', null)
      .not('client', 'eq', '');

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`);
    }

    console.log(`✅ Found ${campaigns.length} campaigns with client data\n`);

    // Extract and filter clean client names
    const clientNames = new Set();
    campaigns.forEach(campaign => {
      const clientName = campaign.client?.trim();
      if (clientName && isValidClientName(clientName)) {
        clientNames.add(clientName);
      }
    });

    console.log(`📊 Found ${clientNames.size} clean, valid clients\n`);

    // Step 3: Create clean clients
    let successCount = 0;
    const sortedNames = Array.from(clientNames).sort();

    for (const clientName of sortedNames) {
      try {
        const { error } = await supabase
          .from('clients')
          .insert({
            name: clientName,
            org_id: defaultOrgId
          });

        if (error) {
          console.warn(`⚠️  Error creating "${clientName}": ${error.message}`);
        } else {
          console.log(`✅ Created: ${clientName}`);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠️  Error creating "${clientName}": ${error.message}`);
      }
    }

    console.log(`\n✅ Created ${successCount} clean clients\n`);

    // Step 4: Link campaigns to clients
    console.log('🔗 Linking campaigns to clients...\n');

    const { data: newClients, error: newClientsError } = await supabase
      .from('clients')
      .select('id, name');

    if (newClientsError) {
      throw new Error(`Failed to fetch new clients: ${newClientsError.message}`);
    }

    // Create client name -> ID map
    const clientMap = {};
    newClients.forEach(client => {
      clientMap[client.name] = client.id;
    });

    let linkedCount = 0;
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

    // Step 5: Link campaign groups to clients
    console.log('🔗 Linking campaign groups to clients...\n');

    const { data: groups } = await supabase
      .from('campaign_groups')
      .select('id, name');

    if (groups) {
      for (const group of groups) {
        // Get the client_id from one of the songs in this group
        const { data: song } = await supabase
          .from('spotify_campaigns')
          .select('client_id')
          .eq('campaign_group_id', group.id)
          .not('client_id', 'is', null)
          .limit(1)
          .single();

        if (song && song.client_id) {
          await supabase
            .from('campaign_groups')
            .update({ client_id: song.client_id })
            .eq('id', group.id);
        }
      }
    }

    // Step 6: Show final stats
    const { data: finalClients } = await supabase
      .from('clients')
      .select(`
        name,
        spotify_campaigns(count)
      `)
      .order('name')
      .limit(30);

    if (finalClients) {
      console.log('📊 Final Client List (Top 30):');
      console.log('─────────────────────────────────────────────────────────');
      finalClients.forEach(client => {
        const count = client.spotify_campaigns?.[0]?.count || 0;
        if (count > 0) {
          console.log(`   ${client.name.padEnd(40)} ${count} campaigns`);
        }
      });
    }

    console.log('\n✅ Client rebuild complete!');

  } catch (error) {
    console.error('❌ Error rebuilding clients:', error);
    process.exit(1);
  }
}

rebuildClients();

