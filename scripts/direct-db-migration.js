#!/usr/bin/env node

/**
 * Direct Database Migration Script
 * Migrates data directly to production Supabase on the droplet
 * This runs ON the droplet, connecting to local Supabase instance
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Local Supabase configuration (on droplet)
const LOCAL_SUPABASE_URL = 'http://localhost:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);

async function createTestUsers() {
  console.log('👤 CREATING TEST USERS...\n');
  
  const testUsers = [
    { email: 'admin@artistinfluence.com', role: 'admin' },
    { email: 'manager@artistinfluence.com', role: 'manager' },
    { email: 'analyst@artistinfluence.com', role: 'sales' },
    { email: 'vendor@artistinfluence.com', role: 'vendor' },
    { email: 'creator@artistinfluence.com', role: 'vendor' }
  ];
  
  let successCount = 0;
  
  for (const user of testUsers) {
    try {
      console.log(`🔄 Creating user: ${user.email} (${user.role})`);
      
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'ArtistInfluence2025!',
        email_confirm: true,
        user_metadata: { 
          role: user.role,
          name: user.email.split('@')[0]
        }
      });
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        continue;
      }
      
      console.log(`  ✅ Created: ${user.email} with ID: ${newUser.user.id}`);
      successCount++;
      
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Created ${successCount}/${testUsers.length} users`);
  return successCount;
}

async function createTestOrganizations() {
  console.log('\n🏢 CREATING TEST ORGANIZATIONS...\n');
  
  const testOrgs = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Artist Influence',
      slug: 'artist-influence',
      settings: { currency: 'USD', timezone: 'UTC' }
    },
    {
      id: '22222222-2222-2222-2222-222222222222', 
      name: 'Demo Music Label',
      slug: 'demo-music',
      settings: { currency: 'USD', timezone: 'EST' }
    }
  ];
  
  let successCount = 0;
  
  for (const org of testOrgs) {
    try {
      console.log(`🔄 Creating org: ${org.name}`);
      
      const { data, error } = await supabase
        .from('orgs')
        .insert(org);
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        continue;
      }
      
      console.log(`  ✅ Created: ${org.name} (${org.slug})`);
      successCount++;
      
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Created ${successCount}/${testOrgs.length} organizations`);
  return successCount;
}

async function createSampleCampaigns() {
  console.log('\n🎵 CREATING SAMPLE CAMPAIGNS...\n');
  
  const sampleSpotifyCampaigns = [
    {
      campaign: 'Artist Influence Demo Track 1',
      client: 'Demo Artist 1',
      goal: 10000,
      salesperson: 'admin@artistinfluence.com',
      remaining: 8500,
      daily: 500,
      url: 'https://open.spotify.com/track/demo1',
      sale_price: 250.00,
      start_date: '2025-09-20',
      status: 'active',
      vendor: 'Demo Vendor 1',
      playlists: 15
    },
    {
      campaign: 'Artist Influence Demo Track 2', 
      client: 'Demo Artist 2',
      goal: 25000,
      salesperson: 'manager@artistinfluence.com',
      remaining: 20000,
      daily: 1000,
      url: 'https://open.spotify.com/track/demo2',
      sale_price: 500.00,
      start_date: '2025-09-22',
      status: 'active',
      vendor: 'Demo Vendor 2',
      playlists: 30
    }
  ];
  
  try {
    console.log(`🔄 Inserting ${sampleSpotifyCampaigns.length} Spotify campaigns...`);
    
    const { data, error } = await supabase
      .from('spotify_campaigns')
      .insert(sampleSpotifyCampaigns);
    
    if (error) {
      console.log(`❌ Failed: ${error.message}`);
      return 0;
    }
    
    console.log(`✅ Created ${sampleSpotifyCampaigns.length} Spotify campaigns`);
    return sampleSpotifyCampaigns.length;
    
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return 0;
  }
}

async function verifyMigration() {
  console.log('\n🔍 VERIFYING MIGRATION...\n');
  
  try {
    // Check auth users
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log(`👤 Auth Users: ${users.users.length}`);
    users.users.forEach(user => {
      console.log(`   • ${user.email} (${user.user_metadata?.role || 'no role'})`);
    });
    
    // Check organizations
    const { data: orgs, error: orgsError } = await supabase.from('orgs').select('*');
    if (orgsError) throw orgsError;
    console.log(`\n🏢 Organizations: ${orgs.length}`);
    orgs.forEach(org => {
      console.log(`   • ${org.name} (${org.slug})`);
    });
    
    // Check campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('spotify_campaigns')
      .select('campaign, client, status');
    if (campaignsError) throw campaignsError;
    console.log(`\n🎵 Spotify Campaigns: ${campaigns.length}`);
    campaigns.forEach(campaign => {
      console.log(`   • ${campaign.campaign} - ${campaign.client} (${campaign.status})`);
    });
    
  } catch (error) {
    console.log(`❌ Verification failed: ${error.message}`);
  }
}

async function runDirectMigration() {
  console.log('🚀 DIRECT DATABASE MIGRATION');
  console.log('============================');
  console.log('Target: Production Supabase on droplet');
  console.log('Method: Direct local database connection\n');
  
  // Test connection
  try {
    const { data } = await supabase.from('orgs').select('count', { count: 'exact', head: true });
    console.log('✅ Connected to production Supabase\n');
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Ensure Supabase is running: supabase start');
    console.log('2. Check if port 54321 is accessible');
    console.log('3. Verify service key is correct\n');
    return;
  }
  
  // Run migrations
  const userCount = await createTestUsers();
  const orgCount = await createTestOrganizations();
  const campaignCount = await createSampleCampaigns();
  
  await verifyMigration();
  
  console.log('\n🎉 MIGRATION SUMMARY:');
  console.log('=====================');
  console.log(`✅ Users created: ${userCount}`);
  console.log(`✅ Organizations created: ${orgCount}`);
  console.log(`✅ Campaigns created: ${campaignCount}`);
  
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('Admin: admin@artistinfluence.com / ArtistInfluence2025!');
  console.log('Manager: manager@artistinfluence.com / ArtistInfluence2025!');
  console.log('Analyst: analyst@artistinfluence.com / ArtistInfluence2025!');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Test login at https://app.artistinfluence.com');
  console.log('2. Verify admin panel functionality');
  console.log('3. Add more campaign data via CSV import');
  console.log('4. Configure Vercel environment variables');
}

if (require.main === module) {
  runDirectMigration().catch(console.error);
}

module.exports = { runDirectMigration };
