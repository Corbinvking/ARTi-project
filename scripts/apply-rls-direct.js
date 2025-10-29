#!/usr/bin/env node
const { Client } = require('pg');

async function applyRLS() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to local Supabase PostgreSQL\n');

    const statements = [
      {
        name: 'Drop old user_roles policy',
        sql: `DROP POLICY IF EXISTS "user_roles_org_isolation" ON public.user_roles;`
      },
      {
        name: 'Create admin/manager view all user_roles policy',
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
      },
      {
        name: 'Create users view own role policy',
        sql: `
          CREATE POLICY "users_view_own_role"
            ON public.user_roles FOR SELECT
            USING (user_id = auth.uid());
        `
      },
      {
        name: 'Create admin/manager manage user_roles policy',
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
      },
      {
        name: 'Drop old vendor_users policy',
        sql: `DROP POLICY IF EXISTS "admin_manager_can_view_vendor_mappings" ON public.vendor_users;`
      },
      {
        name: 'Create admin/manager view vendor_mappings policy',
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
      }
    ];

    for (const stmt of statements) {
      console.log(`📋 ${stmt.name}...`);
      try {
        await client.query(stmt.sql);
        console.log('   ✅ Success\n');
      } catch (err) {
        console.error('   ⚠️  Error:', err.message, '\n');
        // Continue with other statements
      }
    }

    console.log('✨ Done! Refresh your browser.');
  } catch (err) {
    console.error('❌ Connection error:', err);
  } finally {
    await client.end();
  }
}

applyRLS().catch(console.error);

