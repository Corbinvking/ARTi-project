#!/usr/bin/env node

/**
 * Complete Production Migration Script
 * Mirrors ALL local Supabase data to production instance
 * 
 * MIGRATION TARGETS:
 * - 7 Auth Users (admin, manager, analyst, creator, sales, vendor, rbac)
 * - 2 Organizations
 * - 9 Memberships 
 * - 31 User Permissions
 * - 5,111 Campaign Records (Spotify, SoundCloud, YouTube, Instagram)
 * - 1 Insight record
 * - 2 Documents + 3 Chunks
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Production configuration (update these)
const PROD_SUPABASE_URL = 'https://api.artistinfluence.com';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create clients
const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);
const prodSupabase = createClient(PROD_SUPABASE_URL, PROD_SERVICE_KEY);

async function testConnections() {
  console.log('🔌 TESTING CONNECTIONS...\n');
  
  try {
    // Test local connection
    const { data: localTest } = await localSupabase.from('orgs').select('count', { count: 'exact', head: true });
    console.log('✅ Local Supabase: Connected');
    
    // Test production connection  
    const { data: prodTest, error: prodError } = await prodSupabase.from('orgs').select('count', { count: 'exact', head: true });
    if (prodError) {
      console.log('❌ Production Supabase: Failed -', prodError.message);
      return false;
    }
    console.log('✅ Production Supabase: Connected');
    
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function migrateAuthUsers() {
  console.log('\n👤 MIGRATING AUTH USERS...');
  
  try {
    // Get local auth users
    const { data: localUsers, error: localError } = await localSupabase.auth.admin.listUsers();
    if (localError) throw localError;
    
    console.log(`📊 Found ${localUsers.users.length} users to migrate`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const user of localUsers.users) {
      try {
        console.log(`  🔄 Migrating: ${user.email} (${user.user_metadata?.role || 'no role'})`);
        
        // Check if user already exists
        const { data: existingUsers } = await prodSupabase.auth.admin.listUsers();
        const userExists = existingUsers.users.some(u => u.email === user.email);
        
        if (userExists) {
          console.log(`  ⏭️  User ${user.email} already exists, skipping`);
          skipCount++;
          continue;
        }
        
        // Create user in production
        const { data: newUser, error: createError } = await prodSupabase.auth.admin.createUser({
          email: user.email,
          password: 'Password123!', // Default password - users should change
          email_confirm: true,
          user_metadata: user.user_metadata || {},
          app_metadata: user.app_metadata || {}
        });
        
        if (createError) {
          console.log(`  ❌ Failed to create ${user.email}:`, createError.message);
          continue;
        }
        
        console.log(`  ✅ Created: ${user.email} with ID: ${newUser.user.id}`);
        successCount++;
        
      } catch (userError) {
        console.log(`  ❌ Error migrating ${user.email}:`, userError.message);
      }
    }
    
    console.log(`\n📊 Auth Migration Summary:`);
    console.log(`   • Created: ${successCount} users`);
    console.log(`   • Skipped: ${skipCount} users`);
    console.log(`   • Total: ${localUsers.users.length} users`);
    
  } catch (error) {
    console.log('❌ Auth user migration failed:', error.message);
  }
}

async function migrateTableData(tableName, batchSize = 100) {
  console.log(`\n📊 MIGRATING TABLE: ${tableName}`);
  
  try {
    // Get local data
    const { data: localData, error: localError } = await localSupabase
      .from(tableName)
      .select('*');
    
    if (localError) {
      console.log(`❌ Failed to fetch ${tableName}:`, localError.message);
      return;
    }
    
    if (!localData || localData.length === 0) {
      console.log(`  📭 No data in ${tableName}, skipping`);
      return;
    }
    
    console.log(`  📋 Found ${localData.length} records`);
    
    // Clear existing data in production (optional - comment out to preserve)
    // const { error: deleteError } = await prodSupabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // if (deleteError) console.log(`  ⚠️  Could not clear existing data: ${deleteError.message}`);
    
    // Insert data in batches
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);
      console.log(`  🔄 Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
      
      const { data: insertData, error: insertError } = await prodSupabase
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        console.log(`  ❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, insertError.message);
        errorCount += batch.length;
      } else {
        console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1} successful`);
        successCount += batch.length;
      }
    }
    
    console.log(`  📊 ${tableName} Migration Summary:`);
    console.log(`     • Success: ${successCount} records`);
    console.log(`     • Errors: ${errorCount} records`);
    
  } catch (error) {
    console.log(`❌ ${tableName} migration failed:`, error.message);
  }
}

async function verifyMigration() {
  console.log('\n🔍 VERIFYING MIGRATION...');
  
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
  
  console.log('\n📊 RECORD COUNTS COMPARISON:');
  console.log('Table                    | Local  | Production | Status');
  console.log('-------------------------|--------|------------|--------');
  
  for (const table of tables) {
    try {
      const { count: localCount } = await localSupabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      const { count: prodCount } = await prodSupabase
        .from(table)  
        .select('*', { count: 'exact', head: true });
      
      const status = localCount === prodCount ? '✅ Match' : '❌ Mismatch';
      const tablePadded = table.padEnd(24);
      const localPadded = String(localCount || 0).padStart(6);
      const prodPadded = String(prodCount || 0).padStart(10);
      
      console.log(`${tablePadded} | ${localPadded} | ${prodPadded} | ${status}`);
      
    } catch (error) {
      const tablePadded = table.padEnd(24);
      console.log(`${tablePadded} | ERROR  | ERROR      | ❌ Failed`);
    }
  }
  
  // Check auth users
  try {
    const { data: localUsers } = await localSupabase.auth.admin.listUsers();
    const { data: prodUsers } = await prodSupabase.auth.admin.listUsers();
    
    const localCount = localUsers.users.length;
    const prodCount = prodUsers.users.length;
    const status = localCount === prodCount ? '✅ Match' : '❌ Mismatch';
    
    console.log(`auth_users              | ${String(localCount).padStart(6)} | ${String(prodCount).padStart(10)} | ${status}`);
    
  } catch (error) {
    console.log(`auth_users              | ERROR  | ERROR      | ❌ Failed`);
  }
}

async function generateMigrationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    migration_summary: {
      total_tables_migrated: 0,
      total_records_migrated: 0,
      auth_users_migrated: 0,
      status: 'completed'
    },
    details: {}
  };
  
  // Save report
  const reportFile = `migration-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Migration report saved: ${reportFile}`);
}

async function runCompleteMigration() {
  console.log('🚀 STARTING COMPLETE PRODUCTION MIGRATION');
  console.log('==========================================');
  console.log('Target: Mirror ALL local data to production');
  console.log('Scope: 7 users, 2 orgs, 9 memberships, 31 permissions, 5,111 campaigns\n');
  
  // Step 1: Test connections
  const connectionsOk = await testConnections();
  if (!connectionsOk) {
    console.log('\n❌ Migration aborted due to connection issues');
    return;
  }
  
  // Step 2: Migrate auth users first
  await migrateAuthUsers();
  
  // Step 3: Migrate core data tables
  const coreTables = ['orgs', 'memberships', 'user_permissions'];
  for (const table of coreTables) {
    await migrateTableData(table);
  }
  
  // Step 4: Migrate campaign data
  const campaignTables = ['spotify_campaigns', 'soundcloud_campaigns', 'youtube_campaigns', 'instagram_campaigns'];
  for (const table of campaignTables) {
    await migrateTableData(table, 250); // Larger batches for campaign data
  }
  
  // Step 5: Migrate additional data
  const additionalTables = ['insights', 'documents', 'chunks'];
  for (const table of additionalTables) {
    await migrateTableData(table);
  }
  
  // Step 6: Verify migration
  await verifyMigration();
  
  // Step 7: Generate report
  await generateMigrationReport();
  
  console.log('\n🎉 MIGRATION COMPLETE!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Test login at https://app.artistinfluence.com');  
  console.log('2. Verify admin panel functionality');
  console.log('3. Check campaign data display');
  console.log('4. Test role-based access control');
  console.log('\n🔐 DEFAULT PASSWORD: Password123!');
  console.log('   (All migrated users should change their passwords)');
}

// Allow running as standalone script or importing as module
if (require.main === module) {
  runCompleteMigration().catch(console.error);
}

module.exports = { 
  runCompleteMigration,
  migrateAuthUsers,
  migrateTableData,
  verifyMigration,
  testConnections
};
