#!/usr/bin/env node
/**
 * Update vendor user roles to 'vendor' so they see the correct navigation
 */

const { createClient } = require('@supabase/supabase-js');

// Local Supabase connection
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const vendorEmails = [
  'vendor1@arti-demo.com',
  'vendor2@arti-demo.com',
  'vendor3@arti-demo.com'
];

async function updateVendorRoles() {
  console.log('\n🔧 UPDATING VENDOR USER ROLES...\n');
  
  // Get all users
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    return;
  }
  
  for (const email of vendorEmails) {
    const user = allUsers.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      continue;
    }
    
    console.log(`📝 Updating role for: ${email}`);
    
    try {
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          role: 'vendor'
        },
        app_metadata: {
          ...user.app_metadata,
          role: 'vendor'
        }
      });
      
      if (error) {
        console.error(`   ❌ Failed: ${error.message}`);
      } else {
        console.log(`   ✅ Role updated to 'vendor'`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n🎉 ROLE UPDATE COMPLETE!\n');
  console.log('🔄 Please log out and log back in for changes to take effect.\n');
}

updateVendorRoles().catch(console.error);

