#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Use LOCAL Supabase for import
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_AKJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    let inArray = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '[' && !inQuotes) {
        inArray = true;
        current += char;
      } else if (char === ']' && !inQuotes) {
        inArray = false;
        current += char;
      } else if (char === ',' && !inQuotes && !inArray) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      values.push(current.trim());
    }
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        let value = values[idx];
        
        // Skip if undefined
        if (value === undefined) {
          value = null;
        } else if (typeof value === 'string') {
          // Remove surrounding quotes
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          
          // Parse JSON arrays
          if (value.startsWith('[') && value.endsWith(']')) {
            try {
              value = JSON.parse(value.replace(/""/g, '"'));
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
          
          // Convert empty strings to null
          if (value === '' || value === '""') {
            value = null;
          } else if (!isNaN(value) && !value.startsWith('0') && value.indexOf('-') === -1) {
            // Parse numbers
            const num = parseFloat(value);
            if (!isNaN(num) && num.toString() === value) {
              value = num;
            }
          } else if (value === 'true') {
            // Parse booleans
            value = true;
          } else if (value === 'false') {
            value = false;
          }
        }
        
        row[header] = value;
      });
      rows.push(row);
    }
  }
  
  return rows;
}

async function importClients() {
  console.log('\n📋 Importing clients from clients_rows.csv...\n');
  
  const clients = parseCSV('clients_rows.csv');
  console.log(`   Found ${clients.length} clients`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const client of clients) {
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
  
  const campaigns = parseCSV('spotify_campaigns_rows.csv');
  console.log(`   Found ${campaigns.length} campaigns`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const campaign of campaigns) {
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
      
      // Parse the client_id if it's a string that looks like a UUID
      if (campaign.client_id && typeof campaign.client_id === 'string' && campaign.client_id.includes('-')) {
        // Keep as is
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

