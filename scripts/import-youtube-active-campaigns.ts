/**
 * YouTube Active Campaigns CSV Import Script
 * 
 * Imports CURRENT active YouTube campaign data from "YouTube-Active Campaigns.csv"
 * into the production database. This replaces old/placeholder data with real active campaigns.
 * 
 * What this script does:
 *   1. Reads the Active Campaigns CSV
 *   2. Extracts and upserts all unique clients into youtube_clients
 *   3. Groups multi-service campaigns (same video, different service types)
 *   4. Handles engagement-only campaigns (likes/comments goals instead of views)
 *   5. Marks old campaigns as complete (if not in the new active set)
 *   6. Inserts/upserts all new active campaigns
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-youtube-active-campaigns.ts
 *   
 *   Options:
 *     --dry-run    Preview what would happen without writing to the database
 *     --clear-old  Mark all existing campaigns as 'complete' before importing
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// ============================================================================
// Configuration
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Usage: SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-youtube-active-campaigns.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR_OLD = process.argv.includes('--clear-old');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE — no database writes will be made\n');
}

// ============================================================================
// CSV Row Interface
// ============================================================================

interface ActiveCampaignCSVRow {
  Campaign: string;
  Clients: string;
  'Service Type': string;
  Goal: string;
  Remaining: string;
  'Desired Daily': string;
  URL: string;
  Comments: string;
  'Start Date': string;
  Status: string;
  'In Fixer?': string;
  'Views Stalled?': string;
  'Confirm Start Date?': string;
  'Ask for Access': string;
  'Ask Client for YT SS': string;
  'Client Notes': string;
}

// ============================================================================
// Service Type Mapping
// ============================================================================

const SERVICE_TYPE_MAP: Record<string, string> = {
  // Display Ads
  'LATAM Display': 'latam_display',
  'LATAM display': 'latam_display',
  'WW Display': 'ww_display',
  'US Display': 'us_display',
  'EUR Display': 'eur_display',
  'AUS Display': 'aus_display',
  'CAD Display': 'cad_display',
  'MENA Display': 'mena_display',

  // Website Ads
  'WW Website': 'ww_website',
  'WW website': 'ww_website',
  'WW Website Ads': 'ww_website_ads',
  'US Website Ads': 'us_website_ads',
  'US Website': 'us_website',
  'US EUR Website': 'us_eur_website',
  'LATAM Website': 'latam_website',
  'EUR Website': 'eur_website',
  'AUS Website': 'aus_website',
  'CAD Website': 'cad_website',
  'ASIA Website': 'asia_website',

  // Skip Ads
  'WW Skip': 'ww_skip',
  'US Skip': 'us_skip',
  'EUR Skip': 'eur_skip',
  'LATAM Skip': 'latam_skip',
  'AUS Skip': 'aus_skip',
  'CAD Skip': 'cad_skip',

  // Special
  'ENGAGEMENTS ONLY': 'engagements_only',
  'Engagements Only': 'engagements_only',
  'Custom': 'custom',
  'Organic Push': 'organic_push',
  'Playlist Push': 'playlist_push',
};

// Status mapping
const STATUS_MAP: Record<string, string> = {
  'Active': 'active',
  'Complete': 'complete',
  'Paused': 'on_hold',
  'Pending': 'pending',
  'On Hold': 'on_hold',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
  if (!url || url.trim() === '') return null;
  
  const cleanUrl = url.trim();
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Parse date from M/D/YYYY format to YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch {
    console.warn(`  ⚠️  Failed to parse date: "${dateStr}"`);
  }
  
  return null;
}

/**
 * Parse integer with commas (e.g., "1,000,000" -> 1000000)
 */
function parseInteger(intStr: string): number {
  if (!intStr || intStr.trim() === '') return 0;
  return parseInt(intStr.replace(/,/g, ''), 10) || 0;
}

/**
 * Check if a string indicates a "checked" / truthy value
 */
function isChecked(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'checked' || v === 'yes' || v === 'true' || v === 'x';
}

/**
 * Parse engagement-only goal strings like "7k likes,300 com" or "8k likes, 400 coms"
 * Returns { likeGoal, commentGoal } or null if not an engagement goal string
 */
function parseEngagementGoal(goalStr: string): { likeGoal: number; commentGoal: number } | null {
  if (!goalStr) return null;
  
  const str = goalStr.trim().toLowerCase();
  
  // Match patterns like "7k likes" or "8k likes"
  const likeMatch = str.match(/(\d+(?:\.\d+)?)\s*k?\s*likes?/i);
  // Match patterns like "300 com" or "400 coms" or "400 comments"
  const commentMatch = str.match(/(\d+(?:\.\d+)?)\s*k?\s*com(?:ment)?s?/i);
  
  if (likeMatch || commentMatch) {
    let likeGoal = 0;
    let commentGoal = 0;
    
    if (likeMatch) {
      const num = parseFloat(likeMatch[1]);
      // Check if "k" suffix was present in original string around this match
      likeGoal = str.includes('k') && str.indexOf('k') < str.indexOf('like') ? num * 1000 : num;
      // More robust: check if the number is followed by 'k'
      const fullLikeMatch = str.match(/(\d+(?:\.\d+)?)\s*(k)\s*likes?/i);
      if (fullLikeMatch) {
        likeGoal = parseFloat(fullLikeMatch[1]) * 1000;
      } else if (likeMatch) {
        likeGoal = parseFloat(likeMatch[1]);
      }
    }
    
    if (commentMatch) {
      const fullCommentMatch = str.match(/(\d+(?:\.\d+)?)\s*(k)\s*com(?:ment)?s?/i);
      if (fullCommentMatch) {
        commentGoal = parseFloat(fullCommentMatch[1]) * 1000;
      } else {
        commentGoal = parseFloat(commentMatch[1]);
      }
    }
    
    return { likeGoal, commentGoal };
  }
  
  return null;
}

/**
 * Determine if a service type string is actually an engagement-only goal description
 */
function isEngagementGoalString(serviceType: string): boolean {
  if (!serviceType) return false;
  const s = serviceType.trim().toLowerCase();
  return (s.includes('likes') || s.includes('like')) && (s.includes('com') || s.includes('comment'));
}

/**
 * Map a CSV service type to the database enum value
 */
function mapServiceType(csvServiceType: string): string {
  if (!csvServiceType || csvServiceType.trim() === '') return 'custom';
  
  const trimmed = csvServiceType.trim();
  
  // Check if it's an engagement goal string (e.g., "7k likes,300 com")
  if (isEngagementGoalString(trimmed)) {
    return 'engagements_only';
  }
  
  // Direct lookup
  if (SERVICE_TYPE_MAP[trimmed]) {
    return SERVICE_TYPE_MAP[trimmed];
  }
  
  // Case-insensitive fallback
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(SERVICE_TYPE_MAP)) {
    if (key.toLowerCase() === lowerTrimmed) {
      return value;
    }
  }
  
  // Last resort: normalize to snake_case
  console.warn(`  ⚠️  Unknown service type: "${trimmed}" — mapping to "custom"`);
  return 'custom';
}

// ============================================================================
// Main Import Logic
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🎬 YouTube Active Campaigns Import');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // ── Step 0: Read CSV ──────────────────────────────────────────────────
  
  // Try multiple possible paths for the CSV
  const possiblePaths = [
    path.join(process.cwd(), 'YouTube-Active Campaigns.csv'),
    path.join(process.cwd(), 'scripts', 'YouTube-Active Campaigns.csv'),
    // Windows Downloads folder
    path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'YouTube-Active Campaigns.csv'),
  ];
  
  let csvPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }
  
  if (!csvPath) {
    console.error('❌ Could not find "YouTube-Active Campaigns.csv"');
    console.error('   Looked in:', possiblePaths.join('\n              '));
    console.error('\n   Place the CSV in the project root or run from the directory containing it.');
    process.exit(1);
  }
  
  console.log(`📄 Reading CSV: ${csvPath}\n`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: ActiveCampaignCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
  
  console.log(`   Found ${rows.length} rows in CSV\n`);
  
  // ── Step 1: Extract & Display Unique Clients ──────────────────────────
  
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  👥 Step 1: Extract Clients');
  console.log('───────────────────────────────────────────────────────────────\n');
  
  const uniqueClientNames = [...new Set(rows.map(r => r.Clients?.trim()).filter(Boolean))];
  console.log(`   Found ${uniqueClientNames.length} unique clients:\n`);
  uniqueClientNames.forEach((name, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${name}`);
  });
  console.log('');
  
  // Upsert clients
  const clientMap = new Map<string, string>(); // clientName -> clientId
  
  for (const clientName of uniqueClientNames) {
    if (DRY_RUN) {
      clientMap.set(clientName, `dry-run-${clientName}`);
      console.log(`   🔍 [DRY RUN] Would upsert client: ${clientName}`);
      continue;
    }
    
    // Check if client already exists
    const { data: existing } = await supabase
      .from('youtube_clients')
      .select('id')
      .eq('name', clientName)
      .eq('org_id', DEFAULT_ORG_ID)
      .single();
    
    if (existing) {
      clientMap.set(clientName, existing.id);
      console.log(`   ✓ Existing client: ${clientName} (${existing.id.slice(0, 8)}...)`);
    } else {
      const { data: newClient, error } = await supabase
        .from('youtube_clients')
        .insert({
          org_id: DEFAULT_ORG_ID,
          name: clientName,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`   ❌ Failed to create client "${clientName}": ${error.message}`);
      } else if (newClient) {
        clientMap.set(clientName, newClient.id);
        console.log(`   ✅ Created client: ${clientName} (${newClient.id.slice(0, 8)}...)`);
      }
    }
  }
  
  console.log(`\n   📊 Client summary: ${clientMap.size} clients ready\n`);
  
  // ── Step 2: Group Multi-Service Campaigns ─────────────────────────────
  
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  📦 Step 2: Group Multi-Service Campaigns');
  console.log('───────────────────────────────────────────────────────────────\n');
  
  // Group by Campaign Name + URL (campaigns with same video but different service types)
  const campaignGroups = new Map<string, ActiveCampaignCSVRow[]>();
  
  for (const row of rows) {
    const url = (row.URL || '').trim();
    const name = (row.Campaign || '').trim();
    
    if (!name) continue;
    
    // Use campaign name + cleaned URL as the grouping key
    const videoId = extractVideoId(url);
    const key = videoId ? `${name}|||${videoId}` : `${name}|||${url}`;
    
    if (!campaignGroups.has(key)) {
      campaignGroups.set(key, []);
    }
    campaignGroups.get(key)!.push(row);
  }
  
  console.log(`   ${rows.length} CSV rows → ${campaignGroups.size} unique campaigns\n`);
  
  // Show multi-service campaigns
  let multiCount = 0;
  for (const [key, group] of campaignGroups.entries()) {
    if (group.length > 1) {
      multiCount++;
      const name = group[0].Campaign;
      const services = group.map(r => r['Service Type']).join(' + ');
      console.log(`   🔀 Multi-service: "${name}" (${group.length} types: ${services})`);
    }
  }
  if (multiCount === 0) {
    console.log('   (No multi-service campaigns found)');
  }
  console.log('');
  
  // ── Step 3: Optionally Clear Old Campaigns ────────────────────────────
  
  if (CLEAR_OLD) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  🧹 Step 3: Mark Old Campaigns as Complete');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    if (DRY_RUN) {
      console.log('   🔍 [DRY RUN] Would mark all existing active campaigns as complete\n');
    } else {
      const { data: existingActive, error: countError } = await supabase
        .from('youtube_campaigns')
        .select('id', { count: 'exact' })
        .eq('org_id', DEFAULT_ORG_ID)
        .eq('status', 'active');
      
      const count = existingActive?.length || 0;
      
      if (count > 0) {
        const { error } = await supabase
          .from('youtube_campaigns')
          .update({ status: 'complete' })
          .eq('org_id', DEFAULT_ORG_ID)
          .eq('status', 'active');
        
        if (error) {
          console.error(`   ❌ Failed to mark old campaigns: ${error.message}`);
        } else {
          console.log(`   ✅ Marked ${count} old active campaigns as "complete"\n`);
        }
      } else {
        console.log('   ℹ️  No existing active campaigns to mark\n');
      }
    }
  }
  
  // ── Step 4: Import Campaigns ──────────────────────────────────────────
  
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  🎬 Step 4: Import Active Campaigns');
  console.log('───────────────────────────────────────────────────────────────\n');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  const errors: Array<{ campaign: string; error: string }> = [];
  
  for (const [key, groupRows] of campaignGroups.entries()) {
    const firstRow = groupRows[0];
    const campaignName = (firstRow.Campaign || '').trim().replace(/^\*+|\*+$/g, ''); // Strip markdown bold **
    const youtubeUrl = (firstRow.URL || '').trim();
    const clientName = (firstRow.Clients || '').trim();
    
    // Skip if no URL
    if (!youtubeUrl) {
      console.log(`   ⏭️  Skipped: "${campaignName}" (no URL)`);
      skippedCount++;
      continue;
    }
    
    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    
    // Get client ID
    const clientId = clientMap.get(clientName) || null;
    
    // ── Build service_types array ──
    const serviceTypes: Array<{
      service_type: string;
      goal_views: number;
      like_goal?: number;
      comment_goal?: number;
      current_views: number;
    }> = [];
    
    // Track engagement goals at campaign level
    let campaignLikeGoal: number | null = null;
    let campaignCommentGoal: number | null = null;
    let customServiceNote: string | null = null;
    
    for (const row of groupRows) {
      const rawServiceType = (row['Service Type'] || '').trim();
      const rawGoal = (row.Goal || '').trim();
      
      // Check if the service type IS an engagement goal string (e.g., "7k likes,300 com")
      if (isEngagementGoalString(rawServiceType)) {
        const engGoals = parseEngagementGoal(rawServiceType);
        if (engGoals) {
          campaignLikeGoal = engGoals.likeGoal;
          campaignCommentGoal = engGoals.commentGoal;
        }
        serviceTypes.push({
          service_type: 'engagements_only',
          goal_views: 0,
          like_goal: engGoals?.likeGoal || 0,
          comment_goal: engGoals?.commentGoal || 0,
          current_views: 0,
        });
        continue;
      }
      
      // Check if the goal field contains engagement goals
      const engGoalsInGoal = parseEngagementGoal(rawGoal);
      if (engGoalsInGoal) {
        campaignLikeGoal = engGoalsInGoal.likeGoal;
        campaignCommentGoal = engGoalsInGoal.commentGoal;
      }
      
      const mappedType = mapServiceType(rawServiceType);
      const goalViews = engGoalsInGoal ? 0 : parseInteger(rawGoal);
      
      // Track custom notes (e.g., "ASIA Skip" in Client Notes)
      const clientNotes = (row['Client Notes'] || '').trim();
      if (clientNotes && mappedType === 'custom') {
        customServiceNote = clientNotes;
      }
      
      serviceTypes.push({
        service_type: mappedType,
        goal_views: goalViews,
        current_views: 0,
      });
    }
    
    // Skip campaigns with no service types
    if (serviceTypes.length === 0) {
      console.log(`   ⏭️  Skipped: "${campaignName}" (no valid service type)`);
      skippedCount++;
      continue;
    }
    
    // Sum total goal views across all service types
    const totalGoalViews = serviceTypes.reduce((sum, st) => sum + st.goal_views, 0);
    
    // Determine primary service type (first one for the legacy field)
    const primaryServiceType = serviceTypes[0].service_type;
    
    // Collect all client notes from the group
    const allClientNotes = groupRows
      .map(r => (r['Client Notes'] || '').trim())
      .filter(Boolean);
    const clientNotesStr = allClientNotes.length > 0 ? allClientNotes.join('; ') : null;
    
    // Determine if any row asks for YT SS (client-level flag)
    const askForYtSS = groupRows.some(r => isChecked(r['Ask Client for YT SS']));
    
    // Build the campaign insert/update object
    // NOTE: Only include columns that exist in the production database
    const campaignData: Record<string, any> = {
      org_id: DEFAULT_ORG_ID,
      campaign_name: campaignName,
      youtube_url: youtubeUrl,
      video_id: videoId,
      client_id: clientId && !clientId.startsWith('dry-run') ? clientId : null,
      service_type: primaryServiceType,
      service_types: serviceTypes,
      goal_views: totalGoalViews,
      like_goal: campaignLikeGoal,
      comment_goal: campaignCommentGoal,
      start_date: parseDate(firstRow['Start Date']),
      status: STATUS_MAP[firstRow.Status?.trim()] || 'active',
      desired_daily: parseInteger(firstRow['Desired Daily']),
      
      // Boolean flags
      in_fixer: isChecked(firstRow['In Fixer?']),
      views_stalled: isChecked(firstRow['Views Stalled?']),
      confirm_start_date: isChecked(firstRow['Confirm Start Date?']),
      ask_for_access: isChecked(firstRow['Ask for Access']),
      
      // Comments sheet URL
      comments_sheet_url: firstRow.Comments?.trim()?.startsWith('http') ? firstRow.Comments.trim() : null,
      
      // Client notes (includes custom service notes like "ASIA Skip")
      client_notes: clientNotesStr || (customServiceNote ? customServiceNote : null),
      
      // Metrics start at 0 (YouTube API will update them)
      current_views: 0,
      current_likes: 0,
      current_comments: 0,
    };
    
    // Special handling: if Comments field contains a non-URL instruction, put it in client_notes
    if (firstRow.Comments?.trim() && !firstRow.Comments.trim().startsWith('http')) {
      const existingNotes = campaignData.client_notes || '';
      const commentNote = firstRow.Comments.trim();
      campaignData.client_notes = existingNotes ? `${existingNotes}; ${commentNote}` : commentNote;
    }
    
    if (DRY_RUN) {
      console.log(`   🔍 [DRY RUN] Would import: "${campaignName}"`);
      console.log(`      Client: ${clientName} | Services: ${serviceTypes.map(s => s.service_type).join(', ')}`);
      console.log(`      Goal: ${totalGoalViews.toLocaleString()} views${campaignLikeGoal ? ` + ${campaignLikeGoal} likes` : ''}${campaignCommentGoal ? ` + ${campaignCommentGoal} comments` : ''}`);
      console.log(`      URL: ${youtubeUrl}`);
      console.log('');
      successCount++;
      continue;
    }
    
    // Check if campaign already exists (by video_id or campaign_name + client)
    let existingCampaign = null;
    
    if (videoId) {
      const { data } = await supabase
        .from('youtube_campaigns')
        .select('id')
        .eq('org_id', DEFAULT_ORG_ID)
        .eq('video_id', videoId)
        .eq('campaign_name', campaignName)
        .single();
      existingCampaign = data;
    }
    
    if (!existingCampaign) {
      // Also try matching by campaign name + URL
      const { data } = await supabase
        .from('youtube_campaigns')
        .select('id')
        .eq('org_id', DEFAULT_ORG_ID)
        .eq('campaign_name', campaignName)
        .eq('youtube_url', youtubeUrl)
        .single();
      existingCampaign = data;
    }
    
    if (existingCampaign) {
      // Update existing campaign
      const { error } = await supabase
        .from('youtube_campaigns')
        .update(campaignData)
        .eq('id', existingCampaign.id);
      
      if (error) {
        console.error(`   ❌ Failed to update: "${campaignName}" — ${error.message}`);
        errors.push({ campaign: campaignName, error: error.message });
        errorCount++;
      } else {
        console.log(`   🔄 Updated: "${campaignName}" (${serviceTypes.length} service${serviceTypes.length > 1 ? 's' : ''})`);
        updatedCount++;
      }
    } else {
      // Insert new campaign
      const { error } = await supabase
        .from('youtube_campaigns')
        .insert(campaignData);
      
      if (error) {
        console.error(`   ❌ Failed to insert: "${campaignName}" — ${error.message}`);
        errors.push({ campaign: campaignName, error: error.message });
        errorCount++;
      } else {
        console.log(`   ✅ Imported: "${campaignName}" (${serviceTypes.length} service${serviceTypes.length > 1 ? 's' : ''})`);
        successCount++;
      }
    }
    
    // Update client's youtube_access_requested flag if applicable
    if (askForYtSS && clientId && !clientId.startsWith('dry-run')) {
      await supabase
        .from('youtube_clients')
        .update({
          youtube_access_requested: true,
          youtube_access_requested_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .eq('youtube_access_requested', false);
    }
  }
  
  // ── Step 5: Summary ───────────────────────────────────────────────────
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 Import Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`   📄 CSV Rows:         ${rows.length}`);
  console.log(`   📦 Unique Campaigns: ${campaignGroups.size}`);
  console.log(`   👥 Clients:          ${clientMap.size}`);
  console.log('');
  console.log(`   ✅ New Imports:      ${successCount}`);
  console.log(`   🔄 Updates:          ${updatedCount}`);
  console.log(`   ❌ Errors:           ${errorCount}`);
  console.log(`   ⏭️  Skipped:          ${skippedCount}`);
  
  if (errors.length > 0) {
    console.log('\n   Error Details:');
    errors.forEach(e => {
      console.log(`   • "${e.campaign}": ${e.error}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('  🔍 DRY RUN COMPLETE — No changes were made to the database');
    console.log('  💡 Remove --dry-run flag to perform the actual import');
  } else {
    console.log('  ✨ YouTube Active Campaigns Import Complete!');
    console.log('  💡 Run YouTube API fetch to populate current view counts');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
