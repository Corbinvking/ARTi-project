/**
 * SoundCloud Active Campaigns CSV Import Script
 * 
 * Deletes ALL existing soundcloud_campaigns rows, then imports fresh data
 * from the CSV into the ACTUAL production schema (flat text columns).
 * 
 * ACTUAL soundcloud_campaigns columns:
 *   track_info, client, service_type, goal, remaining, status, url,
 *   submit_date, start_date, receipts, salesperson, invoice, sale_price,
 *   confirm_start_date, notes, send_receipts, ask_client_for_playlist,
 *   last_modified, salesperson_email, internal_notes, client_notes
 * 
 * Usage:
 *   npx tsx scripts/import-soundcloud-active-campaigns.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// ---------------------------------------------------------------------------
// Supabase setup — uses the PRODUCTION database
// ---------------------------------------------------------------------------
const supabaseUrl = 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// CSV row interface (matches the "SoundCloud-Active Campaigns.csv" headers)
// ---------------------------------------------------------------------------
interface CSVRow {
  'Track Info': string;
  'Client': string;
  'Submit Date': string;
  'Start Date': string;
  'Receipts': string;
  'Date Requested': string;
  'Service Type': string;
  'Goal': string;
  'Remaining': string;
  'Status': string;
  'URL': string;
  'Notes': string;
  'Confirm Start Date?': string;
  'Send Receipt(s)': string;
  'Ask Client for Playlist': string;
  'Invoice': string;
}

// ---------------------------------------------------------------------------
// Main import
// ---------------------------------------------------------------------------
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SoundCloud Active Campaigns Import (Production)');
  console.log('═══════════════════════════════════════════════════════\n');

  // -----------------------------------------------------------------------
  // 1. Read and parse CSV
  // -----------------------------------------------------------------------
  const csvPath = process.argv[2]
    || path.join(process.cwd(), 'SoundCloud-Active Campaigns.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  console.log(`📄 Parsed ${rows.length} rows from CSV\n`);

  // -----------------------------------------------------------------------
  // 2. Delete ALL existing campaigns
  // -----------------------------------------------------------------------
  console.log('🗑️  Phase 1: Deleting all existing soundcloud_campaigns rows...');

  // Supabase requires a filter for deletes — use id > 0 to match all
  const { error: deleteError, count: deleteCount } = await supabase
    .from('soundcloud_campaigns')
    .delete({ count: 'exact' })
    .gt('id', 0);

  if (deleteError) {
    console.error('❌ Failed to delete existing campaigns:', deleteError.message);
    process.exit(1);
  }

  console.log(`   ✅ Deleted ${deleteCount ?? 'all'} existing rows\n`);

  // -----------------------------------------------------------------------
  // 3. Insert new campaigns from CSV
  // -----------------------------------------------------------------------
  console.log('🎵 Phase 2: Inserting new campaigns...');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Insert one-by-one to get clear error messages per row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (!row['Track Info'] && !row['URL'] && !row['Client']) {
      skippedCount++;
      continue;
    }

    // Map CSV columns → actual DB columns (1:1 mapping)
    const dbRow: Record<string, any> = {
      track_info: row['Track Info'] || null,
      client: row['Client'] || '',
      submit_date: row['Submit Date'] || '',
      start_date: row['Start Date'] || '',
      receipts: row['Receipts'] || '',
      service_type: row['Service Type'] || 'Reposts',
      goal: row['Goal'] || '',
      remaining: row['Remaining'] || '',
      status: row['Status'] || 'Active',
      url: row['URL'] || '',
      notes: row['Notes'] || '',
      confirm_start_date: row['Confirm Start Date?'] || '',
      send_receipts: row['Send Receipt(s)'] || '',
      ask_client_for_playlist: row['Ask Client for Playlist'] || '',
      invoice: row['Invoice'] || '',
      // Fields not in CSV — set defaults
      salesperson: '',
      sale_price: '',
      salesperson_email: '',
      last_modified: '',
      internal_notes: row['Notes'] || null,
      client_notes: null,
    };

    const { error } = await supabase
      .from('soundcloud_campaigns')
      .insert(dbRow);

    if (error) {
      console.error(`   ❌ Row ${i + 1}: ${row['Track Info'] || row['URL']}`);
      console.error(`      Error: ${error.message}`);
      errorCount++;
    } else {
      const label = row['Track Info'] || row['URL']?.substring(0, 50) || `Row ${i + 1}`;
      console.log(`   ✅ ${label}  |  Client: ${row['Client']}`);
      successCount++;
    }
  }

  // -----------------------------------------------------------------------
  // 4. Summary
  // -----------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Import Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  🗑️  Deleted:  ${deleteCount ?? '?'} old rows`);
  console.log(`  ✅ Inserted: ${successCount} new campaigns`);
  console.log(`  ❌ Errors:   ${errorCount}`);
  console.log(`  ⏭️  Skipped:  ${skippedCount}`);
  console.log(`  📊 CSV rows: ${rows.length}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // -----------------------------------------------------------------------
  // 5. Verify
  // -----------------------------------------------------------------------
  console.log('🔍 Phase 3: Verifying...');
  const { data: verify, error: verifyError } = await supabase
    .from('soundcloud_campaigns')
    .select('id, track_info, client, status')
    .order('id', { ascending: false })
    .limit(5);

  if (verifyError) {
    console.error('   ❌ Verification query failed:', verifyError.message);
  } else {
    console.log(`   Total rows after import: querying...`);
    const { count } = await supabase
      .from('soundcloud_campaigns')
      .select('id', { count: 'exact', head: true });
    console.log(`   📊 Total campaigns in DB: ${count}`);
    console.log(`   Latest 5 rows:`);
    for (const r of verify || []) {
      console.log(`     [${r.id}] ${r.track_info || '(no track info)'}  |  ${r.client}  |  ${r.status}`);
    }
  }

  console.log('\n✨ Import complete!\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
