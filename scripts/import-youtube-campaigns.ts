/**
 * YouTube Campaigns CSV Import Script
 * 
 * Imports YouTube campaign data from CSV into the database
 * Handles multi-service campaigns by grouping by Campaign + URL
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default org ID (Artist Influence)
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface YouTubeCSVRow {
  Campaign: string;
  Clients: string;
  'Service Type': string;
  Goal: string;
  Remaining: string;
  'Desired Daily': string;
  URL: string;
  'Start Date': string;
  Status: string;
  'Confirm Start Date?': string;
  'Ask for Access': string;
  'Ask Client for YT SS': string;
  'Views Stalled?': string;
  'Paid R?': string;
  'Sale Price': string;
  Invoice: string;
  Comments: string;
  'In Fixer?': string;
  'Client Notes': string;
}

// Service type mapping
const SERVICE_TYPE_MAP: Record<string, string> = {
  'LATAM Display': 'latam_display',
  'LATAM display': 'latam_display',
  'WW Display': 'ww_display',
  'WW Skip': 'ww_skip',
  'US Skip': 'us_skip',
  'WW Website': 'ww_website',
  'WW website': 'ww_website',
  'ENGAGEMENTS ONLY': 'engagements_only',
  'US Display': 'us_display',
  'EUR Display': 'eur_display',
  'EUR Skip': 'eur_skip',
  'AUS Display': 'aus_display',
  'AUS Skip': 'aus_skip',
  'CAD Display': 'cad_display',
  'US Website': 'us_website',
};

// Status mapping
const STATUS_MAP: Record<string, string> = {
  'Active': 'active',
  'Complete': 'complete',
  'Paused': 'paused',
  'Pending': 'pending',
};

// Invoice status mapping
const INVOICE_MAP: Record<string, string> = {
  'Pending': 'tbd',
  'Sent': 'sent',
  'Paid': 'paid',
};

// Extract YouTube video ID from URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Parse date from various formats
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Try parsing M/D/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

// Parse currency string to number
function parseCurrency(currencyStr: string): number {
  if (!currencyStr || currencyStr.trim() === '') return 0;
  return parseFloat(currencyStr.replace(/[$,]/g, '')) || 0;
}

// Parse integer with commas
function parseInteger(intStr: string): number {
  if (!intStr || intStr.trim() === '') return 0;
  return parseInt(intStr.replace(/,/g, ''), 10) || 0;
}

async function main() {
  console.log('🎬 YouTube Campaigns Import Starting...\n');
  
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'YouTube-All Campaigns.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: YouTubeCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  console.log(`📄 Found ${rows.length} rows in CSV\n`);
  
  // Group campaigns by Campaign Name + URL (multi-service support)
  const campaignGroups = new Map<string, YouTubeCSVRow[]>();
  
  for (const row of rows) {
    const key = `${row.Campaign}|||${row.URL}`;
    if (!campaignGroups.has(key)) {
      campaignGroups.set(key, []);
    }
    campaignGroups.get(key)!.push(row);
  }
  
  console.log(`📊 Grouped into ${campaignGroups.size} unique campaigns\n`);
  
  // Step 1: Create/Get Clients
  console.log('👥 Step 1: Processing Clients...');
  const clientMap = new Map<string, string>(); // clientName -> clientId
  const uniqueClients = new Set(rows.map(r => r.Clients).filter(Boolean));
  
  for (const clientName of uniqueClients) {
    // Check if client exists
    const { data: existing } = await supabase
      .from('youtube_clients')
      .select('id')
      .eq('name', clientName)
      .eq('org_id', DEFAULT_ORG_ID)
      .single();
    
    if (existing) {
      clientMap.set(clientName, existing.id);
    } else {
      // Create new client
      const { data: newClient, error } = await supabase
        .from('youtube_clients')
        .insert({
          org_id: DEFAULT_ORG_ID,
          name: clientName,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`  ❌ Failed to create client ${clientName}:`, error.message);
      } else if (newClient) {
        clientMap.set(clientName, newClient.id);
        console.log(`  ✅ Created client: ${clientName}`);
      }
    }
  }
  
  console.log(`\n✅ Processed ${clientMap.size} clients\n`);
  
  // Step 2: Import Campaigns
  console.log('🎬 Step 2: Importing Campaigns...');
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const [key, rows] of campaignGroups.entries()) {
    const firstRow = rows[0];
    const campaignName = firstRow.Campaign;
    const youtubeUrl = firstRow.URL;
    
    // Skip if no URL
    if (!youtubeUrl || youtubeUrl.trim() === '') {
      console.log(`  ⏭️  Skipped: ${campaignName} (no URL)`);
      skippedCount++;
      continue;
    }
    
    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    
    // Build service_types array for multi-service campaigns
    const serviceTypes = rows.map(row => ({
      service_type: SERVICE_TYPE_MAP[row['Service Type']] || row['Service Type'].toLowerCase().replace(/\s+/g, '_'),
      goal_views: parseInteger(row.Goal),
      current_views: 0, // Will be updated by YouTube API later
    }));
    
    // Sum up total goal views
    const totalGoalViews = serviceTypes.reduce((sum, st) => sum + st.goal_views, 0);
    
    // Get client ID
    const clientId = clientMap.get(firstRow.Clients) || null;
    
    // Prepare campaign data
    const campaignData = {
      org_id: DEFAULT_ORG_ID,
      campaign_name: campaignName,
      youtube_url: youtubeUrl,
      video_id: videoId,
      client_id: clientId,
      salesperson_id: null, // TODO: Map salespersons
      service_type: serviceTypes[0].service_type, // Legacy field
      service_types: serviceTypes, // New multi-service field
      goal_views: totalGoalViews,
      sale_price: parseCurrency(firstRow['Sale Price']),
      start_date: parseDate(firstRow['Start Date']),
      status: STATUS_MAP[firstRow.Status] || 'pending',
      desired_daily: parseInteger(firstRow['Desired Daily']),
      confirm_start_date: firstRow['Confirm Start Date?']?.toLowerCase() === 'checked',
      ask_for_access: firstRow['Ask for Access']?.toLowerCase() === 'checked',
      views_stalled: firstRow['Views Stalled?']?.toLowerCase() === 'checked' || firstRow['Views Stalled?']?.toLowerCase() === 'yes',
      paid_reach: firstRow['Paid R?']?.toLowerCase() === 'yes' || firstRow['Paid R?']?.toLowerCase() === 'checked',
      invoice_status: INVOICE_MAP[firstRow.Invoice] || 'tbd',
      comments_sheet_url: firstRow.Comments || null,
      in_fixer: firstRow['In Fixer?']?.toLowerCase() === 'checked' || firstRow['In Fixer?']?.toLowerCase() === 'yes',
      current_views: 0,
      current_likes: 0,
      current_comments: 0,
    };
    
    // Insert campaign
    const { error } = await supabase
      .from('youtube_campaigns')
      .insert(campaignData);
    
    if (error) {
      console.error(`  ❌ Failed: ${campaignName}`);
      console.error(`     Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Imported: ${campaignName} (${serviceTypes.length} services)`);
      successCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📊 Total: ${campaignGroups.size}`);
  console.log('\n✨ YouTube import complete!\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

