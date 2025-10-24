#!/usr/bin/env node
/**
 * Insert Campaigns ONLY from CSV
 * 
 * This script ONLY inserts campaigns - does NOT update existing ones.
 * Use this after cleaning the database to ensure you have exactly 653 campaigns.
 * 
 * Usage:
 *   node scripts/insert_campaigns_only.js
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = 'full-databse-chunk.csv';

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
 * Convert "checked" string to boolean
 */
function normalizeBoolean(text) {
  if (!text) return null;
  const normalized = text.toString().toLowerCase().trim();
  if (normalized === 'checked' || normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  return null;
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
  
  const fileContent = await fs.readFile(fullPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true
  });
  
  console.log(`✅ Parsed ${records.length} campaigns from CSV\n`);
  return records;
}

/**
 * Normalize campaign data from CSV row
 */
function normalizeCampaignData(row) {
  return {
    campaign: normalizeText(row.Campaign),
    client: normalizeText(row.Client),
    goal: normalizeText(row.Goal),
    salesperson: normalizeText(row.Salesperson),
    remaining: normalizeText(row.Remaining),
    daily: normalizeText(row.Daily),
    weekly: normalizeText(row.Weekly),
    url: normalizeText(row.URL),
    sfa: normalizeText(row.SFA),
    sale_price: normalizeText(row['Sale price']),
    start_date: normalizeText(row['Start Date']),
    status: normalizeText(row.Status),
    invoice: normalizeText(row.Invoice),
    vendor: normalizeText(row.Vendor),
    paid_vendor: normalizeBoolean(row['Paid Vendor?']),
    curator_status: normalizeText(row['Curator Status']),
    playlists: normalizeText(row.Playlists),
    notify_vendor: normalizeBoolean(row['Notify Vendor?']),
    ask_for_sfa: normalizeBoolean(row['Ask For SFA']),
    update_client: normalizeBoolean(row['Update Client']),
    client_email: normalizeText(row['Client Email']),
    vendor_email: normalizeText(row['Vendor Email']),
    notes: normalizeText(row.Notes),
    last_modified: normalizeText(row['Last Modified']),
    sp_vendor_updates: normalizeText(row['SP Vendor Updates']),
    spotify_campaign_from_sp_vendor_updates: normalizeText(row['Spotify Campaign (from SP Vendor Updates)'])
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('📥 INSERT CAMPAIGNS FROM CSV');
  console.log('================================================================================\n');
  
  const csvRecords = await parseCsv(csvPath);
  
  // Normalize all campaigns
  const campaigns = csvRecords
    .filter(row => row.Campaign && row.Campaign.trim())
    .map(row => normalizeCampaignData(row));
  
  console.log(`📊 Preparing to insert ${campaigns.length} campaigns...\n`);
  
  // Insert in batches
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < campaigns.length; i += batchSize) {
    const batch = campaigns.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('spotify_campaigns')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting batch ${i}-${i + batch.length}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += data.length;
      console.log(`✅ Inserted batch ${i + 1}-${i + batch.length} (${inserted}/${campaigns.length})`);
    }
  }
  
  console.log('\n================================================================================');
  console.log('📊 INSERT SUMMARY');
  console.log('================================================================================\n');
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📊 Total:    ${campaigns.length}`);
  console.log('\n🎉 Insert complete!\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

