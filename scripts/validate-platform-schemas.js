#!/usr/bin/env node

/**
 * Platform Schema Validation Script
 * 
 * Validates that all platform-specific tables exist in the database
 * with proper org_id columns and RLS policies.
 * 
 * Usage:
 *   node scripts/validate-platform-schemas.js
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Expected tables per platform
const PLATFORM_TABLES = {
  youtube: [
    'youtube_campaigns',
    'youtube_performance_logs',
    'youtube_ratio_fixer_queue'
  ],
  soundcloud: [
    'soundcloud_members',
    'soundcloud_submissions',
    'soundcloud_inquiries',
    'soundcloud_complaints',
    'soundcloud_genre_families',
    'soundcloud_subgenres',
    'soundcloud_mail_events',
    'soundcloud_settings'
  ],
  instagram: [
    'instagram_campaigns',
    'instagram_campaign_creators',
    'instagram_campaign_posts',
    'instagram_post_analytics',
    'instagram_tags',
    'instagram_algorithm_learning_log',
    'instagram_ab_tests'
  ],
  spotify: [
    'spotify_campaigns',
    'campaign_groups',
    'campaign_playlists',
    'playlists',
    'vendors',
    'clients',
    'salespeople'
  ]
};

// Expected enums per platform
const PLATFORM_ENUMS = {
  youtube: [
    'youtube_campaign_status',
    'youtube_service_type',
    'youtube_invoice_status',
    'youtube_priority_level',
    'youtube_queue_status'
  ],
  soundcloud: [
    'soundcloud_member_status',
    'soundcloud_size_tier',
    'soundcloud_submission_status',
    'soundcloud_inquiry_status',
    'soundcloud_complaint_status',
    'soundcloud_target_band_mode'
  ],
  instagram: [] // Instagram doesn't use enums
};

/**
 * Check if a table exists in the database
 */
async function checkTableExists(tableName) {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      ) as exists
    `,
    params: [tableName]
  });

  if (error) {
    // Fallback: Try to query the table directly
    const { error: queryError } = await supabase
      .from(tableName)
      .select('id')
      .limit(0);
    
    return !queryError || !queryError.message.includes('does not exist');
  }

  return data?.[0]?.exists || false;
}

/**
 * Check if a table has org_id column
 */
async function checkOrgIdColumn(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('org_id')
    .limit(0);

  // If error message contains "column does not exist", org_id is missing
  if (error && error.message.includes('column') && error.message.includes('does not exist')) {
    return false;
  }

  return true;
}

/**
 * Check if a table has RLS enabled
 */
async function checkRLSEnabled(tableName) {
  try {
    // Try to query pg_tables for RLS status
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT row_security 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = $1
      `,
      params: [tableName]
    });

    if (error || !data || data.length === 0) {
      return { enabled: 'unknown', error: error?.message };
    }

    return { enabled: data[0].row_security === true, error: null };
  } catch (err) {
    return { enabled: 'unknown', error: err.message };
  }
}

/**
 * Check if an enum type exists
 */
async function checkEnumExists(enumName) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT 1 
          FROM pg_type 
          WHERE typname = $1
        ) as exists
      `,
      params: [enumName]
    });

    if (error) {
      return false;
    }

    return data?.[0]?.exists || false;
  } catch (err) {
    return false;
  }
}

/**
 * Main validation function
 */
async function validatePlatformSchemas() {
  console.log('\n🔍 Platform Schema Validation\n');
  console.log(`Connected to: ${SUPABASE_URL}\n`);

  const results = {
    totalTables: 0,
    tablesExist: 0,
    tablesWithOrgId: 0,
    tablesWithRLS: 0,
    totalEnums: 0,
    enumsExist: 0,
    failures: []
  };

  // Check tables for each platform
  for (const [platform, tables] of Object.entries(PLATFORM_TABLES)) {
    console.log(`\n📊 ${platform.toUpperCase()} Platform:\n`);

    for (const tableName of tables) {
      results.totalTables++;
      
      const exists = await checkTableExists(tableName);
      
      if (exists) {
        results.tablesExist++;
        console.log(`  ✅ ${tableName} - exists`);

        // Check org_id column (skip for shared tables)
        const sharedTables = ['clients', 'vendors', 'salespeople', 'playlists'];
        if (!sharedTables.includes(tableName)) {
          const hasOrgId = await checkOrgIdColumn(tableName);
          if (hasOrgId) {
            results.tablesWithOrgId++;
            console.log(`     ✅ has org_id column`);
          } else {
            console.log(`     ❌ missing org_id column`);
            results.failures.push(`${tableName}: missing org_id`);
          }

          // Check RLS
          const rlsStatus = await checkRLSEnabled(tableName);
          if (rlsStatus.enabled === true) {
            results.tablesWithRLS++;
            console.log(`     ✅ RLS enabled`);
          } else if (rlsStatus.enabled === false) {
            console.log(`     ❌ RLS not enabled`);
            results.failures.push(`${tableName}: RLS not enabled`);
          } else {
            console.log(`     ⚠️  RLS status unknown`);
          }
        }
      } else {
        console.log(`  ❌ ${tableName} - DOES NOT EXIST`);
        results.failures.push(`${tableName}: table does not exist`);
      }
    }
  }

  // Check enums for each platform
  console.log('\n\n🔤 Enum Type Validation:\n');

  for (const [platform, enums] of Object.entries(PLATFORM_ENUMS)) {
    if (enums.length === 0) continue;

    console.log(`\n${platform.toUpperCase()}:`);

    for (const enumName of enums) {
      results.totalEnums++;
      
      const exists = await checkEnumExists(enumName);
      
      if (exists) {
        results.enumsExist++;
        console.log(`  ✅ ${enumName}`);
      } else {
        console.log(`  ❌ ${enumName} - DOES NOT EXIST`);
        results.failures.push(`${enumName}: enum does not exist`);
      }
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTables:`);
  console.log(`  Total expected: ${results.totalTables}`);
  console.log(`  Exist: ${results.tablesExist}/${results.totalTables}`);
  console.log(`  With org_id: ${results.tablesWithOrgId}`);
  console.log(`  With RLS: ${results.tablesWithRLS}`);
  
  console.log(`\nEnums:`);
  console.log(`  Total expected: ${results.totalEnums}`);
  console.log(`  Exist: ${results.enumsExist}/${results.totalEnums}`);

  if (results.failures.length > 0) {
    console.log(`\n❌ Failures (${results.failures.length}):`);
    results.failures.forEach(failure => {
      console.log(`  - ${failure}`);
    });
    console.log('\n');
    process.exit(1);
  } else {
    console.log(`\n✅ All validation checks passed!`);
    console.log('\n');
    process.exit(0);
  }
}

// Run validation
validatePlatformSchemas().catch(err => {
  console.error('\n❌ Validation error:', err.message);
  console.error(err);
  process.exit(1);
});

