#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log('🧪 Testing basic queries...\n');

  // Test campaigns
  console.log('1️⃣  Testing spotify_campaigns...');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('spotify_campaigns')
    .select('*')
    .limit(5);
  
  console.log('   Campaigns:', campaigns?.length || 0, 'Error:', campaignsError?.message || 'none');

  // Test clients
  console.log('\n2️⃣  Testing clients...');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .limit(5);
  
  console.log('   Clients:', clients?.length || 0, 'Error:', clientsError?.message || 'none');

  // Test playlists
  console.log('\n3️⃣  Testing playlists...');
  const { data: playlists, error: playlistsError } = await supabase
    .from('playlists')
    .select('*')
    .limit(5);
  
  console.log('   Playlists:', playlists?.length || 0, 'Error:', playlistsError?.message || 'none');

  // Test vendors
  console.log('\n4️⃣  Testing vendors...');
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('*')
    .limit(5);
  
  console.log('   Vendors:', vendors?.length || 0, 'Error:', vendorsError?.message || 'none');
}

testQueries().catch(console.error);

