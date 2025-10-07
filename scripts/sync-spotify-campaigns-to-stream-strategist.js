#!/usr/bin/env node

/**
 * Sync Spotify Campaigns to Stream Strategist Campaigns
 * 
 * This script migrates data from the spotify_campaigns table (Airtable import)
 * to the stream_strategist_campaigns table (Stream Strategist schema)
 */

const { createClient } = require('@supabase/supabase-js');

// Detect environment
const isProduction = process.argv.includes('--production');
const supabaseUrl = isProduction 
  ? process.env.SUPABASE_URL 
  : 'http://127.0.0.1:54321';
const supabaseServiceKey = isProduction
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔄 Syncing Spotify Campaigns to Stream Strategist Schema');
console.log(`📍 Environment: ${isProduction ? 'Production' : 'Local'}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

async function getDefaultOrgId() {
  const { data: orgs, error } = await supabase
    .from('orgs')
    .select('id, name')
    .limit(1);
    
  if (error || !orgs || orgs.length === 0) {
    throw new Error('No organization found. Please create an organization first.');
  }
  
  console.log(`✅ Using organization: ${orgs[0].name} (${orgs[0].id})`);
  return orgs[0].id;
}

function parseNumeric(value) {
  if (!value) return 0;
  // Remove commas and parse
  const cleaned = String(value).replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseInteger(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDate(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function mapStatus(airtableStatus) {
  const statusMap = {
    'active': 'active',
    'completed': 'completed',
    'paused': 'paused',
    'draft': 'draft',
    'cancelled': 'cancelled'
  };
  
  const normalized = String(airtableStatus || 'draft').toLowerCase().trim();
  return statusMap[normalized] || 'draft';
}

async function syncCampaigns() {
  try {
    const orgId = await getDefaultOrgId();
    
    // Fetch all spotify campaigns
    console.log('📥 Fetching spotify campaigns from Airtable table...');
    const { data: spotifyCampaigns, error: fetchError } = await supabase
      .from('spotify_campaigns')
      .select('*');
      
    if (fetchError) {
      throw new Error(`Failed to fetch spotify campaigns: ${fetchError.message}`);
    }
    
    console.log(`📊 Found ${spotifyCampaigns.length} spotify campaigns\n`);
    
    // Clear existing campaigns with our source (optional - comment out to append instead)
    console.log('🧹 Clearing existing campaigns with source "artist_influence_spotify_campaigns"...');
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('source', 'artist_influence_spotify_campaigns')
      .eq('campaign_type', 'artist_influence_spotify_promotion');
      
    if (deleteError && !deleteError.message.includes('0 rows')) {
      console.log(`⚠️  Warning: Could not clear existing campaigns: ${deleteError.message}`);
    }
    
    // Transform and insert campaigns
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < spotifyCampaigns.length; i++) {
      const campaign = spotifyCampaigns[i];
      
      const streamStrategistCampaign = {
        org_id: orgId,
        name: campaign.campaign || `Campaign ${campaign.id}`,
        client: campaign.client || '',
        client_name: campaign.client || '',
        track_url: campaign.url || '',
        track_name: '', // Not available in Airtable data
        stream_goal: parseInteger(campaign.goal),
        remaining_streams: parseInteger(campaign.remaining),
        allocated_streams: parseInteger(campaign.goal) - parseInteger(campaign.remaining),
        budget: parseNumeric(campaign.sale_price),
        sub_genre: '',
        music_genres: [], // Would need to parse from notes or other fields
        content_types: [],
        territory_preferences: [],
        post_types: [],
        duration_days: 90,
        start_date: parseDate(campaign.start_date) || new Date().toISOString().split('T')[0],
        status: mapStatus(campaign.status),
        source: 'artist_influence_spotify_campaigns', // Match Stream Strategist constants
        campaign_type: 'artist_influence_spotify_promotion', // Match Stream Strategist constants
        salesperson: campaign.salesperson || '',
        selected_playlists: [],
        vendor_allocations: {},
        algorithm_recommendations: {},
        results: {},
        totals: {},
        notes: campaign.notes || '',
        public_access_enabled: false,
        pending_operator_review: false,
        daily_streams: parseInteger(campaign.daily),
        weekly_streams: parseInteger(campaign.weekly)
      };
      
      const { error: insertError } = await supabase
        .from('campaigns')
        .insert([streamStrategistCampaign]);
        
      if (insertError) {
        console.error(`❌ Error syncing campaign ${campaign.id}: ${insertError.message}`);
        errorCount++;
      } else {
        successCount++;
        if ((i + 1) % 100 === 0) {
          console.log(`✅ Synced ${i + 1}/${spotifyCampaigns.length} campaigns...`);
        }
      }
    }
    
    console.log(`\n📈 Sync Summary:`);
    console.log(`✅ Successfully synced: ${successCount} campaigns`);
    console.log(`❌ Failed: ${errorCount} campaigns`);
    
    // Verify the sync
    console.log('\n🔍 Verifying sync...');
    const { data: syncedCampaigns, error: verifyError } = await supabase
      .from('campaigns')
      .select('id, name, stream_goal, status')
      .eq('source', 'artist_influence_spotify_campaigns')
      .eq('campaign_type', 'artist_influence_spotify_promotion')
      .limit(5);
      
    if (verifyError) {
      console.error(`❌ Verification failed: ${verifyError.message}`);
    } else {
      console.log(`✅ Verification successful! Sample campaigns:`);
      syncedCampaigns.forEach(c => {
        console.log(`   - ${c.name} (Goal: ${c.stream_goal}, Status: ${c.status})`);
      });
    }
    
    console.log('\n🎉 Sync completed successfully!');
    
  } catch (error) {
    console.error('💥 Sync failed:', error.message);
    process.exit(1);
  }
}

syncCampaigns();
