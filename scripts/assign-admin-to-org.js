#!/usr/bin/env node
const { Client } = require('pg');

async function assignToOrg() {
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

    const adminUserId = 'e9337ebd-df8c-4302-b03c-ee584aa8869f';

    // Check if orgs table has any organizations
    const { rows: orgs } = await client.query(`SELECT * FROM public.orgs LIMIT 5;`);
    console.log('📋 Found', orgs.length, 'organizations');
    
    if (orgs.length > 0) {
      orgs.forEach(org => {
        console.log(`   - ${org.name} (${org.id})`);
      });
      
      const defaultOrg = orgs[0];
      console.log('\n🎯 Using org:', defaultOrg.name, '\n');

      // Check if admin is already a member
      const { rows: existing } = await client.query(`
        SELECT * FROM public.memberships 
        WHERE user_id = $1 AND org_id = $2;
      `, [adminUserId, defaultOrg.id]);

      if (existing.length > 0) {
        console.log('✅ Admin is already a member of', defaultOrg.name);
      } else {
        // Add admin to org
        console.log('➕ Adding admin to organization...');
        await client.query(`
          INSERT INTO public.memberships (user_id, org_id, role)
          VALUES ($1, $2, 'admin')
          ON CONFLICT DO NOTHING;
        `, [adminUserId, defaultOrg.id]);
        console.log('✅ Admin added to organization!');
      }
    } else {
      console.log('\n⚠️  No organizations found. Creating default org...\n');
      
      // Create a default organization
      const { rows: newOrg } = await client.query(`
        INSERT INTO public.orgs (name, slug)
        VALUES ('Default Organization', 'default-org')
        RETURNING *;
      `);
      
      console.log('✅ Created org:', newOrg[0].name);
      
      // Add admin to new org
      await client.query(`
        INSERT INTO public.memberships (user_id, org_id, role)
        VALUES ($1, $2, 'admin');
      `, [adminUserId, newOrg[0].id]);
      
      console.log('✅ Admin added as owner!');
    }

    console.log('\n✨ Done! Refresh your browser - campaigns and clients should now be visible.');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

assignToOrg().catch(console.error);

