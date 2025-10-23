#!/usr/bin/env node
/**
 * Sync Clients from CSV
 * 
 * This script:
 * 1. Reads CSV and extracts unique clients
 * 2. Creates or updates clients in database
 * 3. Links client emails properly
 * 4. Generates client_id foreign keys for campaigns
 * 
 * Usage:
 *   node scripts/sync_clients_from_csv.js
 *   node scripts/sync_clients_from_csv.js --dry-run
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
 * Extract unique clients from CSV
 */
function extractUniqueClients(csvRecords) {
  const clientMap = new Map();
  
  for (const row of csvRecords) {
    const clientName = row.Client?.trim();
    const clientEmail = row['Client Email']?.trim();
    
    if (!clientName) continue;
    
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        name: clientName,
        emails: new Set()
      });
    }
    
    // Add email if present
    if (clientEmail && clientEmail !== '' && !clientEmail.includes('null')) {
      clientMap.get(clientName).emails.add(clientEmail);
    }
  }
  
  // Convert to array with emails as arrays
  return Array.from(clientMap.values()).map(client => ({
    name: client.name,
    emails: Array.from(client.emails)
  }));
}

/**
 * Find existing client by name
 */
async function findExistingClient(clientName) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('name', clientName)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error(`   ❌ Error finding client: ${error.message}`);
    return null;
  }
  
  return data;
}

/**
 * Create or update client
 */
async function upsertClient(clientData, dryRun = false) {
  const existing = await findExistingClient(clientData.name);
  
  if (existing) {
    // Update existing client
    if (dryRun) {
      console.log(`   [DRY RUN] Would UPDATE client: ${clientData.name}`);
      return { action: 'update', id: existing.id, dryRun: true };
    }
    
    // Merge emails (add new ones, keep existing)
    const existingEmails = existing.emails || [];
    const mergedEmails = Array.from(new Set([...existingEmails, ...clientData.emails]));
    
    const { data, error } = await supabase
      .from('clients')
      .update({
        emails: mergedEmails,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error updating client: ${error.message}`);
      return { action: 'error', error: error.message };
    }
    
    return { action: 'update', id: data.id, data };
  } else {
    // Create new client
    if (dryRun) {
      console.log(`   [DRY RUN] Would CREATE client: ${clientData.name}`);
      return { action: 'create', dryRun: true };
    }
    
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientData.name,
        emails: clientData.emails,
        org_id: DEFAULT_ORG_ID
      })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error creating client: ${error.message}`);
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
  console.log('👥 SYNC CLIENTS FROM CSV');
  console.log('================================================================================\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  // Parse CSV
  console.log('📄 Reading CSV...');
  const csvRecords = await parseCsv(csvPath);
  console.log(`✅ Parsed ${csvRecords.length} records\n`);
  
  // Extract unique clients
  console.log('🔍 Extracting unique clients...');
  const uniqueClients = extractUniqueClients(csvRecords);
  console.log(`✅ Found ${uniqueClients.length} unique clients\n`);
  
  // Show top 10 clients
  console.log('📊 Top 10 clients by campaign count:');
  const clientCounts = csvRecords.reduce((acc, row) => {
    const client = row.Client?.trim();
    if (client) {
      acc[client] = (acc[client] || 0) + 1;
    }
    return acc;
  }, {});
  
  Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([client, count], i) => {
      console.log(`   ${i + 1}. ${client.padEnd(30)} - ${count} campaigns`);
    });
  console.log('');
  
  // Process each client
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  console.log('🔄 Processing clients...\n');
  
  for (let i = 0; i < uniqueClients.length; i++) {
    const client = uniqueClients[i];
    const clientNum = i + 1;
    
    console.log(`   [${clientNum}/${uniqueClients.length}] Processing: ${client.name}`);
    if (client.emails.length > 0) {
      console.log(`      Emails: ${client.emails.join(', ')}`);
    }
    
    const result = await upsertClient(client, dryRun);
    
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
  console.log(`📊 Total:    ${uniqueClients.length}`);
  console.log('');
  
  if (dryRun) {
    console.log('⚠️  This was a DRY RUN - no changes were made');
    console.log('   Run without --dry-run to apply changes\n');
  } else {
    console.log('🎉 Client sync complete!\n');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

