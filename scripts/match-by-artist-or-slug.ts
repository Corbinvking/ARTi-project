import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CSVRow {
  'Track Info': string;
  'URL': string;
  'Client': string;
}

// Extract URL slug (last part of URL path)
function extractSlug(url: string): string {
  if (!url) return '';
  try {
    const path = url.split('?')[0].split('/').filter(p => p.length > 0);
    return path[path.length - 1].toLowerCase();
  } catch {
    return '';
  }
}

// Parse "Artist - Track Name" format
function parseTrackInfo(trackInfo: string): { artist: string; track: string } {
  if (!trackInfo || trackInfo.trim() === '') {
    return { artist: 'Unknown', track: 'Unknown Track' };
  }

  const parts = trackInfo.split('-').map(p => p.trim());
  
  if (parts.length >= 2) {
    return {
      artist: parts[0],
      track: parts.slice(1).join(' - ')
    };
  }
  
  return { artist: 'Unknown', track: trackInfo.trim() };
}

async function matchAndUpdate() {
  console.log('🎵 SoundCloud Smart Matching Starting...\n');

  // Read CSV
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📄 Found ${csvRecords.length} rows in CSV\n`);

  // Get all submissions with real SoundCloud URLs
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_url, track_name, artist_name')
    .ilike('track_url', '%soundcloud.com%')
    .not('track_url', 'ilike', '%TBD%')
    .not('track_url', 'ilike', '%N/A%');

  if (error || !submissions) {
    console.error('❌ Error fetching submissions:', error);
    return;
  }

  console.log(`📊 Found ${submissions.length} submissions with real SoundCloud URLs\n`);
  console.log('🔄 Matching and updating...\n');

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const csvRow of csvRecords) {
    const csvUrl = csvRow.URL?.trim();
    const trackInfo = csvRow['Track Info']?.trim();

    if (!csvUrl || !csvUrl.includes('soundcloud.com') || !trackInfo) {
      skippedCount++;
      continue;
    }

    const csvSlug = extractSlug(csvUrl);
    if (!csvSlug || csvSlug.length < 3) {
      skippedCount++;
      continue;
    }

    const { artist, track } = parseTrackInfo(trackInfo);

    // Try to find matching submission by URL slug
    const matchingSubmission = submissions.find(sub => {
      const dbSlug = extractSlug(sub.track_url);
      return dbSlug === csvSlug;
    });

    if (matchingSubmission) {
      try {
        const { error: updateError } = await supabase
          .from('soundcloud_submissions')
          .update({
            track_name: track,
            artist_name: artist,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingSubmission.id);

        if (updateError) {
          console.error(`  ❌ Error updating ${track}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`  ✅ Updated: ${artist} - ${track}`);
          successCount++;
        }
      } catch (e: any) {
        console.error(`  ❌ Exception updating ${track}:`, e.message);
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n📊 Matching Summary:');
  console.log(`  ✅ Updated: ${successCount}`);
  console.log(`  ⏭️  Skipped (no match): ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total CSV rows: ${csvRecords.length}`);
  console.log(`  📊 Total DB records: ${submissions.length}`);
  console.log('\n✨ Smart matching complete!');
}

matchAndUpdate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

