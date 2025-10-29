#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLS() {
  console.log('🔧 Fixing RLS policies on user_roles table...\n');

  // First, verify the admin role exists in the table directly
  const { data: directCheck, error: directError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', 'e9337ebd-df8c-4302-b03c-ee584aa8869f');

  console.log('📋 Direct query result:', directCheck);
  console.log('❌ Direct query error:', directError);

  if (directError) {
    console.log('\n🔧 Attempting to disable RLS and add policies...\n');
    
    // Run SQL to fix RLS
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Make sure service role can read user_roles
        DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;
        
        CREATE POLICY "Service role full access"
          ON public.user_roles
          FOR ALL
          USING (true)
          WITH CHECK (true);
      `
    });

    if (sqlError) {
      console.error('❌ SQL error:', sqlError);
      console.log('\n⚠️  Need to run SQL manually. Please run this in your database:');
      console.log(`
DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;

CREATE POLICY "Service role full access"
  ON public.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);
      `);
    }
  } else if (!directCheck || directCheck.length === 0) {
    console.log('\n⚠️  Admin role not found in user_roles table!');
    console.log('Let me add it now...\n');
    
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: 'e9337ebd-df8c-4302-b03c-ee584aa8869f',
        role: 'admin'
      });
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Admin role added!');
    }
  } else {
    console.log('✅ Admin role exists!');
  }
}

fixRLS().catch(console.error);

