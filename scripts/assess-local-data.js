#!/usr/bin/env node

/**
 * Assess Local Data Script
 * Analyzes all data in local Supabase to plan complete production migration
 */

const { createClient } = require('@supabase/supabase-js');

// Local Supabase connection
const localSupabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function assessLocalData() {
  console.log('🔍 ASSESSING LOCAL SUPABASE DATA FOR COMPLETE MIGRATION\n');

  const tables = [
    'orgs',
    'profiles', 
    'memberships',
    'user_permissions',
    'connected_accounts',
    'spotify_campaigns',
    'soundcloud_campaigns',
    'youtube_campaigns', 
    'instagram_campaigns',
    'insights',
    'documents',
    'chunks',
    'embeddings',
    'jobs',
    'webhook_events'
  ];

  const dataAssessment = {};

  for (const table of tables) {
    try {
      console.log(`📊 Checking ${table}...`);
      
      const { data, error, count } = await localSupabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
        dataAssessment[table] = { status: 'error', error: error.message };
        continue;
      }

      const recordCount = count || (data ? data.length : 0);
      console.log(`✅ ${table}: ${recordCount} records`);
      
      dataAssessment[table] = {
        status: 'success',
        count: recordCount,
        hasData: recordCount > 0,
        sampleRecord: data && data.length > 0 ? data[0] : null
      };

      // Show sample for important tables
      if (recordCount > 0 && ['orgs', 'profiles', 'memberships', 'user_permissions'].includes(table)) {
        console.log(`   📋 Sample:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      }

    } catch (err) {
      console.log(`❌ ${table}: Exception - ${err.message}`);
      dataAssessment[table] = { status: 'exception', error: err.message };
    }
  }

  console.log('\n🔍 CHECKING SUPABASE AUTH USERS...');
  try {
    const { data: authUsers, error: authError } = await localSupabase.auth.admin.listUsers();
    
    if (authError) {
      console.log(`❌ Auth Users: Error - ${authError.message}`);
      dataAssessment['auth_users'] = { status: 'error', error: authError.message };
    } else {
      console.log(`✅ Auth Users: ${authUsers.users.length} users`);
      dataAssessment['auth_users'] = {
        status: 'success',
        count: authUsers.users.length,
        hasData: authUsers.users.length > 0,
        users: authUsers.users.map(u => ({
          id: u.id,
          email: u.email,
          role: u.user_metadata?.role || 'none',
          created: u.created_at
        }))
      };

      // Show auth users
      authUsers.users.forEach(user => {
        console.log(`   👤 ${user.email} (${user.user_metadata?.role || 'no role'}) - ID: ${user.id}`);
      });
    }
  } catch (err) {
    console.log(`❌ Auth Users: Exception - ${err.message}`);
    dataAssessment['auth_users'] = { status: 'exception', error: err.message };
  }

  console.log('\n📊 SUMMARY REPORT:');
  console.log('==================');

  let totalRecords = 0;
  let tablesWithData = [];
  let tablesEmpty = [];

  Object.entries(dataAssessment).forEach(([table, info]) => {
    if (info.status === 'success' && info.hasData) {
      totalRecords += info.count;
      tablesWithData.push(`${table}: ${info.count} records`);
    } else if (info.status === 'success' && !info.hasData) {
      tablesEmpty.push(table);
    }
  });

  console.log(`\n✅ TABLES WITH DATA (${tablesWithData.length}):`);
  tablesWithData.forEach(item => console.log(`   • ${item}`));

  console.log(`\n📋 EMPTY TABLES (${tablesEmpty.length}):`);
  tablesEmpty.forEach(table => console.log(`   • ${table}`));

  console.log(`\n🎯 MIGRATION REQUIREMENTS:`);
  console.log(`   • Total Records: ${totalRecords}`);
  console.log(`   • Auth Users: ${dataAssessment.auth_users?.count || 0}`);
  console.log(`   • Tables to Migrate: ${tablesWithData.length}`);

  // Save assessment to file
  const fs = require('fs');
  const assessmentFile = 'local-data-assessment.json';
  fs.writeFileSync(assessmentFile, JSON.stringify(dataAssessment, null, 2));
  console.log(`\n💾 Full assessment saved to: ${assessmentFile}`);

  return dataAssessment;
}

if (require.main === module) {
  assessLocalData().catch(console.error);
}

module.exports = { assessLocalData };
