#!/usr/bin/env node
/**
 * Sync auth.users to public.users table
 * This ensures vendor users in auth.users also exist in public.users
 * so they can be referenced by vendor_users table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔄 Syncing auth.users to public.users...\n');

  // Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  console.log(`📋 Found ${authData.users.length} users in auth.users\n`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of authData.users) {
    // Check if user exists in public.users
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping ${user.email} - already exists in public.users`);
      skipped++;
      continue;
    }

    // Insert into public.users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.name || user.email.split('@')[0],
        settings: {}
      });

    if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
      console.error(`❌ Error syncing ${user.email}:`, insertError.message);
      errors++;
    } else {
      console.log(`✅ Synced ${user.email} to public.users`);
      synced++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Synced: ${synced}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('\n✨ Sync complete!');
}

main().catch(console.error);

