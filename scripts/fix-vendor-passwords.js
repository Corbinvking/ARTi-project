#!/usr/bin/env node
/**
 * Fix vendor user passwords
 * Reset passwords for vendor users to ensure they can log in
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

const VENDOR_USERS = [
  { email: 'vendor1@arti-demo.com', password: 'password123', role: 'vendor' },
  { email: 'vendor2@arti-demo.com', password: 'password123', role: 'vendor' },
  { email: 'vendor3@arti-demo.com', password: 'password123', role: 'vendor' },
];

async function main() {
  console.log('🔧 Fixing vendor user passwords...\n');

  // Get all users
  const { data: authData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  console.log(`📋 Found ${authData.users.length} total users\n`);

  for (const vendorUser of VENDOR_USERS) {
    // Find the user
    const existingUser = authData.users.find(u => u.email === vendorUser.email);

    if (existingUser) {
      console.log(`👤 ${vendorUser.email} (${existingUser.id})`);
      
      // Update user password and ensure email is confirmed
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: vendorUser.password,
          email_confirm: true,
          user_metadata: {
            role: vendorUser.role,
            name: vendorUser.email.split('@')[0]
          }
        }
      );

      if (updateError) {
        console.error(`  ❌ Error updating:`, updateError.message);
      } else {
        console.log(`  ✅ Password reset to: ${vendorUser.password}`);
        console.log(`  ✅ Email confirmed: ${updatedUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  ✅ Role set to: ${updatedUser.user.user_metadata?.role}`);
      }
    } else {
      console.log(`❌ User ${vendorUser.email} not found - creating...`);
      
      // Create the user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: vendorUser.email,
        password: vendorUser.password,
        email_confirm: true,
        user_metadata: {
          role: vendorUser.role,
          name: vendorUser.email.split('@')[0]
        }
      });

      if (createError) {
        console.error(`  ❌ Error creating:`, createError.message);
      } else {
        console.log(`  ✅ Created user with password: ${vendorUser.password}`);
      }
    }
    console.log();
  }

  console.log('✨ Done! Try logging in now with:');
  console.log('   Email: vendor1@arti-demo.com');
  console.log('   Password: password123');
}

main().catch(console.error);

