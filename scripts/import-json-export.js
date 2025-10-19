#!/usr/bin/env node

/**
 * Import JSON Export Script
 * Imports the complete-export JSON file into a fresh Supabase instance
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Target Supabase connection (fresh instance)
const targetSupabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

const EXPORT_FILE = path.join(__dirname, '..', 'supabase-export', 'complete-export-1758817145392.json');

async function importTable(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⚠️  No data to import for ${tableName}`);
    return;
  }

  try {
    console.log(`📥 Importing ${data.length} records into ${tableName}...`);

    // Clear existing data
    const { error: deleteError } = await targetSupabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError && !deleteError.message.includes('relation') && !deleteError.message.includes('does not exist')) {
      console.log(`❌ Failed to clear ${tableName}:`, deleteError.message);
      return;
    }

    // Import new data
    const { error: insertError } = await targetSupabase
      .from(tableName)
      .insert(data);

    if (insertError) {
      console.log(`❌ Failed to import ${tableName}:`, insertError.message);
    } else {
      console.log(`✅ Successfully imported ${data.length} records into ${tableName}`);
    }

  } catch (err) {
    console.log(`❌ Exception importing ${tableName}:`, err.message);
  }
}

async function importAuthUsers(users) {
  if (!users || users.length === 0) {
    console.log(`⚠️  No auth users to import`);
    return;
  }

  try {
    console.log(`👤 Importing ${users.length} auth users...`);

    // Note: Auth users typically need to be recreated manually for security
    // This is a placeholder for the auth user import process
    console.log(`✅ Auth users data loaded (${users.length} users)`);
    console.log(`⚠️  Note: Auth users should be recreated manually for security reasons`);

  } catch (err) {
    console.log(`❌ Exception importing auth users:`, err.message);
  }
}

async function importDatabase() {
  console.log('🚀 STARTING DATABASE IMPORT FROM JSON EXPORT');
  console.log('=' .repeat(60));

  try {
    // Check if export file exists
    if (!fs.existsSync(EXPORT_FILE)) {
      console.error('❌ Export file not found:', EXPORT_FILE);
      console.log('Please ensure the complete-export JSON file is in the supabase-export directory');
      process.exit(1);
    }

    // Read and parse export file
    console.log('📖 Reading export file...');
    const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

    console.log(`📋 Export source: ${exportData.source}`);
    console.log(`📅 Export date: ${new Date(exportData.timestamp).toLocaleString()}`);
    console.log('');

    const tables = exportData.tables;

    // Import each table
    for (const [tableName, data] of Object.entries(tables)) {
      if (tableName === 'auth_users') {
        await importAuthUsers(data);
      } else {
        await importTable(tableName, data);
      }
    }

    console.log('');
    console.log('✅ DATABASE IMPORT COMPLETED!');
    console.log('');
    console.log('📋 IMPORT SUMMARY:');
    console.log(`   📊 Tables processed: ${Object.keys(tables).length}`);
    console.log(`   📄 Export file: ${path.basename(EXPORT_FILE)}`);
    console.log(`   🕒 Import completed: ${new Date().toLocaleString()}`);

    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. Verify data integrity with test queries');
    console.log('   2. Update environment variables');
    console.log('   3. Test application functionality');
    console.log('   4. Create admin users if needed');

  } catch (error) {
    console.error('❌ IMPORT FAILED:', error.message);
    process.exit(1);
  }
}

// Run the import
importDatabase();

