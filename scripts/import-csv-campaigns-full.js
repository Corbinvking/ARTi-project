#!/usr/bin/env node

/**
 * COMPREHENSIVE CSV Import - Captures ALL data from Active Campaigns CSV
 * This version imports every single column with proper handling
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Parse CSV data
function parseCSV(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM if present
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Handle inconsistent columns
    bom: true // Handle UTF-8 BOM
  });
  return records;
}

// Clean client name
function cleanClientName(name) {
  if (!name) return null;
  return name.trim().replace(/\s+/g, ' ');
}

// Extract track ID from URL
function extractTrackId(url) {
  if (!url) return null;
  const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
  if (trackMatch) return trackMatch[1];
  const sfaMatch = url.match(/song\/([a-zA-Z0-9]+)/);
  if (sfaMatch) return sfaMatch[1];
  return null;
}

// Parse date
function parseDate(dateStr) {
  if (!dateStr || dateStr === '—' || dateStr === 'Not available') return null;
  
  try {
    // First, check for pm/am in the string and extract it
    const ampmMatch = dateStr.match(/(am|pm)/i);
    const ampm = ampmMatch ? ampmMatch[0].toLowerCase() : null;
    
    // Remove pm/am from the string before splitting
    const cleanedStr = dateStr.replace(/(am|pm)/gi, '').trim();
    const parts = cleanedStr.split(/[\/\s:]+/).filter(p => p);
    
    if (parts.length >= 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // Handle time if present
      if (parts.length > 3 && ampm) {
        const hour = parts[3] || '12';
        const minute = parts[4] || '00';
        
        let hour24 = parseInt(hour);
        if (ampm === 'pm' && hour24 !== 12) hour24 += 12;
        if (ampm === 'am' && hour24 === 12) hour24 = 0;
        
        return `${year}-${month}-${day} ${hour24.toString().padStart(2, '0')}:${minute}:00`;
      }
      
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.log(`   ⚠️  Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

// Parse number
function parseNumber(str) {
  if (!str || str === '—' || str === 'Not available' || str === '') return 0;
  return parseInt(str.replace(/[$,]/g, '')) || 0;
}

// Parse decimal/currency
function parseDecimal(str) {
  if (!str || str === '—' || str === 'Not available' || str === '') return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

// Check boolean flags
function parseBoolean(str) {
  if (!str || str.trim() === '') return false;
  const lower = str.toLowerCase().trim();
  return lower === 'checked' || lower === 'true' || lower === 'yes';
}

// Parse multi-line playlist field
function parsePlaylistsColumn(str) {
  if (!str || str.trim() === '') return null;
  
  const playlists = str.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove leading dash
      const name = line.replace(/^-\s*/, '').trim();
      const isNew = name.includes('[NEW]');
      return {
        name: name.replace(/\s*\[NEW\]\s*/g, '').trim(),
        isNew
      };
    })
    .filter(p => p.name.length > 0);
  
  return playlists.length > 0 ? JSON.stringify(playlists) : null;
}

async function importCSVCampaignsFull() {
  try {
    console.log('📊 COMPREHENSIVE CSV Import - Capturing ALL Data...\n');

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
    
    // Read CSV
    const csvPath = path.join(process.cwd(), 'Spotify Playlisting-Active Campaigns.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const campaigns = parseCSV(csvPath);
    console.log(`📁 Found ${campaigns.length} campaigns in CSV`);
    console.log(`📋 Columns: ${Object.keys(campaigns[0]).length}`);
    console.log(`📋 Column names:`, Object.keys(campaigns[0]).join(', '));
    console.log(`📋 First row Campaign field:`, campaigns[0]?.Campaign);
    console.log();

    let stats = {
      clientsCreated: 0,
      clientsUpdated: 0,
      campaignsCreated: 0,
      campaignsUpdated: 0,
      campaignsSkipped: 0,
      campaignGroupsCreated: 0
    };

    const clientMap = new Map();

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      
      try {
        // Show progress every 50 campaigns
        if (i % 50 === 0) {
          console.log(`📈 Progress: ${i}/${campaigns.length} campaigns processed...`);
        }

        const clientName = cleanClientName(campaign.Client);
        if (!clientName) {
          stats.campaignsSkipped++;
          continue;
        }

        // Get or create client with ALL contact info
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
            // Update client with additional info
            const emailsArray = [];
            if (campaign['Email 2 (from Clients)']) emailsArray.push(campaign['Email 2 (from Clients)'].trim());
            if (campaign['Email 3 (from Clients)']) emailsArray.push(campaign['Email 3 (from Clients)'].trim());
            
            const { error: updateError } = await supabase
              .from('clients')
              .update({
                emails: emailsArray.length > 0 ? emailsArray : null,
                email_secondary: campaign['Email 2 (from Clients)'] || null,
                email_tertiary: campaign['Email 3 (from Clients)'] || null,
                verified: parseBoolean(campaign['Update Client'])
              })
              .eq('id', existingClient.id);

            if (!updateError) stats.clientsUpdated++;
            clientId = existingClient.id;
          } else {
            const emailsArray = [];
            if (campaign['Email 2 (from Clients)']) emailsArray.push(campaign['Email 2 (from Clients)'].trim());
            if (campaign['Email 3 (from Clients)']) emailsArray.push(campaign['Email 3 (from Clients)'].trim());
            
            const { data: newClient, error: clientError } = await supabase
              .from('clients')
              .insert({
                name: clientName,
                emails: emailsArray.length > 0 ? emailsArray : null,
                email_secondary: campaign['Email 2 (from Clients)'] || null,
                email_tertiary: campaign['Email 3 (from Clients)'] || null,
                verified: parseBoolean(campaign['Update Client']),
                org_id: defaultOrgId
              })
              .select()
              .single();

            if (clientError) {
              console.log(`   ❌ Client "${clientName}": ${clientError.message}`);
              stats.campaignsSkipped++;
              continue;
            }

            clientId = newClient.id;
            stats.clientsCreated++;
          }

          clientMap.set(clientName, clientId);
        }

        // Parse all campaign data
        const campaignName = campaign.Campaign?.trim();
        if (!campaignName) {
          console.log(`   ⚠️  Row ${i}: No campaign name`);
          stats.campaignsSkipped++;
          continue;
        }

        const goal = parseNumber(campaign.Goal);
        const remaining = parseNumber(campaign.Remaining);
        const dailyStreams = parseNumber(campaign.Daily);
        const weeklyStreams = parseNumber(campaign.Weekly);
        const startDate = parseDate(campaign['Start Date']);
        const salePrice = parseDecimal(campaign['Sale price']);
        const vendor = campaign.Vendor?.trim() || null;
        const status = campaign.Status?.trim() || 'Active';
        const curatorStatus = campaign['Curator Status']?.trim() || null;
        const notes = campaign.Notes?.trim() || null;
        const lastModified = parseDate(campaign['Last Modified']);
        const paidVendor = parseBoolean(campaign['Paid Vendor?']);
        const notifyVendor = parseBoolean(campaign['Notify Vendor?']);
        const askForSFA = parseBoolean(campaign['Ask For SFA']);
        const historicalPlaylists = parsePlaylistsColumn(campaign.Playlists);
        const playlistLinks = campaign['SP Playlist Stuff']?.trim() || null;
        const trackId = extractTrackId(campaign.URL || campaign.SFA);

        // Extract artist/song
        const artistMatch = campaignName.match(/^(.+?)\s*-\s*(.+)$/);
        const artistName = artistMatch ? artistMatch[1].trim() : clientName;
        const songName = artistMatch ? artistMatch[2].trim() : campaignName;

        // Get or create campaign group
        let campaignGroupId;
        const { data: existingGroup } = await supabase
          .from('campaign_groups')
          .select('id')
          .ilike('name', artistName)
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
            console.log(`   ❌ Campaign group "${artistName}": ${groupError.message}`);
            console.log(`   ❌ Group error details:`, JSON.stringify(groupError, null, 2));
            stats.campaignsSkipped++;
            continue;
          }

          campaignGroupId = newGroup.id;
          stats.campaignGroupsCreated++;
        }

        // Check if campaign exists
        const { data: existingCampaign } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign', campaignName)
          .eq('client_id', clientId)
          .single();

        const campaignData = {
          campaign_group_id: campaignGroupId,
          client_id: clientId,
          campaign: campaignName,
          url: trackId ? `https://open.spotify.com/track/${trackId}` : null,
          sfa: campaign.SFA?.trim() || null,
          vendor: vendor,
          goal: goal.toString(),
          remaining: remaining.toString(),
          sale_price: salePrice.toString(),
          start_date: startDate,
          daily: dailyStreams.toString(),
          weekly: weeklyStreams.toString(),
          // NEW FIELDS
          daily_streams: dailyStreams,
          weekly_streams: weeklyStreams,
          paid_vendor: paidVendor,
          curator_status: curatorStatus,
          update_client_verified: parseBoolean(campaign['Update Client']),
          notify_vendor: notifyVendor,
          ask_for_sfa: askForSFA,
          last_modified_csv: lastModified,
          historical_playlists: historicalPlaylists,
          playlist_links: playlistLinks,
          notes: notes,
          source: 'CSV Import (Full)',
          campaign_type: 'Stream Boost'
        };

        if (existingCampaign) {
          // Update existing campaign with ALL data
          const { error: updateError } = await supabase
            .from('spotify_campaigns')
            .update(campaignData)
            .eq('id', existingCampaign.id);

          if (updateError) {
            console.log(`   ❌ Update "${campaignName}": ${updateError.message}`);
            stats.campaignsSkipped++;
          } else {
            stats.campaignsUpdated++;
          }
        } else {
          // Create new campaign
          const { error: insertError } = await supabase
            .from('spotify_campaigns')
            .insert(campaignData);

          if (insertError) {
            console.log(`   ❌ Insert "${campaignName}": ${insertError.message}`);
            console.log(`   ❌ Error details:`, JSON.stringify(insertError, null, 2));
            stats.campaignsSkipped++;
          } else {
            stats.campaignsCreated++;
          }
        }

      } catch (error) {
        console.log(`❌ Row ${i}: ${error.message}`);
        console.log(`❌ Error stack:`, error.stack);
        stats.campaignsSkipped++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE IMPORT SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Clients created: ${stats.clientsCreated}`);
    console.log(`🔄 Clients updated: ${stats.clientsUpdated}`);
    console.log(`✅ Campaign groups created: ${stats.campaignGroupsCreated}`);
    console.log(`✅ Campaigns created: ${stats.campaignsCreated}`);
    console.log(`🔄 Campaigns updated: ${stats.campaignsUpdated}`);
    console.log(`⚠️  Campaigns skipped: ${stats.campaignsSkipped}`);
    console.log('='.repeat(70));
    console.log('\n✨ All CSV data has been imported including:');
    console.log('   - Daily/Weekly stream rates');
    console.log('   - Remaining stream counts');
    console.log('   - Vendor payment status');
    console.log('   - Curator response status');
    console.log('   - Action flags (notify vendor, ask for SFA)');
    console.log('   - Historical playlists from CSV');
    console.log('   - Additional playlist links');
    console.log('   - All client contact emails');
    console.log('   - Verification flags');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  importCSVCampaignsFull()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { importCSVCampaignsFull };

