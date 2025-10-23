#!/usr/bin/env node
/**
 * Verify Database Sync
 * 
 * This script verifies the database sync by:
 * 1. Counting records in each table
 * 2. Checking for missing relationships
 * 3. Validating data quality
 * 4. Generating a report
 * 
 * Usage:
 *   node scripts/verify_database_sync.js
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse CSV file
 */
async function parseCsv() {
  const projectRoot = path.join(__dirname, '..');
  const fullPath = path.join(projectRoot, 'full-databse-chunk.csv');
  
  const fileContent = await fs.readFile(fullPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true
  });
  
  return records;
}

/**
 * Get table counts
 */
async function getTableCounts() {
  const tables = ['clients', 'vendors', 'spotify_campaigns', 'campaign_playlists', 'playlists'];
  const counts = {};
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`   ❌ Error counting ${table}: ${error.message}`);
      counts[table] = 0;
    } else {
      counts[table] = count;
    }
  }
  
  return counts;
}

/**
 * Get campaigns without relationships
 */
async function getCampaignsWithoutRelationships() {
  const { data, error } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, client, vendor, client_id, vendor_id')
    .or('client_id.is.null,vendor_id.is.null');
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return [];
  }
  
  return data;
}

/**
 * Get campaigns by status
 */
async function getCampaignsByStatus() {
  const { data, error } = await supabase
    .from('spotify_campaigns')
    .select('status');
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return {};
  }
  
  const statusCounts = data.reduce((acc, campaign) => {
    const status = campaign.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  return statusCounts;
}

/**
 * Get campaigns with SFA URLs
 */
async function getCampaignsWithSFA() {
  const { data, error } = await supabase
    .from('spotify_campaigns')
    .select('id, sfa')
    .not('sfa', 'is', null);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return [];
  }
  
  return data;
}

/**
 * Get campaigns with playlist data
 */
async function getCampaignsWithPlaylists() {
  const { data, error } = await supabase
    .from('campaign_playlists')
    .select('campaign_id')
    .not('campaign_id', 'is', null);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return [];
  }
  
  // Get unique campaign IDs
  const uniqueCampaignIds = [...new Set(data.map(p => p.campaign_id))];
  return uniqueCampaignIds;
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('✅ DATABASE SYNC VERIFICATION');
  console.log('================================================================================\n');
  
  // Parse CSV for comparison
  console.log('📄 Reading source CSV...');
  const csvRecords = await parseCsv();
  console.log(`✅ Found ${csvRecords.length} campaigns in CSV\n`);
  
  // Get table counts
  console.log('📊 Checking table counts...');
  const counts = await getTableCounts();
  console.log(`✅ Clients:           ${counts.clients}`);
  console.log(`✅ Vendors:           ${counts.vendors}`);
  console.log(`✅ Campaigns:         ${counts.spotify_campaigns}`);
  console.log(`✅ Campaign Playlists: ${counts.campaign_playlists}`);
  console.log(`✅ Playlists:         ${counts.playlists}\n`);
  
  // Check for campaigns without relationships
  console.log('🔗 Checking campaign relationships...');
  const campaignsWithoutRelationships = await getCampaignsWithoutRelationships();
  console.log(`⚠️  Campaigns without client_id or vendor_id: ${campaignsWithoutRelationships.length}\n`);
  
  // Show status distribution
  console.log('📈 Campaign status distribution:');
  const statusCounts = await getCampaignsByStatus();
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  console.log('');
  
  // Check SFA URLs
  console.log('🔗 Checking SFA URLs...');
  const campaignsWithSFA = await getCampaignsWithSFA();
  console.log(`✅ Campaigns with SFA URLs: ${campaignsWithSFA.length}\n`);
  
  // Check playlist data
  console.log('🎵 Checking playlist data...');
  const campaignsWithPlaylists = await getCampaignsWithPlaylists();
  console.log(`✅ Campaigns with playlist data: ${campaignsWithPlaylists.length}\n`);
  
  // Summary
  console.log('================================================================================');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('================================================================================\n');
  
  console.log('✅ DATA COVERAGE:');
  console.log(`   CSV Campaigns:      ${csvRecords.length}`);
  console.log(`   DB Campaigns:       ${counts.spotify_campaigns}`);
  console.log(`   Difference:         ${counts.spotify_campaigns - csvRecords.length} (includes existing campaigns)`);
  console.log('');
  
  console.log('✅ RELATIONSHIPS:');
  const linkedCampaigns = counts.spotify_campaigns - campaignsWithoutRelationships.length;
  const linkPercentage = ((linkedCampaigns / counts.spotify_campaigns) * 100).toFixed(1);
  console.log(`   Linked campaigns:   ${linkedCampaigns} (${linkPercentage}%)`);
  console.log(`   Unlinked campaigns: ${campaignsWithoutRelationships.length}`);
  console.log('');
  
  console.log('✅ STREAM DATA:');
  const sfaPercentage = ((campaignsWithSFA.length / counts.spotify_campaigns) * 100).toFixed(1);
  const playlistPercentage = ((campaignsWithPlaylists.length / counts.spotify_campaigns) * 100).toFixed(1);
  console.log(`   SFA URLs:           ${campaignsWithSFA.length} (${sfaPercentage}%)`);
  console.log(`   Playlist data:      ${campaignsWithPlaylists.length} (${playlistPercentage}%)`);
  console.log('');
  
  // Health check
  const isHealthy = 
    counts.spotify_campaigns >= csvRecords.length &&
    linkedCampaigns >= csvRecords.length * 0.9; // 90% linked
  
  if (isHealthy) {
    console.log('🎉 DATABASE IS HEALTHY!\n');
  } else {
    console.log('⚠️  DATABASE NEEDS ATTENTION\n');
  }
  
  // Show sample campaigns without relationships
  if (campaignsWithoutRelationships.length > 0 && campaignsWithoutRelationships.length <= 20) {
    console.log('⚠️  CAMPAIGNS WITHOUT RELATIONSHIPS:');
    campaignsWithoutRelationships.forEach(campaign => {
      const issues = [];
      if (!campaign.client_id) issues.push('no client_id');
      if (!campaign.vendor_id) issues.push('no vendor_id');
      console.log(`   - ${campaign.campaign || 'Unnamed'} (${issues.join(', ')})`);
      if (campaign.client) console.log(`     Client name: ${campaign.client}`);
      if (campaign.vendor) console.log(`     Vendor name: ${campaign.vendor}`);
    });
    console.log('');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

