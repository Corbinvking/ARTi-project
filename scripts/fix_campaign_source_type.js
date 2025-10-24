#!/usr/bin/env node
/**
 * Fix Campaign Source and Type
 * 
 * Updates all campaigns to have the correct source and campaign_type
 * so they show up in the UI
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const APP_CAMPAIGN_SOURCE = 'artist_influence_spotify_campaigns';
const APP_CAMPAIGN_TYPE = 'artist_influence_spotify_promotion';

async function main() {
  console.log('🔧 Fixing campaign source and type...\n');
  
  // Get all campaigns without proper source/type
  const { data: campaigns, error: fetchError } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, source, campaign_type');
  
  if (fetchError) {
    console.error('❌ Error fetching campaigns:', fetchError);
    process.exit(1);
  }
  
  console.log(`📊 Found ${campaigns.length} campaigns\n`);
  
  const needsUpdate = campaigns.filter(c => 
    c.source !== APP_CAMPAIGN_SOURCE || c.campaign_type !== APP_CAMPAIGN_TYPE
  );
  
  console.log(`🔧 ${needsUpdate.length} campaigns need updating\n`);
  
  if (needsUpdate.length === 0) {
    console.log('✅ All campaigns already have correct source and type!\n');
    return;
  }
  
  // Update in batches
  const batchSize = 100;
  let updated = 0;
  
  for (let i = 0; i < needsUpdate.length; i += batchSize) {
    const batch = needsUpdate.slice(i, i + batchSize);
    const ids = batch.map(c => c.id);
    
    const { error: updateError } = await supabase
      .from('spotify_campaigns')
      .update({
        source: APP_CAMPAIGN_SOURCE,
        campaign_type: APP_CAMPAIGN_TYPE
      })
      .in('id', ids);
    
    if (updateError) {
      console.error(`❌ Error updating batch: ${updateError.message}`);
    } else {
      updated += batch.length;
      console.log(`✅ Updated ${updated}/${needsUpdate.length} campaigns`);
    }
  }
  
  console.log(`\n🎉 Successfully updated ${updated} campaigns!\n`);
  console.log(`✅ All campaigns now have:`);
  console.log(`   source: "${APP_CAMPAIGN_SOURCE}"`);
  console.log(`   campaign_type: "${APP_CAMPAIGN_TYPE}"\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

