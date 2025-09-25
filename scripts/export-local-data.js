#!/usr/bin/env node

/**
 * Export Local Data Script
 * Exports all local data to JSON files for easy transfer to production
 * Run this on your LOCAL machine to export data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Local Supabase connection
const localSupabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function exportTable(tableName) {
  try {
    console.log(`📊 Exporting ${tableName}...`);
    
    const { data, error } = await localSupabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.log(`❌ Failed to export ${tableName}:`, error.message);
      return null;
    }
    
    console.log(`✅ Exported ${data.length} records from ${tableName}`);
    return data;
    
  } catch (err) {
    console.log(`❌ Exception exporting ${tableName}:`, err.message);
    return null;
  }
}

async function exportAuthUsers() {
  try {
    console.log(`👤 Exporting auth users...`);
    
    const { data: authUsers, error } = await localSupabase.auth.admin.listUsers();
    if (error) throw error;
    
    // Clean up user data for export
    const cleanUsers = authUsers.users.map(user => ({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata || {},
      app_metadata: user.app_metadata || {},
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at
    }));
    
    console.log(`✅ Exported ${cleanUsers.length} auth users`);
    return cleanUsers;
    
  } catch (error) {
    console.log(`❌ Failed to export auth users:`, error.message);
    return null;
  }
}

async function exportAllData() {
  console.log('📦 EXPORTING ALL LOCAL DATA FOR PRODUCTION MIGRATION');
  console.log('=====================================================\n');
  
  const exportData = {
    timestamp: new Date().toISOString(),
    source: 'local-supabase',
    destination: 'production-droplet',
    tables: {},
    auth_users: null
  };
  
  // Tables to export
  const tables = [
    'orgs',
    'memberships',
    'user_permissions',
    'spotify_campaigns',
    'soundcloud_campaigns', 
    'youtube_campaigns',
    'instagram_campaigns',
    'insights',
    'documents',
    'chunks'
  ];
  
  // Export each table
  for (const table of tables) {
    const data = await exportTable(table);
    if (data) {
      exportData.tables[table] = data;
    }
  }
  
  // Export auth users
  const authUsers = await exportAuthUsers();
  if (authUsers) {
    exportData.auth_users = authUsers;
  }
  
  // Create exports directory
  const exportsDir = 'data-exports';
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir);
  }
  
  // Save complete export
  const exportFile = path.join(exportsDir, `complete-export-${Date.now()}.json`);
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  
  // Save individual CSV files for easy import
  console.log('\n📄 CREATING CSV FILES FOR MANUAL IMPORT...');
  for (const [tableName, tableData] of Object.entries(exportData.tables)) {
    if (tableData && tableData.length > 0) {
      const csvFile = path.join(exportsDir, `${tableName}.csv`);
      const headers = Object.keys(tableData[0]);
      const csvContent = [
        headers.join(','),
        ...tableData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle JSON fields and special characters
            if (typeof value === 'object' && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');
      
      fs.writeFileSync(csvFile, csvContent);
      console.log(`✅ Created ${csvFile} (${tableData.length} rows)`);
    }
  }
  
  // Save auth users as JSON (can't easily CSV this)
  if (exportData.auth_users) {
    const authFile = path.join(exportsDir, 'auth-users.json');
    fs.writeFileSync(authFile, JSON.stringify(exportData.auth_users, null, 2));
    console.log(`✅ Created ${authFile} (${exportData.auth_users.length} users)`);
  }
  
  // Summary
  console.log('\n📊 EXPORT SUMMARY:');
  console.log('==================');
  const totalRecords = Object.values(exportData.tables).reduce((sum, data) => sum + (data?.length || 0), 0);
  console.log(`📦 Complete export: ${exportFile}`);
  console.log(`📊 Total records: ${totalRecords}`);
  console.log(`👤 Auth users: ${exportData.auth_users?.length || 0}`);
  console.log(`📁 Export directory: ${exportsDir}/`);
  
  console.log('\n🚀 UPLOAD TO DROPLET:');
  console.log('======================');
  console.log('1. Upload the exports directory to your droplet:');
  console.log(`   scp -r ${exportsDir}/ root@164.90.129.146:/root/`);
  console.log('');
  console.log('2. Or use individual CSV files in Supabase Studio:');
  console.log('   - Go to https://db.artistinfluence.com');
  console.log('   - Navigate to Table Editor');
  console.log('   - Select table → Import → CSV');
  console.log('   - Upload the corresponding CSV file');
  
  return exportFile;
}

if (require.main === module) {
  exportAllData().catch(console.error);
}

module.exports = { exportAllData };
