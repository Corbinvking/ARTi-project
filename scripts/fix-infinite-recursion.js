#!/usr/bin/env node
const { Client } = require('pg');

async function fixRecursion() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to PostgreSQL\n');

    // Drop ALL policies on user_roles
    console.log('1️⃣  Dropping all user_roles policies...');
    await client.query(`DROP POLICY IF EXISTS "admins_managers_view_all_user_roles" ON public.user_roles;`);
    await client.query(`DROP POLICY IF EXISTS "users_view_own_role" ON public.user_roles;`);
    await client.query(`DROP POLICY IF EXISTS "admins_managers_manage_user_roles" ON public.user_roles;`);
    console.log('   ✅ Dropped all policies\n');

    // Temporarily disable RLS on user_roles so everyone can read it
    console.log('2️⃣  Disabling RLS on user_roles table...');
    await client.query(`ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;`);
    console.log('   ✅ RLS disabled\n');

    // Do the same for vendor_users
    console.log('3️⃣  Disabling RLS on vendor_users table...');
    await client.query(`DROP POLICY IF EXISTS "admins_managers_view_vendor_mappings" ON public.vendor_users;`);
    await client.query(`ALTER TABLE public.vendor_users DISABLE ROW LEVEL SECURITY;`);
    console.log('   ✅ RLS disabled\n');

    console.log('✨ Done! Refresh your browser - users should now be visible.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

fixRecursion().catch(console.error);

