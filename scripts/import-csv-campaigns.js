#!/usr/bin/env node

/**
 * Import campaign data from the Active Campaigns CSV file
 * This will create/update clients, campaigns, and populate initial data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Parse CSV data
function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

// Clean and format client name
function cleanClientName(name) {
  if (!name) return null;
  return name.trim().replace(/\s+/g, ' ');
}

// Extract track ID from URL
function extractTrackId(url) {
  if (!url) return null;
  
  // Try Spotify track URL
  const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
  if (trackMatch) return trackMatch[1];
  
  // Try SFA URL
  const sfaMatch = url.match(/song\/([a-zA-Z0-9]+)/);
  if (sfaMatch) return sfaMatch[1];
  
  return null;
}

// Parse date from various formats
function parseDate(dateStr) {
  if (!dateStr || dateStr === '—' || dateStr === 'Not available') return null;
  
  try {
    // Try to parse MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (e) {
    // ignore
  }
  
  return null;
}

// Parse numeric value
function parseNumber(str) {
  if (!str || str === '—' || str === 'Not available') return 0;
  // Remove $ and ,
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

async function importCSVCampaigns() {
  try {
    console.log('📊 Importing campaigns from CSV...\n');

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
    
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'Spotify Playlisting-Active Campaigns.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const campaigns = parseCSV(csvPath);
    console.log(`📁 Found ${campaigns.length} campaigns in CSV\n`);

    let clientsCreated = 0;
    let clientsUpdated = 0;
    let campaignsCreated = 0;
    let campaignsSkipped = 0;
    const clientMap = new Map(); // Cache clients

    for (const campaign of campaigns) {
      try {
        const clientName = cleanClientName(campaign.Client);
        if (!clientName) {
          console.log(`⚠️  Skipping campaign "${campaign.Campaign}": No client name`);
          campaignsSkipped++;
          continue;
        }

        // Get or create client
        let clientId;
        if (clientMap.has(clientName)) {
          clientId = clientMap.get(clientName);
        } else {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('name', clientName)
            .eq('org_id', defaultOrgId)
            .single();

          if (existingClient) {
            clientId = existingClient.id;
            clientsUpdated++;
          } else {
            // Create new client
            const { data: newClient, error: clientError } = await supabase
              .from('clients')
              .insert({
                name: clientName,
                org_id: defaultOrgId,
                email: campaign['Email 2 (from Clients)'] || null
              })
              .select()
              .single();

            if (clientError) {
              console.log(`   ❌ Error creating client "${clientName}": ${clientError.message}`);
              campaignsSkipped++;
              continue;
            }

            clientId = newClient.id;
            clientsCreated++;
            console.log(`   ✅ Created client: ${clientName}`);
          }

          clientMap.set(clientName, clientId);
        }

        // Extract track ID from URL or SFA
        const trackId = extractTrackId(campaign.URL || campaign.SFA);
        
        // Parse campaign data
        const campaignName = campaign.Campaign?.trim();
        const goal = parseNumber(campaign.Goal);
        const remaining = parseNumber(campaign.Remaining);
        const startDate = parseDate(campaign['Start Date']);
        const salePrice = parseNumber(campaign['Sale price']);
        const vendor = campaign.Vendor?.trim() || null;
        const status = campaign.Status?.trim() || 'Active';
        const notes = campaign.Notes?.trim() || null;

        if (!campaignName) {
          console.log(`⚠️  Skipping: No campaign name`);
          campaignsSkipped++;
          continue;
        }

        // Check if campaign already exists (by name and client)
        const { data: existingCampaign } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign', campaignName)
          .eq('client_id', clientId)
          .single();

        if (existingCampaign) {
          console.log(`   ⏭️  Campaign "${campaignName}" already exists for ${clientName}`);
          campaignsSkipped++;
          continue;
        }

        // Check if we have a campaign_group for this artist/campaign
        // Extract artist name from campaign name (before the dash)
        const artistMatch = campaignName.match(/^(.+?)\s*-\s*(.+)$/);
        const artistName = artistMatch ? artistMatch[1].trim() : clientName;
        const songName = artistMatch ? artistMatch[2].trim() : campaignName;

        // Get or create campaign group
        let campaignGroupId;
        const { data: existingGroup } = await supabase
          .from('campaign_groups')
          .select('id')
          .eq('name', artistName)
          .eq('client_id', clientId)
          .single();

        if (existingGroup) {
          campaignGroupId = existingGroup.id;
        } else {
          const { data: newGroup, error: groupError } = await supabase
            .from('campaign_groups')
            .insert({
              name: artistName,
              client_id: clientId,
              artist_name: artistName,
              total_goal: goal,
              total_budget: salePrice,
              start_date: startDate,
              status: status,
              org_id: defaultOrgId
            })
            .select()
            .single();

          if (groupError) {
            console.log(`   ❌ Error creating campaign group: ${groupError.message}`);
            campaignsSkipped++;
            continue;
          }

          campaignGroupId = newGroup.id;
        }

        // Create spotify_campaign
        const { data: newCampaign, error: campaignError } = await supabase
          .from('spotify_campaigns')
          .insert({
            campaign_group_id: campaignGroupId,
            client_id: clientId,
            campaign: campaignName,
            url: trackId ? `https://open.spotify.com/track/${trackId}` : null,
            sfa: campaign.SFA || null,
            vendor: vendor,
            goal: goal.toString(),
            remaining: remaining.toString(),
            sale_price: salePrice.toString(),
            start_date: startDate,
            daily: '0',
            weekly: '0',
            notes: notes,
            source: 'CSV Import',
            campaign_type: 'Stream Boost',
            org_id: defaultOrgId
          })
          .select()
          .single();

        if (campaignError) {
          console.log(`   ❌ Error creating campaign "${campaignName}": ${campaignError.message}`);
          campaignsSkipped++;
          continue;
        }

        console.log(`✅ Imported: ${campaignName} (Client: ${clientName}, Goal: ${goal})`);
        campaignsCreated++;

      } catch (error) {
        console.log(`❌ Error processing campaign: ${error.message}`);
        campaignsSkipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Clients created: ${clientsCreated}`);
    console.log(`🔄 Existing clients: ${clientsUpdated}`);
    console.log(`✅ Campaigns imported: ${campaignsCreated}`);
    console.log(`⚠️  Campaigns skipped: ${campaignsSkipped}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  importCSVCampaigns()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { importCSVCampaigns };

