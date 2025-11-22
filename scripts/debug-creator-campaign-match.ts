import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMatches() {
  console.log('🔍 Checking creator-campaign data relationships...\n');

  // Get sample creators
  const { data: creators, error: creatorsError } = await supabase
    .from('creators')
    .select('id, instagram_handle')
    .limit(5);

  if (creatorsError) {
    console.error('❌ Error fetching creators:', creatorsError);
    return;
  }

  console.log('📊 Sample Creators:');
  creators?.forEach(c => console.log(`  - ${c.instagram_handle}`));
  console.log('');

  // Get sample campaign clients
  const { data: campaigns, error: campaignsError } = await supabase
    .from('instagram_campaigns')
    .select('id, campaign, clients')
    .limit(10);

  if (campaignsError) {
    console.error('❌ Error fetching campaigns:', campaignsError);
    return;
  }

  console.log('📊 Sample Campaign Clients:');
  const uniqueClients = [...new Set(campaigns?.map(c => c.clients))];
  uniqueClients.forEach(client => console.log(`  - "${client}"`));
  console.log('');

  // Try to find matches
  console.log('🔗 Testing matches:');
  for (const creator of creators || []) {
    const { data: matches, error } = await supabase
      .from('instagram_campaigns')
      .select('id, campaign, clients')
      .eq('clients', creator.instagram_handle);

    if (error) {
      console.error(`❌ Error for ${creator.instagram_handle}:`, error);
    } else {
      console.log(`  ${creator.instagram_handle}: ${matches?.length || 0} campaigns`);
      if (matches && matches.length > 0) {
        matches.forEach(m => console.log(`    - ${m.campaign}`));
      }
    }
  }

  // Check for case-insensitive matches
  console.log('\n🔍 Checking for potential fuzzy matches:');
  for (const creator of creators?.slice(0, 3) || []) {
    const { data: fuzzyMatches, error } = await supabase
      .from('instagram_campaigns')
      .select('id, campaign, clients')
      .ilike('clients', `%${creator.instagram_handle}%`);

    if (!error && fuzzyMatches && fuzzyMatches.length > 0) {
      console.log(`  ${creator.instagram_handle} fuzzy matches: ${fuzzyMatches.length}`);
      fuzzyMatches.slice(0, 3).forEach(m => 
        console.log(`    - "${m.clients}" in campaign "${m.campaign}"`)
      );
    }
  }
}

debugMatches().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

