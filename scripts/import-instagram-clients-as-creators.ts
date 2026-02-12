/**
 * Instagram Clients → Creators Import Script
 * 
 * Reads the active campaigns CSV, extracts unique clients,
 * clears old imported creators, and re-imports them fresh.
 * 
 * CSV source: "IG Seeding-Active Campaigns.csv"
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default org ID (Artist Influence) - required for RLS policies
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Interface matching the NEW active campaigns CSV column headers.
 */
interface ActiveCampaignCSVRow {
  Campaign: string;
  Clients: string;
  'Start Date': string;
  Spend: string;
  Remaining: string;
  'Sound URL': string;
  Status: string;
  'Campaign Started': string;
  Tracker: string;
  'Send Tracker': string;
  'Send Final Report': string;
  'Report Notes': string;
  'Client Notes': string;
}

interface ClientData {
  name: string;
  totalCampaigns: number;
  totalBudget: number;
  campaigns: string[];
}

function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function cleanClientName(name: string): string {
  if (!name) return '';
  return name.trim()
    .replace(/\s+/g, ' ')
    .replace(/,$/, '');
}

/**
 * Extract a client name from the campaign name when the Clients column is empty.
 * Campaign names typically follow "Artist - Song Title" format.
 */
function extractClientFromCampaign(campaignName: string): string {
  const dashIndex = campaignName.indexOf(' - ');
  if (dashIndex > 0) {
    return campaignName.substring(0, dashIndex).trim();
  }
  return campaignName.trim();
}

function generateInstagramHandle(clientName: string): string {
  return clientName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 30);
}

async function main() {
  console.log('📸 Instagram Clients → Creators Import (Active Campaigns)\n');
  
  // ── Step 1: Read the active campaigns CSV ─────────────────────────────
  const csvPath = path.join(process.cwd(), 'IG Seeding-Active Campaigns.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.error('   Make sure "IG Seeding-Active Campaigns.csv" is in the project root.');
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: ActiveCampaignCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  
  console.log(`📄 Found ${rows.length} active campaigns in CSV\n`);
  
  // ── Step 2: Extract unique clients ────────────────────────────────────
  const clientsMap = new Map<string, ClientData>();
  
  for (const row of rows) {
    // Get client name from CSV or extract from campaign name
    let clientName = cleanClientName(row.Clients);
    if (!clientName || clientName.length < 2) {
      clientName = extractClientFromCampaign(row.Campaign);
    }
    
    // Skip if still no valid name
    if (!clientName || clientName.length < 2) {
      console.warn(`  ⚠️  Could not determine client for campaign: ${row.Campaign}`);
      continue;
    }
    
    if (!clientsMap.has(clientName)) {
      clientsMap.set(clientName, {
        name: clientName,
        totalCampaigns: 0,
        totalBudget: 0,
        campaigns: [],
      });
    }
    
    const client = clientsMap.get(clientName)!;
    client.totalCampaigns++;
    client.totalBudget += parseCurrency(row.Spend);
    client.campaigns.push(row.Campaign);
  }
  
  console.log(`👥 Found ${clientsMap.size} unique clients:\n`);
  for (const [name, data] of clientsMap.entries()) {
    console.log(`  - ${name} (${data.totalCampaigns} campaign${data.totalCampaigns > 1 ? 's' : ''}, $${data.totalBudget.toFixed(2)} budget)`);
    data.campaigns.forEach(c => console.log(`      └─ ${c}`));
  }
  
  // ── Step 3: Clear old imported creators ───────────────────────────────
  console.log('\n🗑️  Clearing old imported creators...');
  
  // Get handles of the new clients we're about to import
  const newHandles = Array.from(clientsMap.keys()).map(generateInstagramHandle);
  
  // Delete ALL existing creators (clean slate for fresh import)
  const { error: deleteError } = await supabase
    .from('creators')
    .delete()
    .not('id', 'is', null); // Match all rows
  
  if (deleteError) {
    console.error(`  ⚠️  Could not clear old creators: ${deleteError.message}`);
    console.error('  Continuing anyway (will skip existing ones)...');
  } else {
    console.log('  ✅ Cleared old creators');
  }
  
  // ── Step 4: Import new clients as creators ────────────────────────────
  console.log('\n📥 Importing clients as creators...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [clientName, clientData] of clientsMap.entries()) {
    try {
      const instagramHandle = generateInstagramHandle(clientName);
      
      // Determine likely genre from campaign/client context
      const campaignText = clientData.campaigns.join(' ').toLowerCase();
      const genres: string[] = [];
      if (campaignText.includes('edm') || campaignText.includes('subtronics') || campaignText.includes('illenium') || campaignText.includes('devault') || campaignText.includes('neon pony')) {
        genres.push('electronic', 'edm');
      }
      if (campaignText.includes('hip hop') || campaignText.includes('savage') || campaignText.includes('knife talk')) {
        genres.push('hip-hop', 'rap');
      }
      if (genres.length === 0) {
        genres.push('music'); // Default
      }
      
      // Insert creator (org_id required for RLS policy)
      const { error } = await supabase
        .from('creators')
        .insert({
          org_id: DEFAULT_ORG_ID,
          instagram_handle: instagramHandle,
          email: null,
          base_country: 'US',
          followers: 0,
          median_views_per_video: 0,
          engagement_rate: 0,
          reel_rate: 0,
          carousel_rate: 0,
          story_rate: 0,
          content_types: ['music'],
          music_genres: genres,
          audience_territories: ['US'],
        });
      
      if (error) {
        console.error(`  ❌ Failed: ${clientName} (@${instagramHandle}) - ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Imported: ${clientName} (@${instagramHandle}) - ${clientData.totalCampaigns} campaign(s), $${clientData.totalBudget.toFixed(2)} budget`);
        successCount++;
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error importing ${clientName}:`, error.message);
      errorCount++;
    }
  }
  
  // ── Step 5: Summary ───────────────────────────────────────────────────
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total Unique Clients: ${clientsMap.size}`);
  
  console.log('\n👥 All Clients by Budget:');
  const sortedClients = Array.from(clientsMap.values())
    .sort((a, b) => b.totalBudget - a.totalBudget);
  sortedClients.forEach((client, i) => {
    console.log(`  ${i + 1}. ${client.name} - $${client.totalBudget.toFixed(2)} (${client.totalCampaigns} campaign${client.totalCampaigns > 1 ? 's' : ''})`);
  });
  
  console.log('\n✨ Instagram clients import complete!\n');
}

main().catch(console.error);

