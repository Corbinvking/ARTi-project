#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🔍 Testing campaign access with ANON KEY...\n');

const { data, error, count } = await supabase
  .from('spotify_campaigns')
  .select('id, campaign, source, campaign_type', { count: 'exact' })
  .in('source', ['artist_influence_spotify_campaigns'])
  .eq('campaign_type', 'artist_influence_spotify_promotion')
  .limit(5);

if (error) {
  console.log(`❌ Error: ${error.message}`);
  console.log(`   Code: ${error.code}`);
  console.log(`   Details: ${error.details}`);
  console.log(`   Hint: ${error.hint}`);
} else {
  console.log(`✅ Successfully fetched campaigns!`);
  console.log(`📊 Total count: ${count}`);
  console.log(`📋 First 5 campaigns:`);
  data.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.campaign}`);
  });
}

