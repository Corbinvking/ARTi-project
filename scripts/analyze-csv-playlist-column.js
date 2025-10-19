#!/usr/bin/env node

const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Read and parse CSV
let content = fs.readFileSync('Spotify Playlisting-Active Campaigns.csv', 'utf-8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_column_count: true
});

console.log('📊 CSV Playlist Column Analysis\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total CSV rows: ${records.length}`);

const withPlaylists = records.filter(r => r.Playlists && r.Playlists.trim());
const withoutPlaylists = records.filter(r => !r.Playlists || !r.Playlists.trim());

console.log(`Rows WITH playlist data: ${withPlaylists.length}`);
console.log(`Rows WITHOUT playlist data: ${withoutPlaylists.length}`);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Sample rows WITH playlist data:\n');
withPlaylists.slice(0, 5).forEach((r, i) => {
  console.log(`${i+1}. Campaign: ${r.Campaign}`);
  console.log(`   Client: ${r.Client}`);
  console.log(`   Vendor: ${r.Vendor || 'None'}`);
  console.log(`   Daily: ${r.Daily || '0'}`);
  console.log(`   Weekly: ${r.Weekly || '0'}`);
  console.log(`   Playlists:`);
  const playlists = r.Playlists.split('\n').filter(p => p.trim());
  playlists.forEach(p => console.log(`     - ${p.trim()}`));
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('📈 Statistics');
console.log('═══════════════════════════════════════════════════════════════');

// Count total playlist entries
let totalPlaylistEntries = 0;
withPlaylists.forEach(r => {
  const playlists = r.Playlists.split('\n').filter(p => p.trim());
  totalPlaylistEntries += playlists.length;
});

console.log(`Total playlist entries in CSV: ${totalPlaylistEntries}`);
console.log(`Average playlists per campaign: ${Math.round(totalPlaylistEntries / withPlaylists.length)}`);
console.log('');

// Group by vendor
const byVendor = {};
withPlaylists.forEach(r => {
  const vendor = r.Vendor || 'Unassigned';
  if (!byVendor[vendor]) byVendor[vendor] = [];
  byVendor[vendor].push(r);
});

console.log('Campaigns by Vendor:');
Object.entries(byVendor)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([vendor, campaigns]) => {
    console.log(`  ${vendor}: ${campaigns.length} campaigns`);
  });

