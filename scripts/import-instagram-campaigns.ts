/**
 * Instagram Campaigns CSV Import Script
 * 
 * Imports Instagram campaign data from CSV into the database
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

interface InstagramCSVRow {
  Campaign: string;
  Clients: string;
  'Start Date': string;
  Price: string;
  Spend: string;
  Remaining: string;
  'Sound URL': string;
  Status: string;
  Tracker: string;
  'Campaign Started': string;
  'Send Tracker': string;
  'Send Final Report': string;
  Invoice: string;
  Salespeople: string;
  'Report Notes': string;
  'Client Notes': string;
  'Paid Ops?': string;
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

// Parse date from various formats
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Try parsing M/D/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

// Parse currency string to number
function parseCurrency(currencyStr: string): number {
  if (!currencyStr || currencyStr.trim() === '') return 0;
  return parseFloat(currencyStr.replace(/[$,]/g, '')) || 0;
}

async function main() {
  console.log('📸 Instagram Campaigns Import Starting...\n');
  
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'IG Seeding-All Campaigns.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: InstagramCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  console.log(`📄 Found ${rows.length} rows in CSV\n`);
  
  // Import Campaigns
  console.log('📸 Importing Campaigns...');
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
    const price = parseCurrency(row.Price);
    const spend = parseCurrency(row.Spend);
    const remaining = parseCurrency(row.Remaining);
    
    // Build description from notes
    const descriptionParts = [];
    if (row['Report Notes']) descriptionParts.push(`Report Notes: ${row['Report Notes']}`);
    if (row['Client Notes']) descriptionParts.push(`Client Notes: ${row['Client Notes']}`);
    const description = descriptionParts.join('\n\n') || null;
    
    // Build totals JSONB
    const totals = {
      budget: price,
      spent: spend,
      remaining: remaining,
    };
    
    // Build results JSONB
    const results: any = {};
    if (row.Tracker) {
      results.tracker_url = row.Tracker;
    }
    
    // Prepare campaign data
    const campaignData = {
      org_id: DEFAULT_ORG_ID,
      name: campaignName,
      brand_name: row.Clients || 'Unknown',
      budget: price,
      description: description,
      status: STATUS_MAP[row.Status] || 'draft',
      totals: totals,
      results: results,
      music_genres: [], // Not in CSV
      content_types: [], // Not in CSV
      territory_preferences: [], // Not in CSV
      post_types: [], // Not in CSV
      creator_count: 1, // Default
      selected_creators: [],
      public_access_enabled: false,
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
      successCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📊 Total: ${rows.length}`);
  console.log('\n✨ Instagram import complete!\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

