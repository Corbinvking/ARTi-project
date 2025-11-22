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

// Extract URL slug (last part of path)
function extractSlug(url: string): string {
  if (!url) return '';
  try {
    const parts = url.split('?')[0].split('/').filter(p => p.length > 0);
    return parts[parts.length - 1].toLowerCase();
  } catch {
    return '';
  }
}

// Clean up slug to make it a readable track name
function cleanSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Parse "Artist - Track Name" from Track Info
function parseTrackInfo(trackInfo: string): { artist: string; track: string } | null {
  if (!trackInfo || trackInfo.trim() === '' || trackInfo.toUpperCase() === 'TBD') {
    return null;
  }

  const parts = trackInfo.split('-').map(p => p.trim());
  
  if (parts.length >= 2) {
    return {
      artist: parts[0],
      track: parts.slice(1).join(' - ')
    };
  }
  
  return null;
}

async function finalBackfill() {
  console.log('🎵 Final SoundCloud Backfill Starting...\n');

  // Read CSV
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📄 CSV: ${csvRecords.length} rows\n`);

  // Get ALL submissions with real SoundCloud URLs
  console.log('🔍 Fetching all SoundCloud submissions from database...');
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_url, track_name, artist_name')
    .ilike('track_url', '%soundcloud.com%')
    .not('track_url', 'ilike', '%TBD%')
    .not('track_url', 'ilike', '%N/A%');

  if (error || !submissions) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Database: ${submissions.length} SoundCloud submissions\n`);

  // Build a map of slug -> submission for fast lookup
  const slugMap = new Map<string, typeof submissions[0]>();
  submissions.forEach(sub => {
    const slug = extractSlug(sub.track_url);
    if (slug) {
      slugMap.set(slug, sub);
    }
  });

  console.log('🔄 Matching and updating...\n');

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const csvRow of csvRecords) {
    const csvUrl = csvRow.URL?.trim();
    
    if (!csvUrl || !csvUrl.includes('soundcloud.com')) {
      skippedCount++;
      continue;
    }

    const csvSlug = extractSlug(csvUrl);
    if (!csvSlug || csvSlug.length < 3) {
      skippedCount++;
      continue;
    }

    // Find matching submission
    const matchingSubmission = slugMap.get(csvSlug);
    if (!matchingSubmission) {
      skippedCount++;
      continue;
    }

    // Determine artist and track name
    let artist: string;
    let track: string;

    const parsed = parseTrackInfo(csvRow['Track Info']);
    if (parsed) {
      // Use Track Info from CSV
      artist = parsed.artist;
      track = parsed.track;
    } else {
      // Extract from URL slug
      artist = 'Unknown';
      track = cleanSlug(csvSlug);
    }

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
        console.error(`  ❌ Error: ${track}`, updateError.message);
        errorCount++;
      } else {
        console.log(`  ✅ ${artist} - ${track}`);
        updatedCount++;
      }
    } catch (e: any) {
      console.error(`  ❌ Exception: ${track}`, e.message);
      errorCount++;
    }
  }

  console.log('\n✨ Backfill Complete!\n');
  console.log('📊 Final Summary:');
  console.log(`  ✅ Updated: ${updatedCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total CSV rows: ${csvRecords.length}`);
  console.log(`  📊 Total DB SoundCloud submissions: ${submissions.length}`);
}

finalBackfill().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



