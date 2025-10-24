#!/usr/bin/env node
/**
 * Sync SFA URLs from scraped data to production database
 * This extracts SFA URLs from roster results and updates campaigns
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use production credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n================================================================================');
console.log('🔗 SYNC SFA URLs TO PRODUCTION');
console.log('================================================================================\n');

async function extractTrackIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function findCampaignByTrackId(trackId) {
  const { data: campaigns, error } = await supabase
    .from('spotify_campaigns')
    .select('*');
  
  if (error) {
    console.error(`   ❌ Error finding campaign: ${error.message}`);
    return null;
  }
  
  const campaign = campaigns.find(c => {
    const urlTrackId = c.url ? extractTrackIdFromUrl(c.url) : null;
    const sfaTrackId = c.sfa ? extractTrackIdFromUrl(c.sfa) : null;
    return urlTrackId === trackId || sfaTrackId === trackId;
  });
  
  return campaign || null;
}

async function syncSfaUrls() {
  // Read latest roster scraping results
  const dataDir = path.join(__dirname, '..', 'roster_scraper', 'data');
  
  try {
    const files = await fs.readdir(dataDir);
    const resultFiles = files
      .filter(f => f.startsWith('roster_scraping_results_') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (resultFiles.length === 0) {
      console.log('❌ No roster scraping results found!');
      return;
    }
    
    const latestFile = resultFiles[0];
    console.log(`📖 Reading: ${latestFile}\n`);
    
    const filePath = path.join(dataDir, latestFile);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const sfaUrls = [];
    
    // Extract SFA URLs
    if (data.clients) {
      for (const [clientName, clientData] of Object.entries(data.clients)) {
        if (clientData.songs) {
          for (const song of clientData.songs) {
            if (song.sfa_url && song.track_id) {
              sfaUrls.push({
                track_id: song.track_id,
                sfa_url: song.sfa_url,
                song_name: song.song_name,
                artist_name: clientData.artist_name || clientName
              });
            }
          }
        }
      }
    }
    
    console.log(`✅ Found ${sfaUrls.length} SFA URLs to sync\n`);
    
    let updated = 0;
    let alreadySet = 0;
    let notFound = 0;
    let failed = 0;
    
    for (const urlData of sfaUrls) {
      try {
        // Find campaign by track ID
        const campaign = await findCampaignByTrackId(urlData.track_id);
        
        if (!campaign) {
          console.log(`   ⚠️  Campaign not found: ${urlData.artist_name} - ${urlData.song_name}`);
          notFound++;
          continue;
        }
        
        // Check if SFA URL is already set
        if (campaign.sfa === urlData.sfa_url) {
          alreadySet++;
          continue;
        }
        
        // Update campaign with SFA URL
        const { error } = await supabase
          .from('spotify_campaigns')
          .update({
            sfa: urlData.sfa_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);
        
        if (error) {
          console.log(`   ❌ Failed to update: ${urlData.artist_name} - ${urlData.song_name}: ${error.message}`);
          failed++;
          continue;
        }
        
        console.log(`   ✅ Updated: ${campaign.campaign_name || urlData.song_name}`);
        updated++;
        
      } catch (error) {
        console.error(`   ❌ Error processing ${urlData.song_name}: ${error.message}`);
        failed++;
      }
      
      // Progress indicator
      const total = updated + alreadySet + notFound + failed;
      if (total % 10 === 0) {
        console.log(`   Progress: ${total}/${sfaUrls.length}`);
      }
    }
    
    console.log('\n================================================================================');
    console.log('✅ SYNC COMPLETE');
    console.log('================================================================================\n');
    console.log('📊 Results:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ℹ️  Already set: ${alreadySet}`);
    console.log(`   ⚠️  Not found: ${notFound}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${sfaUrls.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncSfaUrls();

