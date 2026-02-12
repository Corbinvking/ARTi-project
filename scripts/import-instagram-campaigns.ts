/**
 * Instagram Campaigns CSV Import Script
 * 
 * Imports ACTIVE Instagram campaign data from CSV into the database.
 * Replaces ALL existing instagram_campaigns data with fresh data from CSV.
 * 
 * CSV source: "IG Seeding-Active Campaigns.csv"
 * Column mapping:
 *   CSV "Spend"     -> DB "price"  (total campaign budget)
 *   Calculated       -> DB "spend"  (budget - remaining = amount spent so far)
 *   CSV "Remaining"  -> DB "remaining"
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default org ID (Artist Influence)
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Interface matching the NEW CSV column headers.
 * Note: No Price, Invoice, Salespeople, or "Paid Ops?" columns in this CSV.
 */
interface InstagramCSVRow {
  Campaign: string;
  Clients: string;
  'Start Date': string;
  Spend: string;        // This is the total campaign BUDGET
  Remaining: string;
  'Sound URL': string;
  Status: string;
  'Campaign Started': string;
  Tracker: string;
  'Send Tracker': string;
  'Send Final Report': string;
  'Report Notes': string;
  'Client Notes': string;
}

// Status mapping
const STATUS_MAP: Record<string, string> = {
  'Active': 'active',
  'Unreleased': 'draft',
  'Complete': 'completed',
  'Completed': 'completed',
  'Cancelled': 'cancelled',
  'Paused': 'paused',
};

// Parse currency string to number
function parseCurrency(currencyStr: string): number {
  if (!currencyStr || currencyStr.trim() === '') return 0;
  return parseFloat(currencyStr.replace(/[$,]/g, '')) || 0;
}

/**
 * Extract a default client name from the campaign name.
 * Typically campaign names follow "Artist - Song Title" format,
 * so we use the part before the first " - " as the artist/client.
 */
function extractClientFromCampaign(campaignName: string): string {
  const dashIndex = campaignName.indexOf(' - ');
  if (dashIndex > 0) {
    return campaignName.substring(0, dashIndex).trim();
  }
  return campaignName.trim();
}

async function main() {
  console.log('📸 Instagram Active Campaigns Import Starting...\n');
  
  // ── Step 1: Read CSV file ──────────────────────────────────────────────
  const csvPath = path.join(process.cwd(), 'IG Seeding-Active Campaigns.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    console.error('   Make sure "IG Seeding-Active Campaigns.csv" is in the project root.');
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: InstagramCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle BOM (Byte Order Mark) at start of CSV
  });
  
  console.log(`📄 Found ${rows.length} rows in CSV\n`);
  
  // ── Step 2: Clear ALL existing instagram_campaigns data ────────────────
  console.log('🗑️  Clearing existing instagram_campaigns data...');
  const { error: deleteError, count: deleteCount } = await supabase
    .from('instagram_campaigns')
    .delete()
    .gte('id', 0); // Match all rows (id >= 0 covers all SERIAL ids)
  
  if (deleteError) {
    console.error(`❌ Failed to clear existing data: ${deleteError.message}`);
    console.error('   Continuing with import anyway (may result in duplicates)...');
  } else {
    console.log(`  ✅ Cleared existing campaigns (${deleteCount ?? 'unknown count'} rows removed)`);
  }
  
  // ── Step 3: Import new campaigns ──────────────────────────────────────
  console.log('\n📸 Importing Active Campaigns...');
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const row of rows) {
    const campaignName = row.Campaign;
    
    // Skip if no campaign name
    if (!campaignName || campaignName.trim() === '') {
      skippedCount++;
      continue;
    }
    
    // Parse financial data
    // CSV "Spend" = total budget, store in DB "price" column
    const budget = parseCurrency(row.Spend);
    const remaining = parseCurrency(row.Remaining);
    // Calculate actual spend: budget - remaining (if remaining is 0 or empty, assume fully spent)
    const actualSpend = remaining > 0 ? budget - remaining : budget;
    
    // Determine client: use CSV value, or extract from campaign name if empty
    const client = row.Clients && row.Clients.trim() !== ''
      ? row.Clients.trim()
      : extractClientFromCampaign(campaignName);
    
    // Prepare campaign data (using existing table schema from migration 011)
    // All columns are TEXT type, so we store formatted strings
    const campaignData = {
      campaign: campaignName.trim(),
      clients: client,
      start_date: row['Start Date'] || null,
      price: row.Spend || null,                          // Budget goes into "price"
      spend: actualSpend > 0 ? `$${actualSpend.toFixed(2)}` : null,  // Calculated actual spend
      remaining: row.Remaining || null,
      sound_url: row['Sound URL'] || null,
      status: row.Status || 'Active',
      tracker: row.Tracker || null,
      campaign_started: row['Campaign Started'] || null,
      send_tracker: row['Send Tracker'] || null,
      send_final_report: row['Send Final Report'] || null,
      invoice: null,        // Not in new CSV
      salespeople: null,    // Not in new CSV
      report_notes: row['Report Notes'] || null,
      client_notes: row['Client Notes'] || null,
      paid_ops: null,       // Not in new CSV
    };
    
    // Insert campaign
    const { error } = await supabase
      .from('instagram_campaigns')
      .insert(campaignData);
    
    if (error) {
      console.error(`  ❌ Failed: ${campaignName}`);
      console.error(`     Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Imported: ${campaignName}`);
      console.log(`     Client: ${client} | Budget: ${row.Spend || '$0'} | Status: ${row.Status}`);
      successCount++;
    }
  }
  
  // ── Step 4: Summary ───────────────────────────────────────────────────
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📊 Total rows in CSV: ${rows.length}`);
  
  // List extracted clients
  const uniqueClients = [...new Set(rows
    .map(r => {
      if (r.Clients && r.Clients.trim() !== '') return r.Clients.trim();
      return extractClientFromCampaign(r.Campaign);
    })
    .filter(Boolean)
  )];
  console.log(`\n👥 Unique Clients Found (${uniqueClients.length}):`);
  uniqueClients.forEach(c => console.log(`  - ${c}`));
  
  console.log('\n✨ Instagram active campaigns import complete!\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

