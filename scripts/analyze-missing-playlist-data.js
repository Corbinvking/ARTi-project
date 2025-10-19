#!/usr/bin/env node

/**
 * Analyze which campaigns are missing playlist data
 * and identify opportunities to scrape more data
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  console.log('🔍 Analyzing campaign playlist data...\n');

  // Get all active campaign groups
  const { data: allCampaigns, error: campaignsError } = await supabase
    .from('campaign_groups')
    .select('id, name, status, artist_name')
    .eq('status', 'Active')
    .order('name');

  if (campaignsError) {
    console.error('Error fetching campaigns:', campaignsError);
    return;
  }

  console.log(`📊 Total Active Campaign Groups: ${allCampaigns.length}\n`);

  const campaignsWithData = [];
  const campaignsWithoutData = [];
  const campaignsWithSFA = [];
  const campaignsWithURL = [];

  for (const cg of allCampaigns) {
    // Get songs for this campaign group
    const { data: songs } = await supabase
      .from('spotify_campaigns')
      .select('id, sfa, url, campaign')
      .eq('campaign_group_id', cg.id);

    if (!songs || songs.length === 0) {
      campaignsWithoutData.push({
        name: cg.name,
        reason: 'No songs',
        songs: 0,
        playlists: 0,
        hasSFA: false,
        hasURL: false
      });
      continue;
    }

    const songIds = songs.map(s => s.id);
    
    // Get playlists for these songs
    const { data: playlists, count } = await supabase
      .from('campaign_playlists')
      .select('*', { count: 'exact' })
      .in('campaign_id', songIds);

    const hasSFA = songs.some(s => s.sfa);
    const hasURL = songs.some(s => s.url);

    if (hasSFA) campaignsWithSFA.push(cg.name);
    if (hasURL) campaignsWithURL.push(cg.name);

    if (count > 0) {
      const algorithmic = playlists.filter(p => p.is_algorithmic).length;
      const vendor = playlists.filter(p => !p.is_algorithmic).length;
      
      campaignsWithData.push({
        name: cg.name,
        artist: cg.artist_name,
        songs: songs.length,
        playlists: count,
        algorithmic,
        vendor,
        hasSFA,
        hasURL
      });
    } else {
      campaignsWithoutData.push({
        name: cg.name,
        artist: cg.artist_name,
        songs: songs.length,
        playlists: 0,
        hasSFA,
        hasURL,
        reason: 'No playlist data scraped yet'
      });
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📈 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Campaigns WITH playlist data:     ${campaignsWithData.length}`);
  console.log(`❌ Campaigns WITHOUT playlist data:  ${campaignsWithoutData.length}`);
  console.log(`🔗 Campaigns with SFA links:         ${campaignsWithSFA.length}`);
  console.log(`🎵 Campaigns with Spotify URLs:      ${campaignsWithURL.length}`);
  console.log('');

  // Show breakdown of campaigns WITH data
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ CAMPAIGNS WITH PLAYLIST DATA (Top 10)');
  console.log('═══════════════════════════════════════════════════════════════');
  campaignsWithData
    .sort((a, b) => b.playlists - a.playlists)
    .slice(0, 10)
    .forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Artist: ${c.artist || 'Unknown'}`);
      console.log(`   Songs: ${c.songs} | Playlists: ${c.playlists} (Algo: ${c.algorithmic}, Vendor: ${c.vendor})`);
      console.log(`   Has SFA: ${c.hasSFA ? '✅' : '❌'} | Has URL: ${c.hasURL ? '✅' : '❌'}`);
      console.log('');
    });

  // Show campaigns WITHOUT data but WITH scraping potential
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 CAMPAIGNS READY TO SCRAPE (Have SFA links)');
  console.log('═══════════════════════════════════════════════════════════════');
  const scrapable = campaignsWithoutData.filter(c => c.hasSFA);
  console.log(`Total: ${scrapable.length} campaigns\n`);
  
  scrapable.slice(0, 20).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.songs} songs)`);
  });

  if (scrapable.length > 20) {
    console.log(`... and ${scrapable.length - 20} more\n`);
  }

  // Show campaigns WITHOUT data and WITHOUT scraping potential
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚠️  CAMPAIGNS MISSING SFA/URL DATA');
  console.log('═══════════════════════════════════════════════════════════════');
  const notScrapable = campaignsWithoutData.filter(c => !c.hasSFA && !c.hasURL);
  console.log(`Total: ${notScrapable.length} campaigns\n`);
  
  notScrapable.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.songs} songs) - ${c.reason}`);
  });

  if (notScrapable.length > 10) {
    console.log(`... and ${notScrapable.length - 10} more\n`);
  }

  // Export SFA links for scraping
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 GENERATING SCRAPING LIST');
  console.log('═══════════════════════════════════════════════════════════════');

  const sfaLinks = [];
  for (const c of campaignsWithoutData.filter(c => c.hasSFA)) {
    const { data: songs } = await supabase
      .from('spotify_campaigns')
      .select('id, sfa, campaign, url')
      .eq('campaign_group_id', allCampaigns.find(cg => cg.name === c.name)?.id)
      .not('sfa', 'is', null);

    songs?.forEach(song => {
      if (song.sfa) {
        sfaLinks.push({
          campaign: c.name,
          artist: c.artist,
          songName: song.campaign,
          sfa: song.sfa,
          url: song.url
        });
      }
    });
  }

  console.log(`\n✅ Found ${sfaLinks.length} SFA links ready to scrape\n`);

  // Save to file
  const fs = require('fs');
  const sfaListContent = sfaLinks.map(l => 
    `## ${l.campaign}\n**Artist:** ${l.artist || 'Unknown'}\n**Song:** ${l.songName}\n**SFA:** ${l.sfa}\n`
  ).join('\n');

  fs.writeFileSync('sfa-links-to-scrape.md', 
    `# SFA Links Ready to Scrape\n\n**Generated:** ${new Date().toISOString()}\n**Total Links:** ${sfaLinks.length}\n\n---\n\n${sfaListContent}`
  );

  console.log('📝 Saved scraping list to: sfa-links-to-scrape.md');

  // Summary stats
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 FINAL STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Active Campaigns:          ${allCampaigns.length}`);
  console.log(`With Playlist Data:              ${campaignsWithData.length} (${Math.round(campaignsWithData.length / allCampaigns.length * 100)}%)`);
  console.log(`Without Playlist Data:           ${campaignsWithoutData.length} (${Math.round(campaignsWithoutData.length / allCampaigns.length * 100)}%)`);
  console.log(`Ready to Scrape (Have SFA):      ${scrapable.length}`);
  console.log(`Missing SFA/URL (Need Manual):   ${notScrapable.length}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

analyze().catch(console.error);

