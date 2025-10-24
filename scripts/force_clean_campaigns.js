import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('   Supabase URL:', supabaseUrl ? '✅' : '❌');
  console.error('   Service Role Key:', supabaseKey ? '✅' : '❌');
  console.error('\nChecking .env.local...');
  
  // Try to help debug
  const fs = await import('fs');
  if (fs.existsSync('.env.local')) {
    console.error('✅ .env.local exists');
    console.error('\nPlease check it contains:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=...');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=...');
  } else {
    console.error('❌ .env.local not found!');
    console.error('\nManually set variables:');
    console.error('   export NEXT_PUBLIC_SUPABASE_URL="your-url"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  }
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function forceCleanCampaigns() {
  console.log('\n================================================================================');
  console.log('🗑️  FORCE CLEAN ALL CAMPAIGNS');
  console.log('================================================================================\n');

  try {
    // Get initial count
    const { count: initialCount, error: countError } = await supabase
      .from('spotify_campaigns')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting campaigns:', countError.message);
      return;
    }

    console.log(`📊 Current campaigns in database: ${initialCount}`);
    
    if (initialCount === 0) {
      console.log('✅ Database is already clean!');
      return;
    }

    console.log('\n🗑️  Deleting ALL campaigns in batches...\n');

    let totalDeleted = 0;
    let batchNumber = 0;

    // Delete in batches of 500
    while (true) {
      batchNumber++;
      
      // Fetch batch of IDs
      const { data: campaigns, error: fetchError } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .limit(500);

      if (fetchError) {
        console.error(`❌ Error fetching batch ${batchNumber}:`, fetchError.message);
        break;
      }

      if (!campaigns || campaigns.length === 0) {
        console.log('\n✅ No more campaigns to delete');
        break;
      }

      const ids = campaigns.map(c => c.id);

      // Delete this batch
      const { error: deleteError } = await supabase
        .from('spotify_campaigns')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${batchNumber}:`, deleteError.message);
        break;
      }

      totalDeleted += ids.length;
      console.log(`   Batch ${batchNumber}: Deleted ${ids.length} campaigns (Total: ${totalDeleted}/${initialCount})`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify deletion
    const { count: finalCount, error: finalCountError } = await supabase
      .from('spotify_campaigns')
      .select('*', { count: 'exact', head: true });

    if (finalCountError) {
      console.error('❌ Error verifying deletion:', finalCountError.message);
      return;
    }

    console.log('\n================================================================================');
    console.log('✅ DELETION COMPLETE');
    console.log('================================================================================\n');
    console.log(`📊 Campaigns before: ${initialCount}`);
    console.log(`📊 Campaigns deleted: ${totalDeleted}`);
    console.log(`📊 Campaigns remaining: ${finalCount}`);

    if (finalCount === 0) {
      console.log('\n✅ SUCCESS! Database is completely clean!');
    } else {
      console.log('\n⚠️  Warning: Some campaigns remain. May need to check RLS policies.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

forceCleanCampaigns();

