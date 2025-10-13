#!/usr/bin/env node

/**
 * Script to directly import client-campaign relationships from database
 * This bypasses the CSV encoding issues
 */

const { createClient } = require('@supabase/supabase-js');

async function directClientImport() {
  try {
    console.log('🔄 Direct client-campaign relationship import...');

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

    // First, clear existing client_id references
    console.log('🧹 Clearing existing client_id references...');
    const { error: clearError } = await supabase
      .from('spotify_campaigns')
      .update({ client_id: null })
      .neq('client_id', null);

    if (clearError) {
      console.warn('⚠️ Error clearing client_id references:', clearError.message);
    }

    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`📊 Found ${clients.length} clients`);

    // Create a map of client names to IDs
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.name] = client.id;
    });

    // Read the original CSV to get campaign data
    const fs = require('fs');
    const path = require('path');
    const csvPath = path.join(__dirname, '../Spotify Playlisting-All Campaigns.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV data
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    console.log('🔍 Processing campaign data...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });

          const clientName = record.Client?.trim();
          const campaignName = record.Campaign?.trim();

          if (!clientName || !campaignName || clientName === '' || campaignName === '') {
            continue;
          }

          const clientId = clientMap[clientName];
          if (!clientId) {
            console.warn(`⚠️ Client not found in database: ${clientName}`);
            errorCount++;
            continue;
          }

          // Update the campaign with client_id
          const { error: updateError } = await supabase
            .from('spotify_campaigns')
            .update({ client_id: clientId })
            .eq('client', clientName);

          if (updateError) {
            console.warn(`⚠️ Error updating campaign ${campaignName}: ${updateError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error processing line ${i}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Update Summary:`);
    console.log(`   ✅ Successful updates: ${successCount}`);
    console.log(`   ❌ Failed updates: ${errorCount}`);

    // Verify the relationships
    const { data: campaignsWithClients, error: verifyError } = await supabase
      .from('spotify_campaigns')
      .select('id, client, client_id, clients(name)')
      .not('client_id', 'is', null)
      .limit(10);

    if (!verifyError && campaignsWithClients) {
      console.log(`\n✅ Verification: ${campaignsWithClients.length} campaigns now have client relationships`);
      campaignsWithClients.forEach(campaign => {
        console.log(`   📋 ${campaign.client} → ${campaign.clients?.name || 'Unknown Client'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error in direct client import:', error);
    process.exit(1);
  }
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
directClientImport();
