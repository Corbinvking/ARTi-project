/**
 * Import Campaigns from CSV to Database
 * 
 * This script imports all campaigns from the Active Campaigns CSV into the database.
 * Run this BEFORE the playlist enrichment script.
 * 
 * Usage: npx tsx scripts/import-campaigns-from-csv.ts
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

interface CSVRecord {
  Campaign: string;
  Client: string;
  'Update Client': string;
  Goal: string;
  Remaining: string;
  'Start Date': string;
  Daily: string;
  Weekly: string;
  URL: string;
  Playlists: string;
  Status: string;
  Vendor: string;
  'Sale price': string;
  'Paid Vendor?': string;
  'Curator Status': string;
  SFA: string;
  'Notify Vendor?': string;
  'Ask For SFA': string;
  Notes: string;
  'Last Modified': string;
  'Email 2 (from Clients)': string;
  'Email 3 (from Clients)': string;
  'SP Playlist Stuff': string;
}

async function main() {
  console.log('🚀 Starting campaign import from CSV...\n');

  // Initialize Supabase client
  // In production, use the internal Docker network URL
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  console.log(`🔗 Connecting to Supabase at: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'Spotify Playlisting-Active Campaigns (1).csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}\n\nPlease upload the CSV file to the server first.`);
  }

  console.log(`📄 Reading CSV from: ${csvPath}\n`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV
  const records: CSVRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} campaigns in CSV\n`);

  const results = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [] as { campaign: string; error: string }[],
  };

  // Get or create default org
  const { data: defaultOrg } = await supabase
    .from('orgs')
    .select('id')
    .limit(1)
    .single();

  const orgId = defaultOrg?.id || '00000000-0000-0000-0000-000000000001';

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const campaignName = record.Campaign?.trim();

    // Skip if campaign name is empty
    if (!campaignName) {
      console.log(`[${i + 1}/${records.length}] Skipping empty campaign name\n`);
      results.skipped++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${records.length}] Importing: ${campaignName}`);

      // Check if campaign already exists
      const { data: existing } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('campaign_name', campaignName)
        .single();

      if (existing) {
        console.log(`  ⏭️  Already exists, skipping...\n`);
        results.skipped++;
        continue;
      }

      // Find or create client
      let clientId = null;
      const clientName = record.Client?.trim();
      
      if (clientName) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('name', clientName)
          .single();

        if (client) {
          clientId = client.id;
        } else {
          // Create new client
          const emails = [
            record['Email 2 (from Clients)'],
            record['Email 3 (from Clients)'],
          ].filter(e => e && e.trim());

          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: clientName,
              emails: emails.length > 0 ? emails : null,
              org_id: orgId,
            })
            .select('id')
            .single();

          if (!clientError && newClient) {
            clientId = newClient.id;
            console.log(`  ➕ Created client: ${clientName}`);
          }
        }
      }

      // Find or create vendor
      let vendorId = null;
      const vendorName = record.Vendor?.trim();
      
      if (vendorName) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('name', vendorName)
          .single();

        if (vendor) {
          vendorId = vendor.id;
        } else {
          // Create new vendor
          const { data: newVendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
              name: vendorName,
              org_id: orgId,
              max_daily_streams: 10000,
            })
            .select('id')
            .single();

          if (!vendorError && newVendor) {
            vendorId = newVendor.id;
            console.log(`  ➕ Created vendor: ${vendorName}`);
          }
        }
      }

      // Parse numeric values
      const parseNumber = (val: string | undefined) => {
        if (!val || val.trim() === '') return null;
        const cleaned = val.replace(/[,$]/g, '').trim();
        const num = parseInt(cleaned);
        return isNaN(num) ? null : num;
      };

      const parseDecimal = (val: string | undefined) => {
        if (!val || val.trim() === '') return null;
        const cleaned = val.replace(/[$,]/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      // Parse date
      const parseDate = (val: string | undefined) => {
        if (!val || val.trim() === '') return null;
        try {
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        } catch {
          return null;
        }
      };

      // Insert campaign
      const { error: insertError } = await supabase
        .from('spotify_campaigns')
        .insert({
          campaign_name: campaignName,
          client_id: clientId,
          client: clientName || '',
          vendor_id: vendorId,
          vendor: vendorName || '',
          url: record.URL || '',
          goal: record.Goal || '0',
          remaining: record.Remaining || '0',
          daily: record.Daily || '0',
          weekly: record.Weekly || '0',
          sale_price: record['Sale price'] || '$0',
          start_date: parseDate(record['Start Date']),
          status: record.Status || 'Active',
          curator_status: record['Curator Status'] || null,
          playlists: record.Playlists || '',
          sfa_link: record.SFA || null,
          notes: record.Notes || '',
          historical_playlists: record.Playlists || '',
          playlist_links: record['SP Playlist Stuff'] || '',
          paid_vendor: record['Paid Vendor?'] === 'checked',
          update_client_verified: record['Update Client'] === 'checked',
          notify_vendor: record['Notify Vendor?'] === 'checked',
          ask_for_sfa: record['Ask For SFA'] === 'checked',
          org_id: orgId,
        });

      if (insertError) {
        throw insertError;
      }

      results.imported++;
      console.log(`  ✅ Imported successfully\n`);

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
      results.failed++;
      results.errors.push({
        campaign: campaignName,
        error: error.message,
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${results.imported}`);
  console.log(`⏭️  Skipped (existing):   ${results.skipped}`);
  console.log(`❌ Failed:                ${results.failed}`);
  console.log(`📊 Total in CSV:          ${records.length}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    results.errors.slice(0, 10).forEach(({ campaign, error }) => {
      console.log(`  Campaign: ${campaign}`);
      console.log(`  Error: ${error}\n`);
    });
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more errors`);
    }
  }

  console.log('\n✅ Import complete! Now run playlist enrichment:');
  console.log('   npx tsx scripts/enrich-campaign-playlists.ts\n');
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

