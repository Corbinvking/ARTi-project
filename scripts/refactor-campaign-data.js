#!/usr/bin/env node

/**
 * Script to refactor Spotify campaign data structure
 * Current: Campaigns as primary entities with repeated client data
 * Target: Clients as primary entities with campaigns attached
 */

const fs = require('fs');
const path = require('path');

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

function groupCampaignsByClient(records) {
  const clientGroups = {};

  records.forEach(record => {
    const clientName = record.Client?.trim();
    const campaignName = record.Campaign?.trim();

    // Skip empty or placeholder records
    if (!clientName || !campaignName || clientName === '' || campaignName === '') {
      return;
    }

    if (!clientGroups[clientName]) {
      clientGroups[clientName] = {
        client_name: clientName,
        client_email: record['Client Email'] || '',
        campaigns: []
      };
    }

    // Add campaign to client's campaigns array
    clientGroups[clientName].campaigns.push({
      campaign_name: campaignName,
      goal: parseInt(record.Goal) || 0,
      remaining: parseInt(record.Remaining) || 0,
      daily: parseInt(record.Daily) || 0,
      weekly: parseInt(record.Weekly) || 0,
      url: record.URL || '',
      sale_price: parseFloat(record['Sale price']) || 0,
      start_date: record['Start Date'] || '',
      status: record.Status || '',
      vendor: record.Vendor || '',
      curator_status: record['Curator Status'] || '',
      playlists: record.Playlists || '',
      notes: record.Notes || '',
      last_modified: record['Last Modified'] || '',
      sp_vendor_updates: record['SP Vendor Updates'] || '',
      spotify_campaign: record['Spotify Campaign (from SP Vendor Updates)'] || ''
    });
  });

  return Object.values(clientGroups);
}

function generateClientCSV(clientGroups) {
  const headers = [
    'client_name',
    'client_email',
    'campaign_count',
    'total_goal',
    'total_remaining',
    'campaigns_json'
  ];

  const rows = [headers.join(',')];

  clientGroups.forEach(client => {
    const campaignsJson = JSON.stringify(client.campaigns);
    const row = [
      `"${client.client_name}"`,
      `"${client.client_email}"`,
      client.campaigns.length,
      client.campaigns.reduce((sum, camp) => sum + camp.goal, 0),
      client.campaigns.reduce((sum, camp) => sum + camp.remaining, 0),
      `"${campaignsJson.replace(/"/g, '""')}"`
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

function generateCampaignCSV(clientGroups) {
  const headers = [
    'client_name',
    'campaign_name',
    'goal',
    'remaining',
    'daily',
    'weekly',
    'url',
    'sale_price',
    'start_date',
    'status',
    'vendor',
    'curator_status',
    'playlists',
    'notes',
    'last_modified',
    'sp_vendor_updates',
    'spotify_campaign'
  ];

  const rows = [headers.join(',')];

  clientGroups.forEach(client => {
    client.campaigns.forEach(campaign => {
      const row = [
        `"${client.client_name}"`,
        `"${campaign.campaign_name}"`,
        campaign.goal,
        campaign.remaining,
        campaign.daily,
        campaign.weekly,
        `"${campaign.url}"`,
        campaign.sale_price,
        `"${campaign.start_date}"`,
        `"${campaign.status}"`,
        `"${campaign.vendor}"`,
        `"${campaign.curator_status}"`,
        `"${campaign.playlists}"`,
        `"${campaign.notes.replace(/"/g, '""')}"`,
        `"${campaign.last_modified}"`,
        `"${campaign.sp_vendor_updates}"`,
        `"${campaign.spotify_campaign}"`
      ];
      rows.push(row.join(','));
    });
  });

  return rows.join('\n');
}

async function refactorCampaignData() {
  try {
    console.log('🔄 Refactoring Spotify campaign data structure...');

    // Read the current CSV file
    const csvPath = path.join(__dirname, '../Spotify Playlisting-All Campaigns.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV data
    const records = parseCSV(csvContent);
    console.log(`📊 Found ${records.length} campaign records`);

    // Group campaigns by client
    const clientGroups = groupCampaignsByClient(records);
    console.log(`👥 Grouped into ${clientGroups.length} unique clients`);

    // Generate new CSV structures
    const clientCSV = generateClientCSV(clientGroups);
    const campaignCSV = generateCampaignCSV(clientGroups);

    // Write the new CSV files
    const outputDir = path.join(__dirname, '../refactored-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, 'clients.csv'), clientCSV);
    fs.writeFileSync(path.join(outputDir, 'campaigns.csv'), campaignCSV);

    console.log('✅ Generated refactored CSV files:');
    console.log(`   📄 clients.csv: ${clientGroups.length} clients`);
    console.log(`   📄 campaigns.csv: ${clientGroups.reduce((sum, client) => sum + client.campaigns.length, 0)} campaigns`);

    // Generate summary statistics
    const totalCampaigns = clientGroups.reduce((sum, client) => sum + client.campaigns.length, 0);
    const totalGoal = clientGroups.reduce((sum, client) =>
      sum + client.campaigns.reduce((campSum, camp) => campSum + camp.goal, 0), 0
    );

    console.log('\n📈 Summary Statistics:');
    console.log(`   👥 Total Clients: ${clientGroups.length}`);
    console.log(`   📋 Total Campaigns: ${totalCampaigns}`);
    console.log(`   🎯 Total Goal Streams: ${totalGoal.toLocaleString()}`);
    console.log(`   💰 Average Campaigns per Client: ${(totalCampaigns / clientGroups.length).toFixed(1)}`);

    // Show top clients by campaign count
    const topClients = clientGroups
      .sort((a, b) => b.campaigns.length - a.campaigns.length)
      .slice(0, 10);

    console.log('\n🏆 Top 10 Clients by Campaign Count:');
    topClients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.client_name}: ${client.campaigns.length} campaigns`);
    });

  } catch (error) {
    console.error('❌ Error refactoring campaign data:', error);
    process.exit(1);
  }
}

// Run the refactoring
refactorCampaignData();
