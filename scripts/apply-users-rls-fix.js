#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix to public.users table...\n');

  const sql = `
-- Drop old policies
DROP POLICY IF EXISTS "users_org_isolation" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "admin_manager_can_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_can_manage_users" ON public.users;

-- Allow users to view their own profile
CREATE POLICY "users_can_view_own_profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Allow admins and managers to view all users
CREATE POLICY "admin_manager_can_view_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
`;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 The exec_sql function might not exist. Use the SSH method instead.');
  } else {
    console.log('✅ RLS policies updated successfully!');
  }
}

applyRLSFix().catch(console.error);

