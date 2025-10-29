#!/usr/bin/env node
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkUsersRLS() {
  // For production self-hosted Supabase
  const client = new Client({
    connectionString: 'postgresql://postgres:your-super-secret-and-long-postgres-password@164.90.129.146:5432/postgres'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to production PostgreSQL\n');

    // Check if RLS is enabled on users table
    console.log('📋 Checking RLS status on public.users...\n');
    const rlsStatus = await client.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'users' AND relnamespace = 'public'::regnamespace;
    `);
    
    console.log('RLS Enabled:', rlsStatus.rows[0]?.relrowsecurity);

    // Check policies on users table
    console.log('\n📋 Checking RLS policies on public.users...\n');
    const policies = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'users';
    `);

    if (policies.rows.length === 0) {
      console.log('✅ No RLS policies found on public.users');
    } else {
      console.log(`Found ${policies.rows.length} policies:\n`);
      policies.rows.forEach(policy => {
        console.log(`Policy: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles}`);
        console.log(`  Using: ${policy.qual}`);
        console.log(`  With Check: ${policy.with_check}\n`);
      });
    }

    // Count total users
    const count = await client.query('SELECT COUNT(*) FROM public.users;');
    console.log(`\n📊 Total users in public.users: ${count.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsersRLS();

