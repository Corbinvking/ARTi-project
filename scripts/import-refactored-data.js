#!/usr/bin/env node

/**
 * Script to import refactored client-centric data
 * This script imports the clients.csv and campaigns.csv files
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function importRefactoredData() {
  try {
    console.log('🔄 Importing refactored client-centric data...');

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

    // Read and parse clients CSV
    const clientsCsvPath = path.join(__dirname, '../refactored-data/clients.csv');
    const clientsCsv = fs.readFileSync(clientsCsvPath, 'utf8');
    const clientsData = parseCSV(clientsCsv);

    console.log(`📊 Found ${clientsData.length} clients to import`);

    // Import clients
    const clientsToInsert = clientsData.map(client => ({
      name: client.client_name.replace(/"/g, ''),
      emails: client.client_email ? [client.client_email.replace(/"/g, '')] : [],
      org_id: '00000000-0000-0000-0000-000000000001'
    }));

    console.log('📝 Inserting clients...');
    const insertedClients = [];

    for (const clientData of clientsToInsert) {
      // Check if client already exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('name', clientData.name)
        .eq('org_id', clientData.org_id)
        .single();

      if (existingClient) {
        insertedClients.push(existingClient);
      } else {
        // Insert new client
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (insertError) {
          console.warn(`⚠️ Failed to insert client ${clientData.name}: ${insertError.message}`);
        } else {
          insertedClients.push(newClient);
        }
      }
    }

    console.log(`✅ Inserted/updated ${insertedClients.length} clients`);

    // Read and parse campaigns CSV
    const campaignsCsvPath = path.join(__dirname, '../refactored-data/campaigns.csv');
    const campaignsCsv = fs.readFileSync(campaignsCsvPath, 'utf8');
    const campaignsData = parseCSV(campaignsCsv);

    console.log(`📊 Found ${campaignsData.length} campaigns to import`);

    // Create a map of client names to client IDs
    const clientMap = {};
    insertedClients.forEach(client => {
      if (client.name) {
        clientMap[client.name] = client.id;

        // Also create variations for matching with encoding issues
        const variations = [
          client.name,
          client.name.replace(/Ã©/g, 'é'),
          client.name.replace(/Ã¡/g, 'á'),
          client.name.replace(/Ã­/g, 'í'),
          client.name.replace(/Ã³/g, 'ó'),
          client.name.replace(/Ãº/g, 'ú'),
          client.name.replace(/Ã±/g, 'ñ'),
          client.name.replace(/[^a-zA-Z0-9\s\-&+]/g, ''), // Remove special chars
          // Common substitutions for corrupted characters
          client.name.replace(/Ã©/g, 'e'),
          client.name.replace(/Ã¡/g, 'a'),
          client.name.replace(/Ã­/g, 'i'),
          client.name.replace(/Ã³/g, 'o'),
          client.name.replace(/Ãº/g, 'u'),
          client.name.replace(/Ã±/g, 'n')
        ];

        variations.forEach(variation => {
          if (variation !== client.name) {
            clientMap[variation] = client.id;
          }
        });
      }
    });

    // Import campaigns with client_id references
    const campaignsToInsert = campaignsData.map(campaign => {
      let clientName = campaign.client_name.replace(/"/g, '');

      // Try to find the client with various encoding variations
      let clientId = clientMap[clientName];

      // If not found, try various normalization approaches
      if (!clientId) {
        const variations = [
          clientName,
          clientName.replace(/Ã©/g, 'é'),
          clientName.replace(/Ã¡/g, 'á'),
          clientName.replace(/Ã­/g, 'í'),
          clientName.replace(/Ã³/g, 'ó'),
          clientName.replace(/Ãº/g, 'ú'),
          clientName.replace(/Ã±/g, 'ñ'),
          clientName.replace(/[^a-zA-Z0-9\s\-&+]/g, ''), // Remove special chars
          clientName.replace(/Ã©/g, 'e'),
          clientName.replace(/Ã¡/g, 'a'),
          clientName.replace(/Ã­/g, 'i'),
          clientName.replace(/Ã³/g, 'o'),
          clientName.replace(/Ãº/g, 'u'),
          clientName.replace(/Ã±/g, 'n')
        ];

        for (const variation of variations) {
          if (clientMap[variation]) {
            clientId = clientMap[variation];
            break;
          }
        }
      }

      if (!clientId) {
        console.warn(`⚠️ Client not found: ${clientName} (raw: ${campaign.client_name})`);
        return null;
      }

      return {
        client_id: clientId,
        campaign: campaign.campaign_name.replace(/"/g, ''),
        goal: parseInt(campaign.goal) || 0,
        remaining: parseInt(campaign.remaining) || 0,
        daily: parseInt(campaign.daily) || 0,
        weekly: parseInt(campaign.weekly) || 0,
        url: campaign.url.replace(/"/g, ''),
        sale_price: parseFloat(campaign.sale_price) || 0,
        start_date: campaign.start_date.replace(/"/g, ''),
        status: campaign.status.replace(/"/g, ''),
        vendor: campaign.vendor.replace(/"/g, ''),
        curator_status: campaign.curator_status.replace(/"/g, ''),
        playlists: campaign.playlists.replace(/"/g, ''),
        notes: campaign.notes.replace(/"/g, ''),
        last_modified: campaign.last_modified.replace(/"/g, ''),
        sp_vendor_updates: campaign.sp_vendor_updates.replace(/"/g, ''),
        spotify_campaign: campaign.spotify_campaign.replace(/"/g, ''),
        org_id: '00000000-0000-0000-0000-000000000001'
      };
    }).filter(Boolean);

    console.log('📝 Inserting campaigns...');
    const insertedCampaigns = [];

    for (const campaignData of campaignsToInsert) {
      // Check if campaign already exists for this client
      const { data: existingCampaign } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('campaign', campaignData.campaign)
        .eq('client_id', campaignData.client_id)
        .single();

      if (existingCampaign) {
        insertedCampaigns.push(existingCampaign);
      } else {
        // Insert new campaign
        const { data: newCampaign, error: insertError } = await supabase
          .from('spotify_campaigns')
          .insert(campaignData)
          .select()
          .single();

        if (insertError) {
          console.warn(`⚠️ Failed to insert campaign ${campaignData.campaign}: ${insertError.message}`);
        } else {
          insertedCampaigns.push(newCampaign);
        }
      }
    }

    console.log(`✅ Inserted/updated ${insertedCampaigns.length} campaigns`);

    // Generate summary statistics
    const totalCampaigns = insertedCampaigns.length;
    const activeCampaigns = insertedCampaigns.filter(c => c.status === 'Active').length;
    const totalGoal = insertedCampaigns.reduce((sum, c) => sum + c.goal, 0);

    console.log('\n📈 Import Summary:');
    console.log(`   👥 Total Clients: ${insertedClients.length}`);
    console.log(`   📋 Total Campaigns: ${totalCampaigns}`);
    console.log(`   ✅ Active Campaigns: ${activeCampaigns}`);
    console.log(`   🎯 Total Goal Streams: ${totalGoal.toLocaleString()}`);

    // Show top clients by campaign count
    const clientCampaignCounts = {};
    insertedCampaigns.forEach(campaign => {
      const clientId = campaign.client_id;
      if (!clientCampaignCounts[clientId]) {
        clientCampaignCounts[clientId] = 0;
      }
      clientCampaignCounts[clientId]++;
    });

    const topClients = Object.entries(clientCampaignCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([clientId, count]) => {
        const client = insertedClients.find(c => c.id === clientId);
        return { name: client?.client_name || 'Unknown', count };
      });

    console.log('\n🏆 Top 10 Clients by Campaign Count:');
    topClients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name}: ${client.count} campaigns`);
    });

  } catch (error) {
    console.error('❌ Error importing refactored data:', error);
    process.exit(1);
  }
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      records.push(record);
    }
  }

  return records;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  values.push(current.trim());

  return values;
}

// Run the import
importRefactoredData();
