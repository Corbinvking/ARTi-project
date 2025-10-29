#!/usr/bin/env node
const { Client } = require('pg');

async function checkRoles() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    
    // Check the constraint
    const { rows } = await client.query(`
      SELECT 
        con.conname as constraint_name,
        pg_get_constraintdef(con.oid) as constraint_def
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'memberships'
      AND con.contype = 'c';
    `);

    console.log('📋 Constraints on memberships table:\n');
    rows.forEach(r => {
      console.log(`${r.constraint_name}:`);
      console.log(`  ${r.constraint_def}\n`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

checkRoles().catch(console.error);

