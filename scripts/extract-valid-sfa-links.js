#!/usr/bin/env node

/**
 * Extract VALID SFA links (actual URLs) for scraping
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractValidLinks() {
  console.log('🔍 Extracting VALID SFA links for scraping...\n');

  // Get all spotify_campaigns with actual SFA URLs (not "checked")
  const { data: songs, error } = await supabase
    .from('spotify_campaigns')
    .select(`
      id,
      campaign,
      sfa,
      url,
      campaign_groups (
        id,
        name,
        artist_name,
        status
      )
    `)
    .eq('campaign_groups.status', 'Active')
    .not('sfa', 'is', null)
    .neq('sfa', 'checked')
    .neq('sfa', '')
    .like('sfa', '%artists.spotify.com%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Found ${songs.length} songs with valid SFA links\n`);

  // Check which ones already have playlist data
  const songsWithoutPlaylists = [];
  const songsWithPlaylists = [];

  for (const song of songs) {
    const { count } = await supabase
      .from('campaign_playlists')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', song.id);

    if (count === 0) {
      songsWithoutPlaylists.push(song);
    } else {
      songsWithPlaylists.push({ ...song, playlistCount: count });
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total songs with valid SFA links:     ${songs.length}`);
  console.log(`Already scraped (have playlists):     ${songsWithPlaylists.length}`);
  console.log(`Need scraping (no playlists):         ${songsWithoutPlaylists.length}`);
  console.log('');

  // Create new scraping list
  const scrapingList = [];
  
  for (const song of songsWithoutPlaylists) {
    const campaignGroup = song.campaign_groups;
    if (!campaignGroup) continue;

    scrapingList.push({
      artist: campaignGroup.artist_name || 'Unknown',
      campaign: campaignGroup.name,
      songName: song.campaign,
      sfa: song.sfa,
      trackUrl: song.url
    });
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🎯 ${scrapingList.length} NEW SONGS TO SCRAPE`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  scrapingList.slice(0, 10).forEach((s, i) => {
    console.log(`${i + 1}. ${s.artist} - ${s.songName}`);
    console.log(`   SFA: ${s.sfa}`);
    console.log('');
  });

  if (scrapingList.length > 10) {
    console.log(`... and ${scrapingList.length - 10} more\n`);
  }

  // Save to markdown file for scraper
  const mdContent = `# Valid SFA Links to Scrape

**Generated:** ${new Date().toISOString()}
**Total Links:** ${scrapingList.length}
**Status:** Ready to scrape

---

${scrapingList.map(s => 
  `## ${s.artist} - ${s.songName}\n**SFA Link:** ${s.sfa}\n${s.trackUrl ? `**Spotify URL:** ${s.trackUrl}\n` : ''}`
).join('\n')}
`;

  fs.writeFileSync('valid-sfa-links.md', mdContent);
  console.log('📝 Saved to: valid-sfa-links.md\n');

  // Save as simple list for Python scraper
  const pythonList = scrapingList.map(s => s.sfa).join('\n');
  fs.writeFileSync('sfa-links-simple.txt', pythonList);
  console.log('📝 Saved simple list to: sfa-links-simple.txt\n');

  // Show songs that WERE scraped successfully
  if (songsWithPlaylists.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ SONGS ALREADY SCRAPED (Top 10)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    songsWithPlaylists
      .sort((a, b) => b.playlistCount - a.playlistCount)
      .slice(0, 10)
      .forEach((s, i) => {
        const cg = s.campaign_groups;
        console.log(`${i + 1}. ${cg?.artist_name} - ${s.campaign}`);
        console.log(`   Playlists: ${s.playlistCount}`);
        console.log(`   SFA: ${s.sfa}`);
        console.log('');
      });
  }

  // Final stats
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`1. Run scraper against ${scrapingList.length} new links`);
  console.log(`2. Expected to add ~${scrapingList.length * 10}-${scrapingList.length * 20} new playlists`);
  console.log(`3. This will bring coverage from 27% to ~${Math.round((148 + scrapingList.length) / 548 * 100)}%`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

extractValidLinks().catch(console.error);

