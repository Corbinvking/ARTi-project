#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use production Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncAuthUsersToPublicUsers() {
  console.log('🔄 Syncing auth.users to public.users...\n');
  console.log(`📍 Connecting to: ${supabaseUrl}\n`);

  // Get all users from auth.users
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  console.log(`📋 Found ${authUsers.length} users in auth.users\n`);

  // Get existing users in public.users
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('id, email');
  
  if (publicError) {
    console.error('❌ Error fetching public.users:', publicError);
  }

  const existingIds = new Set(publicUsers?.map(u => u.id) || []);
  console.log(`📋 Found ${existingIds.size} users in public.users\n`);

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const authUser of authUsers) {
    const { id, email, user_metadata, created_at } = authUser;

    if (existingIds.has(id)) {
      console.log(`⏭️  Skipping ${email} - already exists`);
      skippedCount++;
      continue;
    }

    // Insert into public.users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: id,
        email: email,
        full_name: user_metadata?.full_name || email?.split('@')[0] || 'User',
        avatar_url: user_metadata?.avatar_url,
        created_at: created_at
      });

    if (insertError) {
      console.error(`❌ Error syncing ${email}:`, insertError.message);
      errorCount++;
    } else {
      console.log(`✅ Synced ${email}`);
      syncedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Synced: ${syncedCount}`);
  console.log(`  ⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`\n✨ Sync complete! Total users in public.users: ${syncedCount + skippedCount}`);
}

syncAuthUsersToPublicUsers().catch(console.error);

