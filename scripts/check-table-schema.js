#!/usr/bin/env node
const { Client } = require('pg');

async function checkSchema() {
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

    // Check spotify_campaigns columns
    const { rows: campaignCols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'spotify_campaigns' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 spotify_campaigns columns:');
    campaignCols.forEach(c => {
      console.log(`   ${c.column_name}: ${c.data_type}`);
    });

    // Check clients columns
    const { rows: clientCols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 clients columns:');
    clientCols.forEach(c => {
      console.log(`   ${c.column_name}: ${c.data_type}`);
    });

    // Count total records
    const { rows: campaignCount } = await client.query(`SELECT COUNT(*) as count FROM public.spotify_campaigns;`);
    const { rows: clientCount } = await client.query(`SELECT COUNT(*) as count FROM public.clients;`);
    
    console.log(`\n📊 Total spotify_campaigns: ${campaignCount[0].count}`);
    console.log(`📊 Total clients: ${clientCount[0].count}`);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

checkSchema().catch(console.error);

