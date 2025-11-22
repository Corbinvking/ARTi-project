import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log('🔍 Verifying database updates...\n');

  // Get sample of records
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_name, artist_name, track_url')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error || !submissions) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Most recently updated records:\n');
  submissions.forEach((sub, idx) => {
    console.log(`${idx + 1}. Track: ${sub.track_name}`);
    console.log(`   Artist: ${sub.artist_name}`);
    console.log(`   URL: ${sub.track_url?.substring(0, 60)}...`);
    console.log('');
  });

  // Count statistics
  const { count: total } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true });

  const { count: untitled } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('track_name', 'Untitled Track');

  const { count: withNames } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true })
    .not('track_name', 'in', '("Untitled Track","Unknown Track","Tbd","")');

  console.log('📈 Database Statistics:');
  console.log(`   Total submissions: ${total}`);
  console.log(`   "Untitled Track": ${untitled}`);
  console.log(`   With proper names: ${withNames}`);
  console.log(`   Other: ${(total || 0) - (untitled || 0) - (withNames || 0)}`);
}

verify().catch(console.error);



