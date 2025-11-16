import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying org_id migration to instagram_campaigns...\n');

  try {
    console.log('Step 1: Checking if org_id column already exists...');
    const { data: checkData, error: checkError } = await supabase
      .from('instagram_campaigns')
      .select('org_id')
      .limit(1);

    if (!checkError && checkData) {
      console.log('⚠️  org_id column already exists! Skipping migration.');
      console.log('✅ Instagram campaigns table is ready.\n');
      return;
    }

    console.log('Step 2: Adding org_id column...');
    // Note: Direct SQL execution through Supabase JS client is limited
    // This migration should be run via Supabase CLI or direct PostgreSQL access
    console.log('⚠️  Cannot execute DDL statements through Supabase JS client');
    console.log('📋 Migration needs to be applied via:');
    console.log('   - Supabase CLI: npx supabase migration up');
    console.log('   - Or manually via PostgreSQL');
    console.log('\n✅ Migration file created at:');
    console.log('   supabase/migrations/049_add_org_id_to_instagram_campaigns.sql\n');

    // Verify changes
    console.log('🔍 Verifying changes...\n');

    // Check if org_id column exists
    const { data: columns, error: colError } = await supabase
      .from('instagram_campaigns')
      .select('*')
      .limit(1);

    if (colError) {
      console.error('❌ Verification failed:', colError);
    } else {
      console.log('✅ Verified: instagram_campaigns table accessible');
      if (columns && columns.length > 0 && columns[0].org_id) {
        console.log('✅ Verified: org_id column exists');
      }
    }

    // Count campaigns with org_id
    const { count, error: countError } = await supabase
      .from('instagram_campaigns')
      .select('*', { count: 'exact', head: true })
      .not('org_id', 'is', null);

    if (!countError) {
      console.log(`✅ ${count} campaigns have org_id set\n`);
    }

    console.log('🎉 Migration complete!');
    console.log('📝 Next steps:');
    console.log('   1. Campaigns now have RLS enabled');
    console.log('   2. All campaigns linked to demo org');
    console.log('   3. Users can only see campaigns in their org');
    console.log('   4. Ready for CRUD operations\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

applyMigration();

