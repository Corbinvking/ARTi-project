#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  console.log('🔍 Checking Algorithmic vs Vendor Playlists...\n');
  
  const { data: allCampaigns } = await supabase
    .from('campaign_groups')
    .select('id, name, artist_name')
    .eq('status', 'Active');
  
  let withAlgo = 0;
  let withoutAlgo = 0;
  const withAlgoList = [];
  const withoutAlgoList = [];
  
  for (const cg of allCampaigns) {
    const { data: songs } = await supabase
      .from('spotify_campaigns')
      .select('id, sfa')
      .eq('campaign_group_id', cg.id);
    
    if (!songs || songs.length === 0) continue;
    
    const songIds = songs.map(s => s.id);
    const hasSFA = songs.some(s => s.sfa && s.sfa.includes('artists.spotify.com'));
    
    const { count: algoCount } = await supabase
      .from('campaign_playlists')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', songIds)
      .eq('is_algorithmic', true);
    
    const { count: vendorCount } = await supabase
      .from('campaign_playlists')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', songIds)
      .eq('is_algorithmic', false);
    
    if (algoCount > 0) {
      withAlgo++;
      withAlgoList.push({
        name: cg.name,
        artist: cg.artist_name,
        algo: algoCount,
        vendor: vendorCount,
        total: algoCount + vendorCount,
        hasSFA
      });
    } else if (vendorCount > 0) {
      withoutAlgo++;
      withoutAlgoList.push({
        name: cg.name,
        artist: cg.artist_name,
        vendor: vendorCount,
        hasSFA
      });
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 ALGORITHMIC vs VENDOR PLAYLISTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Campaigns WITH algorithmic playlists:      ${withAlgo}`);
  console.log(`❌ Campaigns WITHOUT algorithmic playlists:   ${withoutAlgo}`);
  console.log(`   (These only have CSV vendor data)`);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ CAMPAIGNS WITH ALGORITHMIC DATA (Top 15)');
  console.log('   (These have the full "Segan - DNBMF" structure)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  withAlgoList
    .sort((a, b) => b.algo - a.algo)
    .slice(0, 15)
    .forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Artist: ${c.artist || 'Unknown'}`);
      console.log(`   🟢 Algorithmic: ${c.algo} | 🔴 Vendor: ${c.vendor} | Total: ${c.total}`);
      console.log(`   Has SFA: ${c.hasSFA ? '✅' : '❌'}`);
      console.log('');
    });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('❌ CAMPAIGNS WITH ONLY VENDOR DATA (Top 15)');
  console.log('   (Missing algorithmic playlists - need scraping)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const needScraping = withoutAlgoList.filter(c => c.hasSFA);
  const cantScrape = withoutAlgoList.filter(c => !c.hasSFA);
  
  console.log(`📋 ${needScraping.length} campaigns READY TO SCRAPE (have SFA links):\n`);
  needScraping.slice(0, 15).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   Artist: ${c.artist || 'Unknown'}`);
    console.log(`   🔴 Vendor only: ${c.vendor} playlists`);
    console.log(`   Has SFA: ✅ - Ready to scrape!`);
    console.log('');
  });
  
  if (needScraping.length > 15) {
    console.log(`... and ${needScraping.length - 15} more\n`);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚠️  CAMPAIGNS THAT CANT BE SCRAPED (No SFA links)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Total: ${cantScrape.length} campaigns\n`);
  
  cantScrape.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.vendor} vendor playlists)`);
  });
  
  if (cantScrape.length > 10) {
    console.log(`... and ${cantScrape.length - 10} more\n`);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📈 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total campaigns with data:           ${withAlgo + withoutAlgo}`);
  console.log(`  ✅ Complete (algo + vendor):       ${withAlgo} (${Math.round(withAlgo / (withAlgo + withoutAlgo) * 100)}%)`);
  console.log(`  ❌ Incomplete (vendor only):       ${withoutAlgo} (${Math.round(withoutAlgo / (withAlgo + withoutAlgo) * 100)}%)`);
  console.log('');
  console.log(`To get full "Segan - DNBMF" structure:`);
  console.log(`  🎯 Need to scrape:                 ${needScraping.length} campaigns`);
  console.log(`  ⚠️  Can't scrape (no SFA):         ${cantScrape.length} campaigns`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

analyze().catch(console.error);

