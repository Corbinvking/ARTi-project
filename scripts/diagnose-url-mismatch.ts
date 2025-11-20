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

// Extract URL slug
function extractSlug(url: string): string {
  if (!url) return '';
  try {
    const path = url.split('?')[0].split('/').filter(p => p.length > 0);
    return path[path.length - 1].toLowerCase();
  } catch {
    return '';
  }
}

async function diagnose() {
  console.log('🔍 Diagnosing URL Mismatch...\n');

  // Read CSV
  const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Get submissions
  const { data: submissions } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_url, track_name, artist_name')
    .ilike('track_url', '%soundcloud.com%')
    .not('track_url', 'ilike', '%TBD%')
    .not('track_url', 'ilike', '%N/A%')
    .limit(20);

  console.log('📊 Sample CSV URLs (first 10):');
  csvRecords.slice(0, 10).forEach((row, idx) => {
    const url = row.URL?.trim();
    const slug = extractSlug(url);
    console.log(`  ${idx + 1}. URL: ${url}`);
    console.log(`     Slug: "${slug}"`);
    console.log(`     Track Info: ${row['Track Info']}\n`);
  });

  console.log('\n📊 Sample Database URLs (first 10):');
  submissions?.slice(0, 10).forEach((sub, idx) => {
    const slug = extractSlug(sub.track_url);
    console.log(`  ${idx + 1}. URL: ${sub.track_url}`);
    console.log(`     Slug: "${slug}"`);
    console.log(`     Current Track: ${sub.track_name}`);
    console.log(`     Current Artist: ${sub.artist_name}\n`);
  });

  // Build slug sets to see overlap
  const csvSlugs = new Set(
    csvRecords
      .map(row => extractSlug(row.URL?.trim()))
      .filter(slug => slug && slug.length > 0)
  );

  const dbSlugs = new Set(
    submissions?.map(sub => extractSlug(sub.track_url)).filter(s => s.length > 0) || []
  );

  console.log('\n📈 Slug Statistics:');
  console.log(`  CSV slugs (unique): ${csvSlugs.size}`);
  console.log(`  DB slugs (sample): ${dbSlugs.size}`);
  console.log(`  Sample overlap: ${[...csvSlugs].filter(s => dbSlugs.has(s)).length}`);

  // Show some examples of each
  console.log('\n🔤 Sample CSV Slugs:', [...csvSlugs].slice(0, 5));
  console.log('🔤 Sample DB Slugs:', [...dbSlugs].slice(0, 5));

  // Try to find ANY matching slug
  const matchingSlug = [...csvSlugs].find(s => dbSlugs.has(s));
  if (matchingSlug) {
    console.log(`\n✅ Found at least one matching slug: "${matchingSlug}"`);
  } else {
    console.log('\n⚠️  No matching slugs found in sample!');
    console.log('This suggests the CSV and database contain different campaigns.');
  }
}

diagnose().catch(console.error);

