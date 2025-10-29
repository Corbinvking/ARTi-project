#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

// Production credentials
const supabaseUrl = 'https://api.artistinfluence.com';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Define which users should have which roles
const USER_ROLES = {
  'admin@arti-demo.com': 'admin',
  'manager@arti-demo.com': 'manager',
  'sales@arti-demo.com': 'salesperson',
  'vendor@arti-demo.com': 'vendor',
  'vendor1@arti-demo.com': 'vendor',
  'vendor2@arti-demo.com': 'vendor',
  'vendor3@arti-demo.com': 'vendor',
  'rbac@arti-demo.com': 'manager',
  'analyst@arti-demo.com': 'manager',
  'creator@arti-demo.com': 'salesperson',
  'prod@arti-demo.com': 'admin',
};

async function createUserRoles() {
  console.log('🔄 Creating user roles in production...\n');

  // Get all users from auth
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  console.log(`📋 Found ${authUsers.length} users in auth.users\n`);

  // Get existing roles
  const { data: existingRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (rolesError) {
    console.error('❌ Error fetching existing roles:', rolesError);
  }

  const existingUserIds = new Set(existingRoles?.map(r => r.user_id) || []);
  console.log(`📋 Found ${existingUserIds.size} existing user_roles entries\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of authUsers) {
    const email = user.email;
    const userId = user.id;

    if (existingUserIds.has(userId)) {
      console.log(`⏭️  Skipping ${email} - already has role`);
      skipped++;
      continue;
    }

    // Determine role based on email
    const role = USER_ROLES[email] || 'vendor'; // Default to vendor if not specified

    console.log(`➕ Creating role for ${email}: ${role}`);

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      });

    if (insertError) {
      console.error(`   ❌ Error:`, insertError.message);
      errors++;
    } else {
      console.log(`   ✅ Created`);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`\n✨ Done!`);
}

createUserRoles().catch(console.error);

