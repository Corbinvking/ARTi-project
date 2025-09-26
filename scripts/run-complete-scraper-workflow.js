#!/usr/bin/env node

/**
 * Complete Spotify Scraper Workflow
 * 
 * This script runs the complete workflow:
 * 1. Runs the Python scraper
 * 2. Parses the raw data into structured tables
 * 3. Shows you the results
 */

const { spawn } = require('child_process');
const path = require('path');

async function runCompleteWorkflow() {
  console.log('🚀 Complete Spotify Scraper Workflow\n');
  console.log('This will:');
  console.log('  1. 🎵 Run the Python scraper');
  console.log('  2. 📊 Parse raw data into structured tables');
  console.log('  3. 📋 Show you the results');
  console.log('  4. 🔍 Provide data viewing options\n');

  try {
    // Step 1: Run the scraper
    console.log('1️⃣ Running Python scraper...');
    console.log('   🎭 This will open a browser window - you can watch it work!');
    
    const scraperProcess = spawn('node', ['scripts/run-scraper-and-sync.js'], {
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      scraperProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Scraper completed successfully');
          resolve();
        } else {
          console.error(`❌ Scraper failed with code ${code}`);
          reject(new Error(`Scraper failed with code ${code}`));
        }
      });

      scraperProcess.on('error', (error) => {
        console.error('❌ Error running scraper:', error.message);
        reject(error);
      });
    });

    // Step 2: Parse the data
    console.log('\n2️⃣ Parsing scraper data into structured tables...');
    
    const parserProcess = spawn('node', ['scripts/parse-scraper-data.js'], {
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      parserProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Data parsing completed successfully');
          resolve();
        } else {
          console.error(`❌ Data parsing failed with code ${code}`);
          reject(new Error(`Data parsing failed with code ${code}`));
        }
      });

      parserProcess.on('error', (error) => {
        console.error('❌ Error parsing data:', error.message);
        reject(error);
      });
    });

    // Step 3: Show the results
    console.log('\n3️⃣ Showing structured data results...');
    
    const viewerProcess = spawn('node', ['scripts/view-scraper-data.js'], {
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      viewerProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Data viewing completed');
          resolve();
        } else {
          console.error(`❌ Data viewing failed with code ${code}`);
          reject(new Error(`Data viewing failed with code ${code}`));
        }
      });

      viewerProcess.on('error', (error) => {
        console.error('❌ Error viewing data:', error.message);
        reject(error);
      });
    });

    // Step 4: Summary
    console.log('\n🎉 Complete workflow finished successfully!');
    console.log('\n📋 What you can do now:');
    console.log('   • View structured data in Supabase Studio: http://localhost:54323');
    console.log('   • Query data via API: http://localhost:54321');
    console.log('   • Run custom queries on the structured tables');
    console.log('   • Export data for further analysis');
    console.log('   • Push to production when ready');

  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the complete workflow
runCompleteWorkflow().catch(console.error);
