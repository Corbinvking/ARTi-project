#!/usr/bin/env node
/**
 * Sync Vendors from CSV
 * 
 * This script:
 * 1. Reads CSV and extracts unique vendors
 * 2. Creates or updates vendors in database
 * 3. Links vendor emails properly
 * 
 * Usage:
 *   node scripts/sync_vendors_from_csv.js
 *   node scripts/sync_vendors_from_csv.js --dry-run
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
const csvPath = 'full-databse-chunk.csv';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default org_id
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Parse CSV file
 */
async function parseCsv(csvPath) {
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
  
  return records;
}

/**
 * Extract unique vendors from CSV
 */
function extractUniqueVendors(csvRecords) {
  const vendorMap = new Map();
  
  for (const row of csvRecords) {
    const vendorName = row.Vendor?.trim();
    const vendorEmail = row['Vendor Email']?.trim();
    
    if (!vendorName || vendorName === '' || vendorName === 'null') continue;
    
    if (!vendorMap.has(vendorName)) {
      vendorMap.set(vendorName, {
        name: vendorName,
        emails: new Set()
      });
    }
    
    // Add email if present
    if (vendorEmail && vendorEmail !== '' && !vendorEmail.includes('null')) {
      vendorMap.get(vendorName).emails.add(vendorEmail);
    }
  }
  
  // Convert to array with emails as arrays
  return Array.from(vendorMap.values()).map(vendor => ({
    name: vendor.name,
    email: Array.from(vendor.emails)[0] || null // Take first email
  }));
}

/**
 * Find existing vendor by name
 */
async function findExistingVendor(vendorName) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('name', vendorName)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error(`   ❌ Error finding vendor: ${error.message}`);
    return null;
  }
  
  return data;
}

/**
 * Create or update vendor
 */
async function upsertVendor(vendorData, dryRun = false) {
  const existing = await findExistingVendor(vendorData.name);
  
  if (existing) {
    // Update existing vendor
    if (dryRun) {
      console.log(`   [DRY RUN] Would UPDATE vendor: ${vendorData.name}`);
      return { action: 'update', id: existing.id, dryRun: true };
    }
    
    const { data, error } = await supabase
      .from('vendors')
      .update({
        email: vendorData.email || existing.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error updating vendor: ${error.message}`);
      return { action: 'error', error: error.message };
    }
    
    return { action: 'update', id: data.id, data };
  } else {
    // Create new vendor
    if (dryRun) {
      console.log(`   [DRY RUN] Would CREATE vendor: ${vendorData.name}`);
      return { action: 'create', dryRun: true };
    }
    
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: vendorData.name,
        email: vendorData.email,
        org_id: DEFAULT_ORG_ID
      })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error creating vendor: ${error.message}`);
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
  console.log('🏢 SYNC VENDORS FROM CSV');
  console.log('================================================================================\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  // Parse CSV
  console.log('📄 Reading CSV...');
  const csvRecords = await parseCsv(csvPath);
  console.log(`✅ Parsed ${csvRecords.length} records\n`);
  
  // Extract unique vendors
  console.log('🔍 Extracting unique vendors...');
  const uniqueVendors = extractUniqueVendors(csvRecords);
  console.log(`✅ Found ${uniqueVendors.length} unique vendors\n`);
  
  // Show all vendors
  console.log('📊 All vendors:');
  uniqueVendors.forEach((vendor, i) => {
    const email = vendor.email ? ` (${vendor.email})` : '';
    console.log(`   ${i + 1}. ${vendor.name}${email}`);
  });
  console.log('');
  
  // Process each vendor
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  console.log('🔄 Processing vendors...\n');
  
  for (let i = 0; i < uniqueVendors.length; i++) {
    const vendor = uniqueVendors[i];
    const vendorNum = i + 1;
    
    console.log(`   [${vendorNum}/${uniqueVendors.length}] Processing: ${vendor.name}`);
    if (vendor.email) {
      console.log(`      Email: ${vendor.email}`);
    }
    
    const result = await upsertVendor(vendor, dryRun);
    
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
  }
  
  // Summary
  console.log('================================================================================');
  console.log('📊 SYNC SUMMARY');
  console.log('================================================================================\n');
  console.log(`✅ Created:  ${created}`);
  console.log(`✅ Updated:  ${updated}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📊 Total:    ${uniqueVendors.length}`);
  console.log('');
  
  if (dryRun) {
    console.log('⚠️  This was a DRY RUN - no changes were made');
    console.log('   Run without --dry-run to apply changes\n');
  } else {
    console.log('🎉 Vendor sync complete!\n');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

