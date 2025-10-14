#!/usr/bin/env node

/**
 * Import Spotify campaigns from CSV with proper campaign names
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

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    data.push(row);
  }

  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

async function importCampaigns() {
  console.log('📥 Importing Spotify campaigns from CSV...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '../Spotify Playlisting-All Campaigns.csv');
  console.log(`📄 Reading CSV from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);

  console.log(`✅ Parsed ${rows.length} rows from CSV\n`);

  // Update existing records with campaign names
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const campaignName = row['Campaign'];
    const clientName = row['Client'];
    const startDate = row['Start Date'];

    if (!campaignName) {
      continue; // Skip rows without campaign names
    }

    // Find matching record in database (by row number + 1 for id match)
    const dbId = i + 1;

    const { error } = await supabase
      .from('spotify_campaigns')
      .update({ campaign: campaignName })
      .eq('id', dbId);

    if (error) {
      console.error(`❌ Error updating row ${dbId}:`, error.message);
      errors++;
    } else {
      updated++;
      if (updated % 100 === 0) {
        console.log(`   ✅ Updated ${updated} campaigns...`);
      }
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);

  // Verify
  const { data: verifyData, error: verifyError } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, client, status')
    .not('campaign', 'is', null)
    .limit(10);

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log(`\n📊 Sample campaigns:`);
    verifyData.forEach(c => {
      console.log(`   ${c.id}: "${c.campaign}" - ${c.client} (${c.status})`);
    });
  }
}

importCampaigns().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

