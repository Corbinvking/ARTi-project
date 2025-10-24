import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanCampaignGroups() {
  console.log('\n================================================================================');
  console.log('🗑️  CLEANING CAMPAIGN GROUPS');
  console.log('================================================================================\n');

  try {
    // Get current count
    const { count: initialCount, error: countError } = await supabase
      .from('campaign_groups')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting campaign groups:', countError.message);
      return;
    }

    console.log(`📊 Current campaign groups: ${initialCount}`);

    // Get all campaign IDs that actually exist
    const { data: campaigns, error: campaignError } = await supabase
      .from('spotify_campaigns')
      .select('id');

    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError.message);
      return;
    }

    const validCampaignIds = new Set(campaigns.map(c => c.id));
    console.log(`📊 Valid campaign IDs: ${validCampaignIds.size}`);

    // Get all campaign groups
    const { data: groups, error: groupError } = await supabase
      .from('campaign_groups')
      .select('id, campaign_ids');

    if (groupError) {
      console.error('❌ Error fetching groups:', groupError.message);
      return;
    }

    console.log(`\n🔍 Analyzing ${groups.length} campaign groups...`);

    let orphanedGroups = [];
    let validGroups = 0;

    for (const group of groups) {
      const campaignIds = group.campaign_ids || [];
      const hasValidCampaign = campaignIds.some(id => validCampaignIds.has(id));
      
      if (!hasValidCampaign) {
        orphanedGroups.push(group.id);
      } else {
        validGroups++;
      }
    }

    console.log(`   ✅ Valid groups: ${validGroups}`);
    console.log(`   🗑️  Orphaned groups: ${orphanedGroups.length}`);

    if (orphanedGroups.length === 0) {
      console.log('\n✅ No orphaned groups to clean!');
      return;
    }

    console.log(`\n🗑️  Deleting ${orphanedGroups.length} orphaned groups in batches...\n`);

    let deleted = 0;
    const batchSize = 100;

    for (let i = 0; i < orphanedGroups.length; i += batchSize) {
      const batch = orphanedGroups.slice(i, i + batchSize);
      
      const { error: deleteError } = await supabase
        .from('campaign_groups')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`   ❌ Error deleting batch: ${deleteError.message}`);
        continue;
      }

      deleted += batch.length;
      console.log(`   Deleted: ${deleted}/${orphanedGroups.length}`);
    }

    // Verify final count
    const { count: finalCount, error: finalCountError } = await supabase
      .from('campaign_groups')
      .select('*', { count: 'exact', head: true });

    if (finalCountError) {
      console.error('❌ Error verifying count:', finalCountError.message);
      return;
    }

    console.log('\n================================================================================');
    console.log('✅ CLEANUP COMPLETE');
    console.log('================================================================================\n');
    console.log(`📊 Groups before: ${initialCount}`);
    console.log(`📊 Groups deleted: ${deleted}`);
    console.log(`📊 Groups remaining: ${finalCount}`);
    console.log(`📊 Expected: 653`);

    if (finalCount === 653) {
      console.log('\n✅ SUCCESS! Campaign groups match campaigns!\n');
    } else {
      console.log(`\n⚠️  Warning: Expected 653 but got ${finalCount}\n`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

cleanCampaignGroups();

