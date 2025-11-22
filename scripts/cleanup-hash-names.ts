import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Detect if a track name looks like a hash, UUID, or ID
function isHashLike(name: string): boolean {
  if (!name || name.length < 5) return false;
  
  const normalized = name.toLowerCase().replace(/\s+/g, '');
  
  // Check for UUID-like patterns (8-4-4-4-12 hex digits)
  if (/^[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}$/i.test(normalized)) {
    return true;
  }
  
  // Check for long hex strings
  if (/^[0-9a-f]{10,}$/i.test(normalized)) {
    return true;
  }
  
  // Check for base64-like strings (common in shortened URLs)
  if (/^[a-z0-9]{15,}$/i.test(normalized) && (normalized.match(/[0-9]/g) || []).length > 5) {
    return true;
  }
  
  // Check if mostly alphanumeric with high ratio of numbers
  const numCount = (normalized.match(/[0-9]/g) || []).length;
  const letterCount = (normalized.match(/[a-z]/gi) || []).length;
  if (numCount > letterCount && normalized.length > 10) {
    return true;
  }
  
  // Check for patterns like "s-xxxxx" (private track tokens)
  if (/^s[\s-][a-z0-9]{8,}/i.test(name)) {
    return true;
  }
  
  return false;
}

async function cleanupHashNames() {
  console.log('🧹 Cleaning up hash-like track names...\n');

  // Get all submissions
  const { data: submissions, error } = await supabase
    .from('soundcloud_submissions')
    .select('id, track_name, artist_name, track_url');

  if (error || !submissions) {
    console.error('❌ Error fetching submissions:', error);
    return;
  }

  console.log(`📊 Found ${submissions.length} total submissions\n`);
  console.log('🔍 Identifying hash-like names...\n');

  let cleanedCount = 0;
  let skippedCount = 0;

  for (const sub of submissions) {
    if (!sub.track_name || sub.track_name === 'Untitled Track') {
      skippedCount++;
      continue;
    }

    if (isHashLike(sub.track_name)) {
      console.log(`  🔄 Replacing: "${sub.track_name}" → "Untitled Track"`);
      
      const { error: updateError } = await supabase
        .from('soundcloud_submissions')
        .update({
          track_name: 'Untitled Track',
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      if (updateError) {
        console.error(`  ❌ Error updating:`, updateError.message);
      } else {
        cleanedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n✨ Cleanup Complete!\n');
  console.log('📊 Summary:');
  console.log(`  🧹 Cleaned: ${cleanedCount}`);
  console.log(`  ✅ Already good: ${skippedCount}`);
  console.log(`  📊 Total: ${submissions.length}`);
}

cleanupHashNames().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



