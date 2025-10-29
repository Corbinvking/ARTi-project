#!/usr/bin/env node
/**
 * Create vendor users for local development and testing
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

const vendorUsers = [
  { 
    email: 'vendor1@arti-demo.com', 
    password: 'Password123!', 
    name: 'Club Restricted',
    cost_per_1k: 5.00
  },
  { 
    email: 'vendor2@arti-demo.com', 
    password: 'Password123!', 
    name: 'Playlist Curator Pro',
    cost_per_1k: 4.50
  },
  { 
    email: 'vendor3@arti-demo.com', 
    password: 'Password123!', 
    name: 'Music Reach',
    cost_per_1k: 6.00
  }
];

async function createVendorUsers() {
  console.log('\n🎵 VENDOR PORTAL SETUP - Creating vendor users...\n');
  
  for (const vendor of vendorUsers) {
    try {
      // 1. Create auth user
      console.log(`📝 Creating user: ${vendor.email}`);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: vendor.email,
        password: vendor.password,
        email_confirm: true,
        user_metadata: { 
          name: vendor.name,
          role: 'vendor'
        }
      });
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User already exists: ${vendor.email}`);
          // Get existing user ID
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === vendor.email);
          
          if (existingUser) {
            authData = { user: existingUser };
          }
        } else {
          console.error(`   ❌ Failed to create user: ${authError.message}`);
          continue;
        }
      } else {
        console.log(`   ✅ User created: ${vendor.email}`);
      }
      
      const userId = authData?.user?.id;
      if (!userId) {
        console.error(`   ❌ No user ID found for ${vendor.email}`);
        continue;
      }
      
      // 2. Check if vendor already exists or create it
      console.log(`   📦 Checking/creating vendor record: ${vendor.name}`);
      
      // First check if vendor exists
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('*')
        .eq('name', vendor.name)
        .single();
      
      let vendorData = existingVendor;
      
      if (!existingVendor) {
        // Create new vendor
        const { data: newVendor, error: vendorError } = await supabase
          .from('vendors')
          .insert({
            name: vendor.name,
            is_active: true,
            cost_per_1k_streams: vendor.cost_per_1k,
            max_daily_streams: 50000,
            max_concurrent_campaigns: 5
          })
          .select()
          .single();
        
        if (vendorError) {
          console.error(`   ❌ Failed to create vendor: ${vendorError.message}`);
          continue;
        }
        
        vendorData = newVendor;
        console.log(`   ✅ Vendor created: ${vendor.name} (ID: ${vendorData.id})`);
      } else {
        console.log(`   ✅ Vendor exists: ${vendor.name} (ID: ${vendorData.id})`);
      }
      
      // Store the mapping for user reference
      console.log(`   🔗 User ${vendor.email} mapped to vendor ${vendor.name}`);
      
    } catch (err) {
      console.error(`   ❌ Error processing ${vendor.email}: ${err.message}`);
    }
  }
  
  console.log('\n🎉 VENDOR SETUP COMPLETE!\n');
  console.log('📋 Login Credentials:\n');
  vendorUsers.forEach(vendor => {
    console.log(`   🔑 ${vendor.email} / ${vendor.password}`);
    console.log(`      Vendor: ${vendor.name}\n`);
  });
  
  console.log('🌐 Login at: http://localhost:3000/login');
  console.log('📍 Vendor Dashboard: http://localhost:3000/spotify/campaigns (should auto-route to vendor view)\n');
}

createVendorUsers().catch(console.error);

