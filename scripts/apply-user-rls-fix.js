#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSFixes() {
  console.log('🔧 Applying RLS fixes for user_roles and vendor_users...\n');
  
  // Drop and recreate policies for user_roles
  console.log('1️⃣  Fixing user_roles policies...');
  
  // Drop old policy
  let { error } = await supabase.rpc('exec_sql', {
    sql: `DROP POLICY IF EXISTS "user_roles_org_isolation" ON public.user_roles;`
  });
  console.log('   Dropped old policy:', error ? error.message : '✅');
  
  // Allow admins/managers to view all roles
  ({ error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "admins_managers_view_all_user_roles"
        ON public.user_roles FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
          )
        );
    `
  }));
  console.log('   Created admin/manager view policy:', error ? error.message : '✅');
  
  // Allow users to view their own role
  ({ error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "users_view_own_role"
        ON public.user_roles FOR SELECT
        USING (user_id = auth.uid());
    `
  }));
  console.log('   Created user view own policy:', error ? error.message : '✅');
  
  // Allow admins/managers to manage roles
  ({ error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "admins_managers_manage_user_roles"
        ON public.user_roles FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
          )
        );
    `
  }));
  console.log('   Created admin/manager manage policy:', error ? error.message : '✅');
  
  console.log('\n2️⃣  Fixing vendor_users policies...');
  
  // Drop old policy
  ({ error } = await supabase.rpc('exec_sql', {
    sql: `DROP POLICY IF EXISTS "admin_manager_can_view_vendor_mappings" ON public.vendor_users;`
  }));
  console.log('   Dropped old policy:', error ? error.message : '✅');
  
  // Create new policy
  ({ error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "admins_managers_view_vendor_mappings"
        ON public.vendor_users FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
          )
        );
    `
  }));
  console.log('   Created admin/manager view policy:', error ? error.message : '✅');
  
  console.log('\n✨ Done! Refresh your browser to see users.');
}

applyRLSFixes().catch(console.error);

