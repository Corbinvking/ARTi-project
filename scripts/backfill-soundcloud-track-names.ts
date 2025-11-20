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

// Parse "Artist - Track Name" format from Track Info
function parseTrackInfo(trackInfo: string): { artist: string; track: string } {
  if (!trackInfo || trackInfo.trim() === '') {
    return { artist: 'Unknown', track: 'Unknown Track' };
  }

  const parts = trackInfo.split('-').map(p => p.trim());
  
  if (parts.length >= 2) {
    return {
      artist: parts[0],
      track: parts.slice(1).join(' - ') // In case track name has hyphens
    };
  }
  
  // If no hyphen, assume the whole thing is the track name
  return { artist: 'Unknown', track: trackInfo.trim() };
}

async function backfillTrackNames() {
  console.log('🎵 SoundCloud Track Name Backfill Starting...\n');

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: SoundCloud-All Campaigns.csv not found!');
    console.error('   Please ensure the CSV file is in the project root directory.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📄 Found ${records.length} rows in CSV\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of records) {
    const url = row.URL?.trim();
    const trackInfo = row['Track Info']?.trim();

    // Skip if no URL or not a SoundCloud URL
    if (!url || !url.includes('soundcloud.com')) {
      skippedCount++;
      continue;
    }

    // Parse track info
    const { artist, track } = parseTrackInfo(trackInfo);

    try {
      // Find submission by URL
      const { data: existing, error: findError } = await supabase
        .from('soundcloud_submissions')
        .select('id, track_name, artist_name, track_url')
        .eq('track_url', url)
        .single();

      if (findError || !existing) {
        // Submission doesn't exist (might have been skipped during import)
        skippedCount++;
        continue;
      }

      // Update if track_name is empty or looks like a hash
      const needsUpdate = !existing.track_name || 
                          existing.track_name === '' ||
                          existing.track_name.length < 5 ||
                          existing.track_name.match(/^[0-9a-f]{8}/i); // Looks like a UUID/hash

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('soundcloud_submissions')
          .update({
            track_name: track,
            artist_name: artist,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`  ❌ Error updating ${track}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`  ✅ Updated: ${artist} - ${track}`);
          successCount++;
        }
      } else {
        // Already has a good track name
        skippedCount++;
      }

    } catch (error: any) {
      console.error(`  ❌ Error processing ${trackInfo}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`  ✅ Updated: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${records.length}`);
  console.log('\n✨ SoundCloud track name backfill complete!');
}

// Run the backfill
backfillTrackNames().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

