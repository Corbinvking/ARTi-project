#!/usr/bin/env node
/**
 * Import Roster URLs to Database
 * 
 * This script:
 * 1. Reads roster_urls_*.json files from roster_scraper/data/
 * 2. Extracts SFA URLs for each campaign
 * 3. Updates spotify_campaigns table with SFA URLs
 * 
 * This ensures we save the URLs immediately after Stage 1 (Roster Scraper)
 * so we can re-scrape stream data anytime without re-collecting URLs
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Read roster URL files
 */
async function readRosterUrlFiles() {
  const dataDir = path.join(__dirname, '..', 'roster_scraper', 'data');
  
  try {
    const files = await fs.readdir(dataDir);
    
    // Look for roster_scraping_results_*.json (the actual output from roster scraper)
    const resultFiles = files
      .filter(f => f.startsWith('roster_scraping_results_') && f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
    
    console.log(`📁 Found ${resultFiles.length} roster scraping result files`);
    
    if (resultFiles.length === 0) {
      console.log(`⚠️  No roster_scraping_results_*.json files found in ${dataDir}`);
      return [];
    }
    
    const allUrls = [];
    
    // Read the most recent file
    const latestFile = resultFiles[0];
    console.log(`📖 Reading: ${latestFile}`);
    
    const filePath = path.join(dataDir, latestFile);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Flatten the structure
    if (data.clients) {
      for (const [clientName, clientData] of Object.entries(data.clients)) {
        if (clientData.songs) {
          for (const song of clientData.songs) {
            if (song.sfa_url) {
              allUrls.push({
                client_name: clientData.client_name || clientName,
                artist_name: clientData.artist_name || clientName,
                song_name: song.song_name,
                campaign_name: song.campaign_name,
                sfa_url: song.sfa_url,
                track_id: song.track_id
              });
            }
          }
        }
      }
    }
    
    console.log(`✅ Extracted ${allUrls.length} SFA URLs\n`);
    
    return allUrls;
  } catch (error) {
    console.error(`❌ Error reading data directory: ${error.message}`);
    return [];
  }
}

/**
 * Extract track ID from URL
 */
function extractTrackIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/track\/([a-zA-Z0-9]+)/)  || url.match(/song\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Find campaign by track ID or name
 */
async function findCampaign(urlData) {
  // First try by track ID
  if (urlData.track_id) {
    const { data: campaigns } = await supabase
      .from('spotify_campaigns')
      .select('*');
    
    if (campaigns) {
      const campaign = campaigns.find(c => {
        const urlTrackId = extractTrackIdFromUrl(c.url);
        const sfaTrackId = extractTrackIdFromUrl(c.sfa);
        return urlTrackId === urlData.track_id || sfaTrackId === urlData.track_id;
      });
      
      if (campaign) return campaign;
    }
  }
  
  // Try by campaign name
  const { data: campaignByName } = await supabase
    .from('spotify_campaigns')
    .select('*')
    .ilike('campaign_name', `%${urlData.song_name}%`)
    .maybeSingle();
  
  return campaignByName;
}

/**
 * Update campaign with SFA URL
 */
async function updateCampaignSfaUrl(campaignId, sfaUrl) {
  const { error } = await supabase
    .from('spotify_campaigns')
    .update({
      sfa: sfaUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId);
  
  return !error;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n');
  console.log('=' .repeat(80));
  console.log('🔗 IMPORTING ROSTER URLs TO DATABASE');
  console.log('='.repeat(80));
  console.log('\n');
  
  // Read all URL files
  const urls = await readRosterUrlFiles();
  
  if (urls.length === 0) {
    console.log('❌ No URLs found to import');
    return;
  }
  
  console.log(`📊 Found ${urls.length} SFA URLs to import\n`);
  
  let updated = 0;
  let notFound = 0;
  let alreadySet = 0;
  let failed = 0;
  
  for (let i = 0; i < urls.length; i++) {
    const urlData = urls[i];
    
    if ((i + 1) % 10 === 0 || i === urls.length - 1) {
      process.stdout.write(`\r   Progress: ${i + 1}/${urls.length}`);
    }
    
    // Find matching campaign
    const campaign = await findCampaign(urlData);
    
    if (!campaign) {
      notFound++;
      continue;
    }
    
    // Check if already set
    if (campaign.sfa && campaign.sfa === urlData.sfa_url) {
      alreadySet++;
      continue;
    }
    
    // Update campaign
    const success = await updateCampaignSfaUrl(campaign.id, urlData.sfa_url);
    
    if (success) {
      updated++;
    } else {
      failed++;
    }
  }
  
  console.log('\n');
  console.log('\n' + '='.repeat(80));
  console.log('✅ IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ℹ️  Already set: ${alreadySet}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${urls.length}\n`);
  
  if (updated > 0) {
    console.log('🎉 SFA URLs saved! You can now re-scrape stream data anytime without re-collecting URLs.\n');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

