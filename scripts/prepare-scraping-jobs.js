#!/usr/bin/env node

/**
 * Prepare Spotify scraping jobs from campaign data
 * Extracts track URLs and creates scraping configuration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Extract Spotify track ID from various URL formats
 */
function extractSpotifyTrackId(url) {
  if (!url) return null;
  
  // Match patterns:
  // https://open.spotify.com/track/1234567890abc
  // https://open.spotify.com/album/xyz?trackId=1234567890abc
  // https://soundcloud.com/... (return null for non-Spotify)
  
  if (!url.includes('spotify.com')) return null;
  
  const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
  if (trackMatch) return trackMatch[1];
  
  const trackIdMatch = url.match(/trackId=([a-zA-Z0-9]+)/);
  if (trackIdMatch) return trackIdMatch[1];
  
  return null;
}

/**
 * Extract artist ID from Spotify URL
 */
function extractArtistId(url) {
  if (!url) return null;
  
  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (artistMatch) return artistMatch[1];
  
  return null;
}

async function prepareScrapingJobs() {
  console.log('🎵 Preparing Spotify scraping jobs from campaigns...\n');

  // Fetch all campaigns with URLs
  const { data: campaigns, error } = await supabase
    .from('spotify_campaigns')
    .select(`
      id,
      campaign,
      client,
      url,
      vendor,
      campaign_group_id,
      goal,
      remaining,
      daily,
      weekly,
      status
    `)
    .not('url', 'is', null)
    .neq('url', '');

  if (error) {
    console.error('❌ Error fetching campaigns:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${campaigns.length} campaigns with URLs\n`);

  // Process URLs and create scraping jobs
  const scrapingJobs = [];
  const urlStats = {
    spotify: 0,
    soundcloud: 0,
    other: 0,
    invalid: 0
  };

  for (const campaign of campaigns) {
    const trackId = extractSpotifyTrackId(campaign.url);
    
    if (!trackId) {
      if (campaign.url.includes('soundcloud.com')) {
        urlStats.soundcloud++;
      } else if (campaign.url.toLowerCase() === 'tba' || !campaign.url.startsWith('http')) {
        urlStats.invalid++;
      } else {
        urlStats.other++;
      }
      continue;
    }

    urlStats.spotify++;

    // We need to construct the Spotify for Artists URL
    // Format: https://artists.spotify.com/c/artist/{artistId}/song/{trackId}/playlists
    // Problem: We don't have artist ID from the track URL
    // Solution: We'll need to fetch it from Spotify API or use a different approach

    scrapingJobs.push({
      campaign_id: campaign.id,
      campaign_group_id: campaign.campaign_group_id,
      campaign_name: campaign.campaign,
      client: campaign.client,
      vendor: campaign.vendor,
      track_id: trackId,
      track_url: campaign.url,
      goal: parseInt(campaign.goal) || 0,
      remaining: parseInt(campaign.remaining) || 0,
      daily: parseInt(campaign.daily) || 0,
      weekly: parseInt(campaign.weekly) || 0,
      status: campaign.status,
      priority: campaign.status === 'Active' ? 'high' : 'normal'
    });
  }

  console.log('📊 URL Statistics:');
  console.log(`   Spotify tracks: ${urlStats.spotify}`);
  console.log(`   SoundCloud: ${urlStats.soundcloud}`);
  console.log(`   Other: ${urlStats.other}`);
  console.log(`   Invalid/TBA: ${urlStats.invalid}`);
  console.log(`\n✅ Prepared ${scrapingJobs.length} Spotify scraping jobs\n`);

  // Save scraping jobs to JSON
  const outputPath = path.join(__dirname, '../spotify_scraper/scraping_jobs.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_jobs: scrapingJobs.length,
    jobs: scrapingJobs
  }, null, 2));

  console.log(`✅ Saved scraping jobs to: ${outputPath}`);

  // Group by vendor for efficiency
  const jobsByVendor = {};
  scrapingJobs.forEach(job => {
    if (!jobsByVendor[job.vendor]) {
      jobsByVendor[job.vendor] = [];
    }
    jobsByVendor[job.vendor].push(job);
  });

  console.log('\n📊 Jobs by Vendor:');
  Object.entries(jobsByVendor)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([vendor, jobs]) => {
      const activeJobs = jobs.filter(j => j.status === 'Active').length;
      console.log(`   ${vendor}: ${jobs.length} total (${activeJobs} active)`);
    });

  // Create priority job list (active campaigns only)
  const priorityJobs = scrapingJobs.filter(j => j.status === 'Active');
  const priorityOutputPath = path.join(__dirname, '../spotify_scraper/priority_jobs.json');
  fs.writeFileSync(priorityOutputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_jobs: priorityJobs.length,
    jobs: priorityJobs
  }, null, 2));

  console.log(`\n✅ Saved ${priorityJobs.length} priority jobs (Active campaigns) to: ${priorityOutputPath}`);

  // Print next steps
  console.log('\n📋 Next Steps:');
  console.log('1. Obtain Spotify for Artists credentials');
  console.log('2. Configure spotify_scraper with session cookies');
  console.log('3. Run scraper: cd spotify_scraper && python run_multi_scraper_config.py');
  console.log('4. Process scraped data and update database');
  console.log('5. View analytics in dashboard');
}

prepareScrapingJobs().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

