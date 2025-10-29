#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestSubmission() {
  console.log('🧪 Creating test submission...\n');

  // 1. Get or create a test client
  console.log('👤 Fetching or creating test client...');
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', 'Test Artist')
    .maybeSingle();

  let clientId;
  let clientName = 'Test Artist';

  if (!existingClient) {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: clientName,
        emails: ['testartist@example.com'],
        credit_balance: 0
      })
      .select('id')
      .single();

    if (clientError) {
      console.error('❌ Error creating client:', clientError);
      return;
    }
    clientId = newClient.id;
    console.log('✅ Created new client:', clientId);
  } else {
    clientId = existingClient.id;
    console.log('✅ Found existing client:', clientId);
  }

  // 2. Get Club Restricted vendor
  console.log('\n🏢 Fetching Club Restricted vendor...');
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name')
    .ilike('name', 'Club Restricted')
    .maybeSingle();

  if (!vendor) {
    console.error('❌ Club Restricted vendor not found!');
    return;
  }
  console.log('✅ Found vendor:', vendor.name, '(', vendor.id, ')');

  // 3. Create submission with vendor assignment
  console.log('\n📝 Creating submission...');
  
  const vendorAssignments = [
    {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      allocated_streams: 50000,
      allocated_budget: 500.00,
      playlist_ids: []
    },
    {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      allocated_streams: 25000,
      allocated_budget: 250.00,
      playlist_ids: []
    }
  ];

  const submission = {
    campaign_name: 'Test Track - Dummy Campaign',
    client_name: clientName,
    client_emails: ['testartist@example.com'],
    salesperson: 'Test Salesperson',
    track_url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    stream_goal: 100000,
    price_paid: 1000.00,
    start_date: new Date().toISOString().split('T')[0],
    duration_days: 90,
    music_genres: ['Pop', 'Hip-Hop'],
    territory_preferences: ['United States', 'Global'],
    notes: `This is a test submission for testing the approval workflow. Vendor: ${vendor.name}. Allocations: ${vendorAssignments.map(va => `${va.allocated_streams.toLocaleString()} streams ($${va.allocated_budget})`).join(', ')}.`,
    status: 'pending_approval'
  };

  const { data: createdSubmission, error: submissionError } = await supabase
    .from('campaign_submissions')
    .insert(submission)
    .select('id, campaign_name, status')
    .single();

  if (submissionError) {
    console.error('❌ Error creating submission:', submissionError);
    return;
  }

  console.log('✅ Created submission:', createdSubmission.id);
  console.log('   Campaign:', createdSubmission.campaign_name);
  console.log('   Status:', createdSubmission.status);
  console.log('\n📊 Submission Details:');
  console.log('   - Client:', clientName);
  console.log('   - Vendor:', vendor.name);
  console.log('   - Allocated Streams:', vendorAssignments.reduce((sum, va) => sum + va.allocated_streams, 0).toLocaleString());
  console.log('   - Allocated Budget: $' + vendorAssignments.reduce((sum, va) => sum + va.allocated_budget, 0).toLocaleString());
  console.log('\n🎯 Next Steps:');
  console.log('   1. Go to Spotify → Submissions tab');
  console.log('   2. Find "Test Track - Dummy Campaign"');
  console.log('   3. Click "Review & Approve" to see the detail modal');
  console.log('   4. Test the approval workflow!');
  console.log('\n✨ Done!');
}

createTestSubmission().catch(console.error);

