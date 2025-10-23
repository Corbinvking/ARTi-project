#!/usr/bin/env node
/**
 * Sync All Campaigns from CSV
 * 
 * This script:
 * 1. Reads full-databse-chunk.csv (653 campaigns)
 * 2. Parses and normalizes all data
 * 3. Creates or updates campaigns in database
 * 4. Maps ALL 25 CSV columns to database columns
 * 5. Prevents duplicates (smart matching)
 * 6. Preserves existing data (especially SFA URLs)
 * 7. Links to clients and vendors
 * 
 * Usage:
 *   node scripts/sync_campaigns_from_csv.js
 *   node scripts/sync_campaigns_from_csv.js --csv path/to/file.csv
 *   node scripts/sync_campaigns_from_csv.js --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvIndex = args.indexOf('--csv');
const csvPath = csvIndex !== -1 ? args[csvIndex + 1] : 'full-databse-chunk.csv';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Normalize text fields
 */
function normalizeText(text) {
  if (!text || text === 'null' || text === 'undefined') return null;
  return text.trim();
}

/**
 * Extract Spotify track ID from URL
 */
function extractSpotifyTrackId(url) {
  if (!url) return null;
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Parse CSV file
 */
async function parseCsv(csvPath) {
  console.log(`📄 Reading CSV: ${csvPath}`);
  
  const projectRoot = path.join(__dirname, '..');
  const fullPath = path.join(projectRoot, csvPath);
  
  try {
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    
    // Parse CSV with options to handle multi-line fields
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true // Handle BOM
    });
    
    console.log(`✅ Parsed ${records.length} campaigns from CSV\n`);
    return records;
  } catch (error) {
    console.error(`❌ Error reading CSV: ${error.message}`);
    throw error;
  }
}

/**
 * Normalize campaign data from CSV row
 */
function normalizeCampaignData(row) {
  // Extract Spotify track ID if URL is present
  const spotifyTrackId = extractSpotifyTrackId(row.URL);
  const sfaTrackId = extractSpotifyTrackId(row.SFA);
  
  return {
    // Core campaign info
    campaign: normalizeText(row.Campaign),
    client: normalizeText(row.Client),
    goal: normalizeText(row.Goal),
    salesperson: normalizeText(row.Salesperson),
    
    // Stream metrics
    remaining: normalizeText(row.Remaining),
    daily: normalizeText(row.Daily),
    weekly: normalizeText(row.Weekly),
    
    // URLs
    url: normalizeText(row.URL),
    sfa: normalizeText(row.SFA),
    spotify_track_id: spotifyTrackId,
    sfa_track_id: sfaTrackId,
    
    // Financial
    sale_price: normalizeText(row['Sale price']),
    start_date: normalizeText(row['Start Date']),
    
    // Status & tracking
    status: normalizeText(row.Status),
    invoice: normalizeText(row.Invoice),
    
    // Vendor info
    vendor: normalizeText(row.Vendor),
    paid_vendor: normalizeText(row['Paid Vendor?']),
    curator_status: normalizeText(row['Curator Status']),
    
    // Playlists
    playlists: normalizeText(row.Playlists),
    
    // Communication flags
    notify_vendor: normalizeText(row['Notify Vendor?']),
    ask_for_sfa: normalizeText(row['Ask For SFA']),
    update_client: normalizeText(row['Update Client']),
    
    // Contact info
    client_email: normalizeText(row['Client Email']),
    vendor_email: normalizeText(row['Vendor Email']),
    
    // Notes & metadata
    notes: normalizeText(row.Notes),
    last_modified: normalizeText(row['Last Modified']),
    sp_vendor_updates: normalizeText(row['SP Vendor Updates']),
    spotify_campaign_from_sp_vendor_updates: normalizeText(row['Spotify Campaign (from SP Vendor Updates)'])
  };
}

/**
 * Find existing campaign in database
 */
async function findExistingCampaign(campaignData) {
  // Try to find by multiple criteria
  const queries = [];
  
  // 1. Try by campaign name (exact match)
  if (campaignData.campaign) {
    queries.push(
      supabase
        .from('spotify_campaigns')
        .select('*')
        .eq('campaign', campaignData.campaign)
        .maybeSingle()
    );
  }
  
  // 2. Try by Spotify URL (if present)
  if (campaignData.url && campaignData.url.includes('spotify.com')) {
    queries.push(
      supabase
        .from('spotify_campaigns')
        .select('*')
        .eq('url', campaignData.url)
        .maybeSingle()
    );
  }
  
  // 3. Try by Spotify track ID (if present)
  if (campaignData.spotify_track_id) {
    queries.push(
      supabase
        .from('spotify_campaigns')
        .select('*')
        .ilike('url', `%${campaignData.spotify_track_id}%`)
        .maybeSingle()
    );
  }
  
  // Execute all queries
  for (const query of queries) {
    const { data, error } = await query;
    if (!error && data) {
      return data;
    }
  }
  
  return null;
}

/**
 * Create or update campaign
 */
async function upsertCampaign(campaignData, dryRun = false) {
  // Find existing campaign
  const existing = await findExistingCampaign(campaignData);
  
  if (existing) {
    // Update existing campaign
    if (dryRun) {
      console.log(`   [DRY RUN] Would UPDATE campaign ID ${existing.id}: ${campaignData.campaign}`);
      return { action: 'update', id: existing.id, dryRun: true };
    }
    
    // Merge data - preserve existing SFA URL if CSV doesn't have one
    const updateData = {
      ...campaignData,
      sfa: campaignData.sfa || existing.sfa, // Preserve existing SFA
      updated_at: new Date().toISOString()
    };
    
    // Remove fields that shouldn't be in update
    delete updateData.spotify_track_id;
    delete updateData.sfa_track_id;
    
    const { data, error } = await supabase
      .from('spotify_campaigns')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error updating campaign: ${error.message}`);
      return { action: 'error', error: error.message };
    }
    
    return { action: 'update', id: data.id, data };
  } else {
    // Create new campaign
    if (dryRun) {
      console.log(`   [DRY RUN] Would CREATE campaign: ${campaignData.campaign}`);
      return { action: 'create', dryRun: true };
    }
    
    // Remove fields that shouldn't be in insert
    const insertData = { ...campaignData };
    delete insertData.spotify_track_id;
    delete insertData.sfa_track_id;
    
    const { data, error } = await supabase
      .from('spotify_campaigns')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error creating campaign: ${error.message}`);
      return { action: 'error', error: error.message };
    }
    
    return { action: 'create', id: data.id, data };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('🔄 SYNC CAMPAIGNS FROM CSV');
  console.log('================================================================================\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  // Parse CSV
  const csvRecords = await parseCsv(csvPath);
  
  console.log('📊 CSV Summary:');
  console.log(`   Total records: ${csvRecords.length}`);
  
  // Group by status
  const byStatus = csvRecords.reduce((acc, row) => {
    const status = row.Status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n   By status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });
  console.log('');
  
  // Process each campaign
  let created = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  
  console.log('🔄 Processing campaigns...\n');
  
  for (let i = 0; i < csvRecords.length; i++) {
    const row = csvRecords[i];
    const campaignNum = i + 1;
    
    // Skip if no campaign name
    if (!row.Campaign || !row.Campaign.trim()) {
      console.log(`   [${campaignNum}/${csvRecords.length}] ⚠️  Skipping row with no campaign name`);
      skipped++;
      continue;
    }
    
    const campaignData = normalizeCampaignData(row);
    
    console.log(`   [${campaignNum}/${csvRecords.length}] Processing: ${campaignData.campaign}`);
    console.log(`      Client: ${campaignData.client || 'N/A'}`);
    console.log(`      Status: ${campaignData.status || 'N/A'}`);
    console.log(`      Salesperson: ${campaignData.salesperson || 'N/A'}`);
    
    const result = await upsertCampaign(campaignData, dryRun);
    
    if (result.action === 'create') {
      console.log(`      ✅ Created (ID: ${result.id})`);
      created++;
    } else if (result.action === 'update') {
      console.log(`      ✅ Updated (ID: ${result.id})`);
      updated++;
    } else if (result.action === 'error') {
      console.log(`      ❌ Error: ${result.error}`);
      errors++;
    }
    
    console.log('');
    
    // Small delay to avoid overwhelming the database
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Summary
  console.log('================================================================================');
  console.log('📊 SYNC SUMMARY');
  console.log('================================================================================\n');
  console.log(`✅ Created:  ${created}`);
  console.log(`✅ Updated:  ${updated}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`⚠️  Skipped:  ${skipped}`);
  console.log(`📊 Total:    ${csvRecords.length}`);
  console.log('');
  
  if (dryRun) {
    console.log('⚠️  This was a DRY RUN - no changes were made');
    console.log('   Run without --dry-run to apply changes\n');
  } else {
    console.log('🎉 Sync complete!\n');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

