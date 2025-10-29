#!/usr/bin/env node
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

async function fixAdminRole() {
  console.log('🔧 Checking and fixing admin role...\n');

  // Find the admin user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  const adminUser = users.find(u => u.email === 'admin@arti-demo.com');
  if (!adminUser) {
    console.error('❌ Admin user not found');
    return;
  }

  console.log(`✅ Found admin user: ${adminUser.email} (${adminUser.id})\n`);

  // Check existing roles
  const { data: existingRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', adminUser.id);

  if (roleError) {
    console.error('❌ Error fetching roles:', roleError);
    return;
  }

  console.log(`📋 Current roles:`, existingRoles?.map(r => r.role) || []);

  // Add admin role if not present
  const hasAdminRole = existingRoles?.some(r => r.role === 'admin');
  if (!hasAdminRole) {
    console.log('\n➕ Adding admin role...');
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: adminUser.id,
        role: 'admin'
      });

    if (insertError) {
      console.error('❌ Error inserting admin role:', insertError);
    } else {
      console.log('✅ Admin role added successfully!');
    }
  } else {
    console.log('\n✅ Admin role already exists!');
  }

  // Verify final roles
  const { data: finalRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', adminUser.id);

  console.log(`\n📋 Final roles:`, finalRoles?.map(r => r.role) || []);
  console.log('\n✨ Done!');
}

fixAdminRole().catch(console.error);

