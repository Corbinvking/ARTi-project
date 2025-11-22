import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUrls() {
  console.log('🔍 Checking SoundCloud Submissions URLs...\n');

  // Get all submissions
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_url, track_name, artist_name')
    .limit(20);

  if (error) {
    console.error('Error fetching submissions:', error);
    return;
  }

  console.log(`📊 Found ${submissions?.length || 0} submissions (showing first 20):\n`);

  submissions?.forEach((sub, idx) => {
    console.log(`${idx + 1}. ID: ${sub.id}`);
    console.log(`   URL: ${sub.track_url || 'NULL'}`);
    console.log(`   Track: ${sub.track_name || 'NULL'}`);
    console.log(`   Artist: ${sub.artist_name || 'NULL'}`);
    console.log('');
  });

  // Count total and check how many need updating
  const { count: total } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true });

  const { count: needsUpdate } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true })
    .or('track_name.is.null,track_name.eq.,artist_name.is.null,artist_name.eq.');

  console.log('\n📈 Statistics:');
  console.log(`   Total submissions: ${total}`);
  console.log(`   Need track/artist names: ${needsUpdate}`);
  console.log(`   Already have names: ${(total || 0) - (needsUpdate || 0)}`);
}

checkUrls().catch(console.error);



