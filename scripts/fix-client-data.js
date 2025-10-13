#!/usr/bin/env node

/**
 * Script to fix client data by reading from database and creating clean CSV files
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function fixClientData() {
  try {
    console.log('🔄 Fixing client data from database...');

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

    // Get all clients with their campaigns
    const { data: clientsWithCampaigns, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        emails,
        spotify_campaigns (
          id,
          campaign,
          goal,
          remaining,
          daily,
          weekly,
          url,
          sale_price,
          start_date,
          status,
          vendor,
          curator_status,
          playlists,
          notes,
          last_modified,
          sp_vendor_updates,
          spotify_campaign
        )
      `);

    if (error) {
      throw new Error(`Failed to fetch clients with campaigns: ${error.message}`);
    }

    console.log(`📊 Found ${clientsWithCampaigns.length} clients in database`);

    // Generate clean CSV files
    const outputDir = path.join(__dirname, '../clean-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate clients CSV
    const clientHeaders = ['client_name', 'client_email', 'campaign_count', 'total_goal', 'total_remaining'];
    const clientRows = [clientHeaders.join(',')];

    const campaignHeaders = [
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
    const campaignRows = [campaignHeaders.join(',')];

    clientsWithCampaigns.forEach(client => {
      const clientName = client.name || '';
      const clientEmail = client.emails ? client.emails[0] || '' : '';
      const campaigns = client.spotify_campaigns || [];

      // Add client row
      clientRows.push([
        `"${clientName}"`,
        `"${clientEmail}"`,
        campaigns.length,
        campaigns.reduce((sum, camp) => sum + (camp.goal || 0), 0),
        campaigns.reduce((sum, camp) => sum + (camp.remaining || 0), 0)
      ].join(','));

      // Add campaign rows
      campaigns.forEach(campaign => {
        campaignRows.push([
          `"${clientName}"`,
          `"${campaign.campaign || ''}"`,
          campaign.goal || 0,
          campaign.remaining || 0,
          campaign.daily || 0,
          campaign.weekly || 0,
          `"${campaign.url || ''}"`,
          campaign.sale_price || 0,
          `"${campaign.start_date || ''}"`,
          `"${campaign.status || ''}"`,
          `"${campaign.vendor || ''}"`,
          `"${campaign.curator_status || ''}"`,
          `"${campaign.playlists || ''}"`,
          `"${(campaign.notes || '').replace(/"/g, '""')}"`,
          `"${campaign.last_modified || ''}"`,
          `"${campaign.sp_vendor_updates || ''}"`,
          `"${campaign.spotify_campaign || ''}"`
        ].join(','));
      });
    });

    // Write CSV files
    fs.writeFileSync(path.join(outputDir, 'clients.csv'), clientRows.join('\n'));
    fs.writeFileSync(path.join(outputDir, 'campaigns.csv'), campaignRows.join('\n'));

    console.log('✅ Generated clean CSV files:');
    console.log(`   📄 clients.csv: ${clientsWithCampaigns.length} clients`);
    console.log(`   📄 campaigns.csv: ${clientsWithCampaigns.reduce((sum, client) => sum + (client.spotify_campaigns || []).length, 0)} campaigns`);

    // Generate summary statistics
    const totalCampaigns = clientsWithCampaigns.reduce((sum, client) => sum + (client.spotify_campaigns || []).length, 0);
    const totalGoal = clientsWithCampaigns.reduce((sum, client) =>
      sum + (client.spotify_campaigns || []).reduce((campSum, camp) => campSum + (camp.goal || 0), 0), 0
    );

    console.log('\n📈 Summary Statistics:');
    console.log(`   👥 Total Clients: ${clientsWithCampaigns.length}`);
    console.log(`   📋 Total Campaigns: ${totalCampaigns}`);
    console.log(`   🎯 Total Goal Streams: ${totalGoal.toLocaleString()}`);

    // Show top clients by campaign count
    const topClients = clientsWithCampaigns
      .filter(client => client.spotify_campaigns && client.spotify_campaigns.length > 0)
      .sort((a, b) => (b.spotify_campaigns?.length || 0) - (a.spotify_campaigns?.length || 0))
      .slice(0, 10);

    console.log('\n🏆 Top 10 Clients by Campaign Count:');
    topClients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name}: ${(client.spotify_campaigns || []).length} campaigns`);
    });

  } catch (error) {
    console.error('❌ Error fixing client data:', error);
    process.exit(1);
  }
}

// Run the fix
fixClientData();
