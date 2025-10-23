#!/usr/bin/env node
/**
 * Master Database Sync Orchestrator
 * 
 * This script runs the complete database sync pipeline:
 * 1. Sync clients from CSV
 * 2. Sync vendors from CSV
 * 3. Sync campaigns from CSV
 * 4. Link campaign relationships
 * 5. Verify database sync
 * 
 * Usage:
 *   node scripts/run_full_database_sync.js
 *   node scripts/run_full_database_sync.js --dry-run
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

/**
 * Run a script and wait for completion
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
  console.log('║' + '    🎯 FULL DATABASE SYNC - Master Orchestrator'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  const startTime = Date.now();
  
  try {
    // Step 1: Sync clients
    await runScript(
      path.join(__dirname, 'sync_clients_from_csv.js'),
      dryRun ? ['--dry-run'] : []
    );
    
    // Step 2: Sync vendors
    await runScript(
      path.join(__dirname, 'sync_vendors_from_csv.js'),
      dryRun ? ['--dry-run'] : []
    );
    
    // Step 3: Sync campaigns
    await runScript(
      path.join(__dirname, 'sync_campaigns_from_csv.js'),
      dryRun ? ['--dry-run'] : []
    );
    
    // Step 4: Link relationships (skip in dry-run)
    if (!dryRun) {
      await runScript(
        path.join(__dirname, 'link_campaign_relationships.js')
      );
    }
    
    // Step 5: Verify sync (skip in dry-run)
    if (!dryRun) {
      await runScript(
        path.join(__dirname, 'verify_database_sync.js')
      );
    }
    
    // Success!
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    ✅ FULL SYNC COMPLETE!'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + `    Duration: ${duration}s`.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('\n');
    
    if (dryRun) {
      console.log('⚠️  This was a DRY RUN - no changes were made');
      console.log('   Run without --dry-run to apply changes\n');
    } else {
      console.log('🎉 All data synced successfully!\n');
      console.log('📊 Next steps:');
      console.log('   1. Run Roster Scraper to collect SFA URLs');
      console.log('   2. Run Stream Data Scraper to get playlist data');
      console.log('   3. Deploy to production\n');
    }
    
  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message);
    console.error('\nThe sync pipeline was interrupted. Please fix the error and try again.\n');
    process.exit(1);
  }
}

// Run the orchestrator
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

