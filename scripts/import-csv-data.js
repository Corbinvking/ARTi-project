#!/usr/bin/env node

/**
 * Import CSV Data Script
 * Imports all exported CSV data into production Supabase on the droplet
 * Run this ON the droplet after uploading CSV files
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Local Supabase configuration (on droplet)
const LOCAL_SUPABASE_URL = 'http://localhost:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);

// CSV files to import in order
const CSV_FILES = [
  { file: 'orgs.csv', table: 'orgs', description: 'Organizations' },
  { file: 'memberships.csv', table: 'memberships', description: 'User Memberships' },
  { file: 'user_permissions.csv', table: 'user_permissions', description: 'User Permissions' },
  { file: 'spotify_campaigns.csv', table: 'spotify_campaigns', description: 'Spotify Campaigns' },
  { file: 'soundcloud_campaigns.csv', table: 'soundcloud_campaigns', description: 'SoundCloud Campaigns' },
  { file: 'youtube_campaigns.csv', table: 'youtube_campaigns', description: 'YouTube Campaigns' },
  { file: 'instagram_campaigns.csv', table: 'instagram_campaigns', description: 'Instagram Campaigns' },
  { file: 'insights.csv', table: 'insights', description: 'Insights' },
  { file: 'documents.csv', table: 'documents', description: 'Documents' },
  { file: 'chunks.csv', table: 'chunks', description: 'Document Chunks' }
];

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        if (inQuotes && lines[i][j + 1] === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        let value = values[idx];
        
        // Handle special values
        if (value === '' || value === 'NULL') {
          value = null;
        } else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (!isNaN(value) && value !== '') {
          // Try to parse as number
          const num = parseFloat(value);
          if (!isNaN(num)) value = num;
        } else if (value.startsWith('{') || value.startsWith('[')) {
          // Try to parse JSON
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if JSON parse fails
          }
        }
        
        row[header] = value;
      });
      data.push(row);
    }
  }
  
  return data;
}

async function importCSVFile(csvFile, tableName, description) {
  const csvPath = `/root/data-exports/${csvFile}`;
  
  console.log(`\n📊 IMPORTING ${description.toUpperCase()}`);
  console.log(`📄 File: ${csvPath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.log(`❌ File not found: ${csvPath}`);
      return { success: false, error: 'File not found' };
    }
    
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const data = parseCSV(csvContent);
    
    if (data.length === 0) {
      console.log(`⚠️  No data found in ${csvFile}`);
      return { success: true, imported: 0 };
    }
    
    console.log(`📋 Found ${data.length} records to import`);
    
    // Clear existing data (optional - comment out to preserve)
    console.log(`🧹 Clearing existing data in ${tableName}...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible ID
    
    if (deleteError) {
      console.log(`⚠️  Could not clear existing data: ${deleteError.message}`);
    }
    
    // Import in batches
    const batchSize = 100;
    let totalImported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`  🔄 Importing batch ${batchNum} (${batch.length} records)...`);
      
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        console.log(`  ❌ Batch ${batchNum} failed: ${insertError.message}`);
        console.log(`  📝 Sample record:`, JSON.stringify(batch[0], null, 2));
        // Continue with other batches
      } else {
        console.log(`  ✅ Batch ${batchNum} imported successfully`);
        totalImported += batch.length;
      }
    }
    
    console.log(`📊 ${tableName} import summary: ${totalImported}/${data.length} records imported`);
    return { success: true, imported: totalImported, total: data.length };
    
  } catch (error) {
    console.log(`❌ Error importing ${csvFile}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function importAuthUsers() {
  console.log(`\n👤 IMPORTING AUTH USERS`);
  
  const authFile = '/root/data-exports/auth-users.json';
  
  try {
    if (!fs.existsSync(authFile)) {
      console.log(`❌ Auth users file not found: ${authFile}`);
      return { success: false, error: 'File not found' };
    }
    
    const authData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    console.log(`📋 Found ${authData.length} auth users to import`);
    
    let imported = 0;
    
    for (const user of authData) {
      try {
        console.log(`  🔄 Creating user: ${user.email}`);
        
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const userExists = existingUsers.users.some(u => u.email === user.email);
        
        if (userExists) {
          console.log(`  ⏭️  User ${user.email} already exists, skipping`);
          continue;
        }
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'ArtistInfluence2025!', // Default password
          email_confirm: true,
          user_metadata: user.user_metadata || {},
          app_metadata: user.app_metadata || {}
        });
        
        if (createError) {
          console.log(`  ❌ Failed to create ${user.email}: ${createError.message}`);
        } else {
          console.log(`  ✅ Created: ${user.email}`);
          imported++;
        }
        
      } catch (userError) {
        console.log(`  ❌ Error creating ${user.email}: ${userError.message}`);
      }
    }
    
    console.log(`📊 Auth users import summary: ${imported}/${authData.length} users imported`);
    return { success: true, imported, total: authData.length };
    
  } catch (error) {
    console.log(`❌ Error importing auth users: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifyImports() {
  console.log(`\n🔍 VERIFYING IMPORTS`);
  console.log(`====================`);
  
  // Check table counts
  for (const csvFile of CSV_FILES) {
    try {
      const { count } = await supabase
        .from(csvFile.table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`✅ ${csvFile.table}: ${count} records`);
    } catch (error) {
      console.log(`❌ ${csvFile.table}: Error - ${error.message}`);
    }
  }
  
  // Check auth users
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log(`✅ auth_users: ${users.users.length} users`);
  } catch (error) {
    console.log(`❌ auth_users: Error - ${error.message}`);
  }
}

async function runBulkImport() {
  console.log('🚀 BULK CSV DATA IMPORT');
  console.log('========================');
  console.log('Target: Production Supabase on droplet');
  console.log('Source: /root/data-exports/ CSV files\n');
  
  // Test connection
  try {
    const { data } = await supabase.from('orgs').select('count', { count: 'exact', head: true });
    console.log('✅ Connected to production Supabase\n');
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Ensure Supabase is running: supabase start');
    console.log('2. Check if data-exports directory exists: ls /root/data-exports/');
    console.log('3. Verify CSV files are uploaded\n');
    return;
  }
  
  // Import auth users first
  await importAuthUsers();
  
  // Import CSV data
  const results = [];
  for (const csvFile of CSV_FILES) {
    const result = await importCSVFile(csvFile.file, csvFile.table, csvFile.description);
    results.push({ ...csvFile, ...result });
  }
  
  // Verify imports
  await verifyImports();
  
  // Summary
  console.log(`\n🎉 IMPORT COMPLETE!`);
  console.log(`==================`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalImported = successful.reduce((sum, r) => sum + (r.imported || 0), 0);
  
  console.log(`✅ Successful imports: ${successful.length}/${results.length}`);
  console.log(`📊 Total records imported: ${totalImported}`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed imports:`);
    failed.forEach(f => console.log(`   • ${f.file}: ${f.error}`));
  }
  
  console.log(`\n🚀 NEXT STEPS:`);
  console.log(`1. Test login at https://app.artistinfluence.com`);
  console.log(`2. Verify campaign data in admin panel`);
  console.log(`3. Configure Vercel environment variables`);
  console.log(`4. Test all functionality`);
}

if (require.main === module) {
  runBulkImport().catch(console.error);
}

module.exports = { runBulkImport, importCSVFile, importAuthUsers };
