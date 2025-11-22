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

function extractSlug(url: string): string {
  if (!url) return '';
  try {
    const parts = url.split('?')[0].split('/').filter(p => p.length > 0);
    return parts[parts.length - 1].toLowerCase();
  } catch {
    return '';
  }
}

async function useClientAsArtist() {
  console.log('🎨 Using Client names as Artist names for Untitled Tracks...\n');

  // Read CSV
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Get all "Untitled Track" submissions
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_name, artist_name, track_url')
    .eq('track_name', 'Untitled Track');

  if (error || !submissions) {
    console.error('Error:', error);
    return;
  }

  console.log(`📊 Found ${submissions.length} "Untitled Track" records\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const sub of submissions) {
    const dbSlug = extractSlug(sub.track_url);
    
    // Find matching CSV record
    const csvRow = csvRecords.find(row => {
      const csvSlug = extractSlug(row.URL);
      return dbSlug === csvSlug;
    });

    if (csvRow && csvRow.Client && csvRow.Client.trim() !== '') {
      const clientName = csvRow.Client.trim();
      
      // Skip if artist_name is already set to something good (not Unknown)
      if (sub.artist_name && sub.artist_name !== 'Unknown' && sub.artist_name !== 'Unknown Artist') {
        console.log(`  ⏭️  Skipped: Already has artist "${sub.artist_name}"`);
        skippedCount++;
        continue;
      }

      try {
        const { error: updateError } = await supabase
          .from('soundcloud_submissions')
          .update({
            artist_name: clientName,
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`  ❌ Error:`, updateError.message);
        } else {
          console.log(`  ✅ Updated: Untitled Track by ${clientName}`);
          updatedCount++;
        }
      } catch (e: any) {
        console.error(`  ❌ Exception:`, e.message);
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n✨ Update Complete!\n');
  console.log('📊 Summary:');
  console.log(`  ✅ Updated: ${updatedCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📊 Total: ${submissions.length}`);
  console.log('\nNow "Untitled Track" records will show proper artist/client names!');
}

useClientAsArtist().catch(console.error);



