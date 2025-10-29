#!/usr/bin/env node
const { Client } = require('pg');

async function checkAllRLS() {
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

    // Check which tables have RLS enabled
    const { rows: tables } = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND rowsecurity = true
      ORDER BY tablename;
    `);

    console.log('📋 Tables with RLS enabled:\n');
    tables.forEach(t => {
      console.log(`   - ${t.tablename}`);
    });

    console.log('\n🔍 Checking policies on these tables:\n');
    
    for (const table of tables) {
      const { rows: policies } = await client.query(`
        SELECT 
          policyname,
          cmd,
          qual::text as using_clause
        FROM pg_policies 
        WHERE tablename = $1
        ORDER BY policyname;
      `, [table.tablename]);

      if (policies.length > 0) {
        console.log(`\n📌 ${table.tablename}:`);
        policies.forEach(p => {
          console.log(`   ${p.cmd}: ${p.policyname}`);
        });
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

checkAllRLS().catch(console.error);

