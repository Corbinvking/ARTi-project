// Bulk fetch YouTube stats for all campaigns
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function bulkFetchStats() {
  try {
    console.log('🎬 Fetching all YouTube campaigns...\n');
    
    // Get all campaigns with youtube_url
    const { data: campaigns, error } = await supabase
      .from('youtube_campaigns')
      .select('id, campaign_name, youtube_url, org_id')
      .not('youtube_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('⚠️  No campaigns found with YouTube URLs');
      return;
    }

    console.log(`📊 Found ${campaigns.length} campaigns to fetch`);
    
    // Get unique org IDs
    const orgIds = [...new Set(campaigns.map(c => c.org_id).filter(Boolean))];
    console.log(`🏢 Found ${orgIds.length} organization(s): ${orgIds.join(', ')}\n`);

    if (orgIds.length === 0) {
      console.log('⚠️  No org_id found. Using direct API calls...\n');
      
      // Fetch stats for each campaign individually
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i];
        console.log(`[${i + 1}/${campaigns.length}] ${campaign.campaign_name}`);
        
        try {
          const response = await fetch('http://localhost:3001/api/youtube-data-api/fetch-video-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: campaign.id,
              videoUrl: campaign.youtube_url
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`  ✅ Views: ${result.stats?.viewCount || 0}, Likes: ${result.stats?.likeCount || 0}`);
            successCount++;
          } else {
            const error = await response.json();
            console.log(`  ❌ Error: ${error.error}`);
            errorCount++;
          }
        } catch (err) {
          console.log(`  ❌ Error: ${err.message}`);
          errorCount++;
        }
        
        // Rate limiting - wait 200ms between requests
        if (i < campaigns.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`\n📊 Results: ${successCount} success, ${errorCount} errors`);
      return;
    }

    // Use bulk fetch endpoint for each org
    for (const orgId of orgIds) {
      console.log(`🔄 Fetching stats for org: ${orgId}...`);
      
      try {
        const response = await fetch('http://localhost:3001/api/youtube-data-api/fetch-all-campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Updated: ${result.updated}, Errors: ${result.errors}`);
          
          if (result.details && result.details.length > 0) {
            console.log('\n📋 Sample results:');
            result.details.slice(0, 5).forEach(detail => {
              console.log(`  - ${detail.campaign_name}: ${detail.views?.toLocaleString()} views, ${detail.likes?.toLocaleString()} likes`);
            });
          }
        } else {
          const error = await response.json();
          console.error(`❌ Bulk fetch failed: ${error.error}`);
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
      }
      
      console.log('');
    }

    console.log('✅ Bulk fetch complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

bulkFetchStats();

