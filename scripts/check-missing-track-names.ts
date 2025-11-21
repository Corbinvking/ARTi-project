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

async function checkMissingTrackNames() {
  console.log('🔍 Checking for missing track names...\n');

  // Get submissions with "Untitled Track" or poor names
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_name, artist_name, track_url')
    .or('track_name.eq.Untitled Track,track_name.eq.Unknown Track,track_name.eq.Tbd,track_name.is.null')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`📊 Found ${submissions?.length || 0} submissions with missing/poor track names (showing first 20)\n`);

  // Read CSV to see what Track Info is available
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log('🔍 Checking CSV for these URLs:\n');

  submissions?.forEach((sub, idx) => {
    console.log(`${idx + 1}. DB Record:`);
    console.log(`   Track: ${sub.track_name}`);
    console.log(`   Artist: ${sub.artist_name}`);
    console.log(`   URL: ${sub.track_url?.substring(0, 70)}...`);
    
    // Find in CSV
    const csvRow = csvRecords.find(row => {
      const dbSlug = sub.track_url?.split('?')[0].split('/').pop()?.toLowerCase();
      const csvSlug = row.URL?.split('?')[0].split('/').pop()?.toLowerCase();
      return dbSlug === csvSlug;
    });

    if (csvRow) {
      console.log(`   📄 CSV Track Info: "${csvRow['Track Info'] || '(EMPTY)'}"`);
      console.log(`   📄 CSV Client: "${csvRow.Client || '(EMPTY)'}"`);
    } else {
      console.log(`   ⚠️  Not found in CSV`);
    }
    console.log('');
  });

  // Statistics
  const { count: totalUntitled } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('track_name', 'Untitled Track');

  const { count: totalWithNames } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true })
    .not('track_name', 'in', '("Untitled Track","Unknown Track","Tbd","")');

  const { count: total } = await supabase
    .from('soundcloud_submissions')
    .select('*', { count: 'exact', head: true });

  console.log('📈 Summary:');
  console.log(`   Total submissions: ${total}`);
  console.log(`   "Untitled Track": ${totalUntitled}`);
  console.log(`   With proper names: ${totalWithNames}`);
  console.log(`   Other: ${(total || 0) - (totalUntitled || 0) - (totalWithNames || 0)}`);
}

checkMissingTrackNames().catch(console.error);

