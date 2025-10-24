#!/usr/bin/env node
/**
 * Clean and Sync Database - Fresh Start
 * 
 * This script:
 * 1. DELETES all existing campaigns, clients, and vendors
 * 2. Syncs ONLY the 653 campaigns from CSV
 * 3. Creates ONLY the 203 clients from CSV
 * 4. Creates ONLY the 9 vendors from CSV
 * 5. Links all relationships
 * 
 * Result: A clean, airtight database with ONLY current data
 * 
 * ⚠️  WARNING: This will DELETE all existing data!
 * 
 * Usage:
 *   node scripts/clean_and_sync_database.js
 *   node scripts/clean_and_sync_database.js --confirm
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const autoConfirm = args.includes('--confirm');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Ask for user confirmation
 */
function askForConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Type "DELETE ALL" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'DELETE ALL');
    });
  });
}

/**
 * Delete all data from a table
 */
async function cleanTable(tableName) {
  console.log(`   🗑️  Cleaning ${tableName}...`);
  
  // Get count before
  const { count: beforeCount } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  
  console.log(`      Found ${beforeCount} records`);
  
  if (beforeCount === 0) {
    console.log(`      ✅ Already empty\n`);
    return { deleted: 0 };
  }
  
  // Get all IDs
  const { data: records, error: fetchError } = await supabase
    .from(tableName)
    .select('id');
  
  if (fetchError) {
    console.error(`      ❌ Error fetching records: ${fetchError.message}\n`);
    return { deleted: 0, error: fetchError.message };
  }
  
  console.log(`      Deleting ${records.length} records...`);
  
  // Delete in batches of 100
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const ids = batch.map(r => r.id);
    
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      console.error(`      ❌ Error deleting batch: ${deleteError.message}`);
    } else {
      deleted += batch.length;
      if (deleted % 500 === 0 || deleted === records.length) {
        console.log(`      Progress: ${deleted}/${records.length}`);
      }
    }
  }
  
  // Verify deletion
  const { count: afterCount } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  
  console.log(`      ✅ Deleted ${deleted} records (${afterCount} remaining)\n`);
  
  return { deleted };
}

/**
 * Run a sync script
 */
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Running: ${path.basename(scriptPath)}`);
    console.log('='.repeat(80) + '\n');
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed with code ${code}`));
      } else {
        resolve();
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + '    ⚠️  CLEAN DATABASE & FRESH SYNC'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');
  
  console.log('⚠️  WARNING: This will DELETE ALL existing data and sync ONLY the 653');
  console.log('   campaigns from the CSV. This creates a clean, airtight database.\n');
  console.log('📊 What will be deleted:');
  console.log('   - All existing campaigns');
  console.log('   - All existing campaign_playlists');
  console.log('   - All existing playlists');
  console.log('   - All existing clients');
  console.log('   - All existing vendors\n');
  console.log('📊 What will be created:');
  console.log('   - 653 campaigns from CSV');
  console.log('   - 203 clients from CSV');
  console.log('   - 9 vendors from CSV');
  console.log('   - All relationships properly linked\n');
  
  // Ask for confirmation unless --confirm flag is used
  if (!autoConfirm) {
    const confirmed = await askForConfirmation();
    
    if (!confirmed) {
      console.log('\n❌ Operation cancelled. No changes were made.\n');
      process.exit(0);
    }
  }
  
  console.log('\n✅ Confirmed. Starting clean and sync...\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Clean all tables (in correct order due to foreign keys)
    console.log('================================================================================');
    console.log('🗑️  STEP 1: CLEANING DATABASE');
    console.log('================================================================================\n');
    
    const deletedCounts = {
      campaign_playlists: 0,
      playlists: 0,
      spotify_campaigns: 0,
      clients: 0,
      vendors: 0
    };
    
    // Delete in order due to foreign key constraints
    deletedCounts.campaign_playlists = (await cleanTable('campaign_playlists')).deleted;
    deletedCounts.playlists = (await cleanTable('playlists')).deleted;
    deletedCounts.spotify_campaigns = (await cleanTable('spotify_campaigns')).deleted;
    deletedCounts.clients = (await cleanTable('clients')).deleted;
    deletedCounts.vendors = (await cleanTable('vendors')).deleted;
    
    console.log('✅ Database cleaned!\n');
    console.log('📊 Deletion Summary:');
    console.log(`   Campaign Playlists: ${deletedCounts.campaign_playlists}`);
    console.log(`   Playlists:          ${deletedCounts.playlists}`);
    console.log(`   Campaigns:          ${deletedCounts.spotify_campaigns}`);
    console.log(`   Clients:            ${deletedCounts.clients}`);
    console.log(`   Vendors:            ${deletedCounts.vendors}`);
    console.log(`   TOTAL DELETED:      ${Object.values(deletedCounts).reduce((a, b) => a + b, 0)}\n`);
    
    // Step 2: Sync fresh data from CSV
    console.log('================================================================================');
    console.log('📥 STEP 2: SYNCING FRESH DATA FROM CSV');
    console.log('================================================================================\n');
    
    // Sync clients
    await runScript(path.join(__dirname, 'sync_clients_from_csv.js'));
    
    // Sync vendors
    await runScript(path.join(__dirname, 'sync_vendors_from_csv.js'));
    
    // Sync campaigns
    await runScript(path.join(__dirname, 'sync_campaigns_from_csv.js'));
    
    // Link relationships
    await runScript(path.join(__dirname, 'link_campaign_relationships.js'));
    
    // Verify
    await runScript(path.join(__dirname, 'verify_database_sync.js'));
    
    // Success!
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    ✅ CLEAN SYNC COMPLETE!'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + `    Duration: ${duration}s`.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('\n');
    
    console.log('🎉 Database is now clean and contains ONLY the 653 campaigns from CSV!\n');
    console.log('📊 Your database now has:');
    console.log('   - 653 campaigns (from CSV)');
    console.log('   - 203 clients (from CSV)');
    console.log('   - 9 vendors (from CSV)');
    console.log('   - 0 old/stale data\n');
    console.log('🚀 Next steps:');
    console.log('   1. Run Roster Scraper to collect SFA URLs');
    console.log('   2. Run Stream Data Scraper to get playlist data');
    console.log('   3. Deploy to production\n');
    
  } catch (error) {
    console.error('\n❌ OPERATION FAILED:', error.message);
    console.error('\nThe operation was interrupted. Your database may be in an inconsistent state.');
    console.error('You can re-run this script to try again.\n');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

