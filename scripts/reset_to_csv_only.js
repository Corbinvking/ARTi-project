#!/usr/bin/env node
/**
 * Reset Database to CSV Only
 * 
 * This script completely resets the database to ONLY contain the 653 campaigns from CSV.
 * 
 * Usage:
 *   node scripts/reset_to_csv_only.js --confirm
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const autoConfirm = args.includes('--confirm');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeText(text) {
  if (!text || text === 'null' || text === 'undefined') return null;
  return text.trim();
}

function normalizeBoolean(text) {
  if (!text) return null;
  const normalized = text.toString().toLowerCase().trim();
  if (normalized === 'checked' || normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  return null;
}

async function deleteAllCampaigns() {
  console.log('🗑️  Deleting ALL campaigns...');
  
  const { data: allCampaigns } = await supabase
    .from('spotify_campaigns')
    .select('id');
  
  if (!allCampaigns || allCampaigns.length === 0) {
    console.log('   ✅ No campaigns to delete\n');
    return 0;
  }
  
  console.log(`   Found ${allCampaigns.length} campaigns to delete`);
  
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < allCampaigns.length; i += batchSize) {
    const batch = allCampaigns.slice(i, i + batchSize);
    const ids = batch.map(c => c.id);
    
    const { error } = await supabase
      .from('spotify_campaigns')
      .delete()
      .in('id', ids);
    
    if (!error) {
      deleted += batch.length;
      if (deleted % 500 === 0 || deleted === allCampaigns.length) {
        console.log(`   Progress: ${deleted}/${allCampaigns.length}`);
      }
    }
  }
  
  console.log(`   ✅ Deleted ${deleted} campaigns\n`);
  return deleted;
}

async function insertCSVCampaigns() {
  const csvPath = path.join(__dirname, '..', 'full-databse-chunk.csv');
  const fileContent = await fs.readFile(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true
  });
  
  const campaigns = records
    .filter(row => row.Campaign && row.Campaign.trim())
    .map(row => ({
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
    }));
  
  console.log(`📥 Inserting ${campaigns.length} campaigns from CSV...`);
  
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < campaigns.length; i += batchSize) {
    const batch = campaigns.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('spotify_campaigns')
      .insert(batch)
      .select();
    
    if (!error) {
      inserted += data.length;
      if (inserted % 100 === 0 || inserted === campaigns.length) {
        console.log(`   Progress: ${inserted}/${campaigns.length}`);
      }
    } else {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Inserted ${inserted} campaigns\n`);
  return inserted;
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + '    ⚠️  RESET DATABASE TO CSV ONLY (653 campaigns)'.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');
  
  if (!autoConfirm) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Type "RESET" to confirm: ', resolve);
    });
    
    rl.close();
    
    if (answer.trim() !== 'RESET') {
      console.log('\n❌ Cancelled\n');
      process.exit(0);
    }
  }
  
  console.log('\n✅ Starting reset...\n');
  
  // Step 1: Delete all campaigns
  await deleteAllCampaigns();
  
  // Step 2: Insert CSV campaigns
  await insertCSVCampaigns();
  
  // Step 3: Verify
  const { count } = await supabase
    .from('spotify_campaigns')
    .select('*', { count: 'exact', head: true });
  
  console.log('================================================================================');
  console.log('✅ RESET COMPLETE');
  console.log('================================================================================\n');
  console.log(`📊 Database now has exactly ${count} campaigns`);
  console.log(`📊 Expected: 653 campaigns\n`);
  
  if (count === 653) {
    console.log('🎉 Perfect! Database is clean and contains ONLY the CSV campaigns!\n');
  } else {
    console.log(`⚠️  Warning: Expected 653 but got ${count}\n`);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

