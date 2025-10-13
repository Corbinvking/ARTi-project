#!/usr/bin/env node

/**
 * Script to fix campaign names in the database by reading from the original CSV
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function fixCampaignNames() {
  try {
    console.log('🔄 Fixing campaign names in database...');

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

    // Read the original CSV file
    const csvPath = path.join(__dirname, '../Spotify Playlisting-All Campaigns.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV data
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    console.log('📊 Processing CSV data...');

    let updateCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });

          const campaignName = record.Campaign?.trim();
          const clientName = record.Client?.trim();

          if (campaignName && clientName && campaignName !== '' && clientName !== '') {
            // Find the campaign in the database
            const { data: campaigns, error: findError } = await supabase
              .from('spotify_campaigns')
              .select('id')
              .eq('client', clientName)
              .limit(10);

            if (findError) {
              console.warn(`⚠️ Error finding campaigns for client ${clientName}: ${findError.message}`);
              errorCount++;
              continue;
            }

            if (campaigns && campaigns.length > 0) {
              // Update the first matching campaign with the correct name
              const { error: updateError } = await supabase
                .from('spotify_campaigns')
                .update({ campaign: campaignName })
                .eq('id', campaigns[0].id);

              if (updateError) {
                console.warn(`⚠️ Error updating campaign ${campaignName}: ${updateError.message}`);
                errorCount++;
              } else {
                updateCount++;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error processing line ${i}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Update Summary:`);
    console.log(`   ✅ Successfully updated: ${updateCount}`);
    console.log(`   ❌ Failed updates: ${errorCount}`);

    // Verify some results
    const { data: sampleCampaigns, error: sampleError } = await supabase
      .from('spotify_campaigns')
      .select('campaign, client')
      .not('campaign', 'is', null)
      .not('campaign', 'eq', '')
      .limit(5);

    if (!sampleError && sampleCampaigns) {
      console.log(`\n✅ Sample campaigns with names:`);
      sampleCampaigns.forEach(campaign => {
        console.log(`   📋 ${campaign.campaign} (${campaign.client})`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing campaign names:', error);
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

// Run the fix
fixCampaignNames();
