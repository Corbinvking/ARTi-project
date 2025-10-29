#!/usr/bin/env node
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixUsersRLS() {
  // Connect to production PostgreSQL via the droplet
  const client = new Client({
    host: '164.90.129.146',
    port: 5432,
    user: 'postgres',
    password: 'your-super-secret-and-long-postgres-password',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('🔗 Connected to production PostgreSQL\n');

    console.log('📋 Dropping old policies...');
    await client.query(`DROP POLICY IF EXISTS "users_org_isolation" ON public.users;`);
    await client.query(`DROP POLICY IF EXISTS "Users can view own profile" ON public.users;`);
    await client.query(`DROP POLICY IF EXISTS "Users can update own profile" ON public.users;`);
    await client.query(`DROP POLICY IF EXISTS "admin_manager_can_view_all_users" ON public.users;`);
    await client.query(`DROP POLICY IF EXISTS "admin_can_manage_users" ON public.users;`);
    await client.query(`DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;`);
    console.log('   ✅ Dropped old policies\n');

    console.log('📋 Creating policy: users can view own profile...');
    await client.query(`
      CREATE POLICY "users_can_view_own_profile"
        ON public.users FOR SELECT
        USING (auth.uid() = id);
    `);
    console.log('   ✅ Created\n');

    console.log('📋 Creating policy: admins/managers can view all users...');
    await client.query(`
      CREATE POLICY "admin_manager_can_view_all_users"
        ON public.users FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
          )
        );
    `);
    console.log('   ✅ Created\n');

    console.log('📋 Verifying RLS is enabled...');
    await client.query(`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`);
    console.log('   ✅ RLS enabled\n');

    // Verify
    const policies = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'users'
      ORDER BY policyname;
    `);

    console.log('📋 Current policies on public.users:');
    policies.rows.forEach(p => {
      console.log(`   - ${p.policyname} (${p.cmd})`);
    });

    console.log('\n✨ Done! Refresh your browser and check the admin panel.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixUsersRLS();

