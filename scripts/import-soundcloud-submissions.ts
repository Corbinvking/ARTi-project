/**
 * SoundCloud Submissions CSV Import Script
 * 
 * Imports SoundCloud submission data from CSV into the database
 * Creates members and submissions
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

interface SoundCloudCSVRow {
  'Track Info': string;
  Client: string;
  'Service Type': string;
  Goal: string;
  Remaining: string;
  Status: string;
  URL: string;
  'Submit Date': string;
  'Start Date': string;
  Receipts: string;
  Salesperson: string;
  Invoice: string;
  'Sale Price': string;
  'Confirm Start Date?': string;
  Notes: string;
  'Send Receipt(s)': string;
  'Ask Client for Playlist': string;
  'Last Modified': string;
  ' Salesperson Email': string;
}

// Status mapping
const STATUS_MAP: Record<string, string> = {
  'Active': 'approved',
  'Unreleased': 'new',
  'Complete': 'approved',
  'Completed': 'approved',
  'Paused': 'pending',
};

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

// Parse timestamp from various formats
function parseTimestamp(timestampStr: string): string | null {
  if (!timestampStr || timestampStr.trim() === '') return null;
  
  try {
    // Try parsing "9/20/2025 1:53pm" format
    const [datePart, timePart] = timestampStr.split(' ');
    const date = parseDate(datePart);
    if (!date) return null;
    
    // Parse time (e.g., "1:53pm")
    const match = timePart.match(/(\d+):(\d+)(am|pm)/i);
    if (!match) return `${date}T12:00:00Z`;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const meridiem = match[3].toLowerCase();
    
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    
    return `${date}T${hours.toString().padStart(2, '0')}:${minutes}:00Z`;
  } catch (error) {
    console.warn(`Failed to parse timestamp: ${timestampStr}`);
  }
  
  return null;
}

// Parse integer with commas and decimals
function parseInteger(intStr: string): number {
  if (!intStr || intStr.trim() === '') return 0;
  return parseInt(intStr.replace(/[,\.]/g, '').replace(/\.0+$/, ''), 10) || 0;
}

// Parse track info into artist and track name
function parseTrackInfo(trackInfo: string): { artist: string; track: string } {
  if (!trackInfo || trackInfo.trim() === '') {
    return { artist: 'Unknown', track: 'Unknown' };
  }
  
  // Common formats:
  // "Artist - Track Name"
  // "Artist - Track (Remix)"
  // "Track Name"
  
  const parts = trackInfo.split(' - ');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      track: parts.slice(1).join(' - ').trim(),
    };
  }
  
  // If no separator, use as track name
  return {
    artist: 'Unknown',
    track: trackInfo.trim(),
  };
}

async function main() {
  console.log('🎵 SoundCloud Submissions Import Starting...\n');
  
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: SoundCloudCSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  console.log(`📄 Found ${rows.length} rows in CSV\n`);
  
  // Step 1: Create/Get Members (clients)
  console.log('👥 Step 1: Processing Members...');
  const memberMap = new Map<string, string>(); // memberName -> memberId
  const uniqueMembers = new Set(rows.map(r => r.Client).filter(Boolean));
  
  for (const memberName of uniqueMembers) {
    // Check if member exists
    const { data: existing } = await supabase
      .from('soundcloud_members')
      .select('id')
      .eq('name', memberName)
      .eq('org_id', DEFAULT_ORG_ID)
      .single();
    
    if (existing) {
      memberMap.set(memberName, existing.id);
    } else {
      // Create new member
      const { data: newMember, error } = await supabase
        .from('soundcloud_members')
        .insert({
          org_id: DEFAULT_ORG_ID,
          name: memberName,
          emails: [], // No email data in CSV
          status: 'active',
          size_tier: 'T1', // Default tier
          monthly_submission_limit: 4,
          submissions_this_month: 0,
          reach_factor: 0.060,
          credits_given: 0,
          credits_used: 0,
          net_credits: 0,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`  ❌ Failed to create member ${memberName}:`, error.message);
      } else if (newMember) {
        memberMap.set(memberName, newMember.id);
        console.log(`  ✅ Created member: ${memberName}`);
      }
    }
  }
  
  console.log(`\n✅ Processed ${memberMap.size} members\n`);
  
  // Step 2: Import Submissions
  console.log('🎵 Step 2: Importing Submissions...');
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const row of rows) {
    const trackInfo = row['Track Info'];
    
    // Skip if no track info
    if (!trackInfo || trackInfo.trim() === '') {
      skippedCount++;
      continue;
    }
    
    // Parse track info
    const { artist, track } = parseTrackInfo(trackInfo);
    
    // Get member ID
    const memberId = memberMap.get(row.Client);
    if (!memberId) {
      console.warn(`  ⚠️  No member found for: ${row.Client}`);
      skippedCount++;
      continue;
    }
    
    // Prepare submission data
    const submissionData = {
      org_id: DEFAULT_ORG_ID,
      member_id: memberId,
      track_url: row.URL || `https://soundcloud.com/unknown/${track.toLowerCase().replace(/\s+/g, '-')}`,
      artist_name: artist,
      status: STATUS_MAP[row.Status] || 'new',
      submitted_at: parseTimestamp(row['Submit Date']) || new Date().toISOString(),
      support_date: parseDate(row['Start Date']),
      expected_reach_planned: parseInteger(row.Goal),
      notes: row.Notes || null,
      qa_flag: false,
      need_live_link: false,
      suggested_supporters: [],
      expected_reach_min: 0,
      expected_reach_max: 0,
      updated_at: parseTimestamp(row['Last Modified']) || new Date().toISOString(),
    };
    
    // Insert submission
    const { error } = await supabase
      .from('soundcloud_submissions')
      .insert(submissionData);
    
    if (error) {
      console.error(`  ❌ Failed: ${trackInfo}`);
      console.error(`     Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Imported: ${trackInfo}`);
      successCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📊 Total: ${rows.length}`);
  console.log('\n✨ SoundCloud import complete!\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

