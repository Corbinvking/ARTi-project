#!/usr/bin/env node
const { Client } = require('pg');

async function checkData() {
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

    // Check total campaigns
    const { rows: campaigns } = await client.query(`
      SELECT COUNT(*) as count, org_id 
      FROM public.spotify_campaigns 
      GROUP BY org_id;
    `);
    
    console.log('📋 Spotify Campaigns by org_id:');
    if (campaigns.length === 0) {
      console.log('   ⚠️  NO CAMPAIGNS FOUND IN DATABASE!\n');
    } else {
      campaigns.forEach(c => {
        console.log(`   Org ${c.org_id}: ${c.count} campaigns`);
      });
    }

    // Check total clients
    const { rows: clients } = await client.query(`
      SELECT COUNT(*) as count, org_id 
      FROM public.clients 
      GROUP BY org_id;
    `);
    
    console.log('\n📋 Clients by org_id:');
    if (clients.length === 0) {
      console.log('   ⚠️  NO CLIENTS FOUND IN DATABASE!\n');
    } else {
      clients.forEach(c => {
        console.log(`   Org ${c.org_id}: ${c.count} clients`);
      });
    }

    // Check what org the admin is in
    const { rows: membership } = await client.query(`
      SELECT org_id, role 
      FROM public.memberships 
      WHERE user_id = 'e9337ebd-df8c-4302-b03c-ee584aa8869f';
    `);
    
    console.log('\n👤 Admin user membership:');
    if (membership.length === 0) {
      console.log('   ⚠️  NOT IN ANY ORG!\n');
    } else {
      membership.forEach(m => {
        console.log(`   Org: ${m.org_id}, Role: ${m.role}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

checkData().catch(console.error);

