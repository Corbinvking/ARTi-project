#!/usr/bin/env node

/**
 * Populate campaign names from CSV by matching on client, goal, start_date, sale_price
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
  let currentLine = '';
  let inQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    currentLine += (currentLine ? '\n' : '') + line;

    // Count quotes to determine if we're inside a quoted field
    const quoteCount = (currentLine.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes && currentLine.trim()) {
      const values = parseCSVLine(currentLine);
      
      if (values.length >= headers.length - 2) { // Allow some flexibility
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.replace(/^"|"$/g, '').trim() || '';
        });
        data.push(row);
      }
      
      currentLine = '';
    }
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

async function populateCampaignNames() {
  console.log('🎵 Populating campaign names from CSV...\n');

  // Read CSV
  const csvPath = path.join(__dirname, '../Spotify Playlisting-All Campaigns.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const csvRows = parseCSV(csvContent);

  console.log(`✅ Parsed ${csvRows.length} CSV rows\n`);

  // Fetch all database campaigns
  const { data: dbCampaigns, error: fetchError } = await supabase
    .from('spotify_campaigns')
    .select('*')
    .order('id');

  if (fetchError) {
    console.error('❌ Error fetching campaigns:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Found ${dbCampaigns.length} campaigns in database\n`);

  // Match and update
  let updated = 0;
  let noMatch = 0;

  for (const dbCampaign of dbCampaigns) {
    // Find matching CSV row
    const csvMatch = csvRows.find(csvRow => {
      const clientMatch = normalizeString(csvRow['Client']) === normalizeString(dbCampaign.client);
      const goalMatch = parseInt(csvRow['Goal']) === parseInt(dbCampaign.goal);
      const priceMatch = normalizePrice(csvRow['Sale price']) === normalizePrice(dbCampaign.sale_price);
      const dateMatch = normalizeDate(csvRow['Start Date']) === normalizeDate(dbCampaign.start_date);
      
      return clientMatch && goalMatch && priceMatch && dateMatch;
    });

    if (csvMatch && csvMatch['Campaign']) {
      const { error } = await supabase
        .from('spotify_campaigns')
        .update({ campaign: csvMatch['Campaign'] })
        .eq('id', dbCampaign.id);

      if (error) {
        console.error(`❌ Error updating ${dbCampaign.id}:`, error.message);
      } else {
        updated++;
        if (updated % 100 === 0) {
          console.log(`   ✅ Updated ${updated} campaigns...`);
        }
      }
    } else {
      noMatch++;
    }
  }

  console.log(`\n✅ Matching complete!`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  No match: ${noMatch}`);

  // Verify
  const { data: withNames } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, client')
    .not('campaign', 'is', null)
    .neq('campaign', '')
    .limit(10);

  console.log(`\n📊 Sample campaigns with names:`);
  withNames?.forEach(c => {
    console.log(`   ${c.id}: "${c.campaign}" - ${c.client}`);
  });
}

function normalizeString(str) {
  if (!str) return '';
  return str.toString().toLowerCase().trim();
}

function normalizePrice(price) {
  if (!price) return '';
  return price.toString().replace(/[$,\s]/g, '').trim();
}

function normalizeDate(date) {
  if (!date) return '';
  return date.toString().trim();
}

populateCampaignNames().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

