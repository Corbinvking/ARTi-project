#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Use LOCAL Supabase for import
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_AKJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Simple CSV parser that handles the pipe-delimited format from your file
function parseCSVLine(line) {
  return line.split('|').map(v => {
    v = v.trim();
    
    // Handle null/empty
    if (!v || v === '') return null;
    
    // Handle JSON arrays
    if (v.startsWith('[') && v.endsWith(']')) {
      try {
        return JSON.parse(v);
      } catch (e) {
        return v;
      }
    }
    
    // Handle booleans
    if (v === 'true') return true;
    if (v === 'false') return false;
    
    // Handle numbers (but not UUIDs or dates)
    if (!isNaN(v) && !v.includes('-') && !v.includes(':') && v.length < 10) {
      return parseFloat(v);
    }
    
    return v;
  });
}

async function importClients() {
  console.log('\n📋 Importing clients from clients_rows.csv...\n');
  
  const content = fs.readFileSync('clients_rows.csv', 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // First line is header
  const headers = lines[0].split('|').map(h => h.trim());
  console.log(`   Headers:`, headers);
  console.log(`   Found ${lines.length - 1} client rows`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      console.log(`   ⚠️  Row ${i} has ${values.length} values but expected ${headers.length}, skipping`);
      continue;
    }
    
    const client = {};
    headers.forEach((header, idx) => {
      client[header] = values[idx];
    });
    
    try {
      // Check if client already exists
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Ensure org_id is set
      if (!client.org_id) {
        client.org_id = '00000000-0000-0000-0000-000000000001';
      }
      
      const { error } = await supabase
        .from('clients')
        .insert(client);
      
      if (error) {
        console.error(`   ❌ Error importing client ${client.name}:`, error.message);
        errors++;
      } else {
        imported++;
        if (imported % 50 === 0) {
          console.log(`   ✅ Imported ${imported} clients...`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Exception importing client:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n   📊 Clients Summary:`);
  console.log(`      ✅ Imported: ${imported}`);
  console.log(`      ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`      ❌ Errors: ${errors}`);
}

async function importCampaigns() {
  console.log('\n📋 Importing campaigns from spotify_campaigns_rows.csv...\n');
  
  const content = fs.readFileSync('spotify_campaigns_rows.csv', 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // First line is header
  const headers = lines[0].split('|').map(h => h.trim());
  console.log(`   Headers:`, headers.slice(0, 10), '...');
  console.log(`   Found ${lines.length - 1} campaign rows`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      console.log(`   ⚠️  Row ${i} has ${values.length} values but expected ${headers.length}, skipping`);
      continue;
    }
    
    const campaign = {};
    headers.forEach((header, idx) => {
      campaign[header] = values[idx];
    });
    
    try {
      // Check if campaign already exists
      const { data: existing } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('id', campaign.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('spotify_campaigns')
        .insert(campaign);
      
      if (error) {
        console.error(`   ❌ Error importing campaign ${campaign.id}:`, error.message);
        errors++;
      } else {
        imported++;
        if (imported % 100 === 0) {
          console.log(`   ✅ Imported ${imported} campaigns...`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Exception importing campaign:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n   📊 Campaigns Summary:`);
  console.log(`      ✅ Imported: ${imported}`);
  console.log(`      ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`      ❌ Errors: ${errors}`);
}

async function main() {
  console.log('🚀 Starting CSV import to LOCAL Supabase...');
  console.log(`   URL: ${supabaseUrl}`);
  
  // Import clients first (campaigns reference them)
  await importClients();
  
  // Then import campaigns
  await importCampaigns();
  
  console.log('\n✨ Import complete!');
  console.log('\n💡 Now restart your dev server and refresh your browser.');
}

main().catch(console.error);

