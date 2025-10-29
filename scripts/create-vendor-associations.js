#!/usr/bin/env node
/**
 * Create vendor associations for vendor users
 * This script:
 * 1. Creates vendor records if they don't exist
 * 2. Links vendor users to their vendor records via vendor_users table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use local Supabase instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define vendors from the CSV data
const VENDORS = [
  { name: 'Club Restricted', email: 'clubrestrictedpromo@gmail.com', max_daily_streams: 50000 },
  { name: 'Glenn', email: 'glennho1991@gmail.com', max_daily_streams: 30000 },
  { name: 'Majed', email: 'majed@vendor.com', max_daily_streams: 30000 },
  { name: 'Golden Nugget', email: 'jared@artistinfluence.com', max_daily_streams: 25000 },
  { name: 'Alekk', email: 'alekk@vendor.com', max_daily_streams: 20000 },
  { name: 'Gloomy Guy', email: 'gloomyguy@vendor.com', max_daily_streams: 15000 },
];

async function main() {
  console.log('🚀 Starting vendor association setup...\n');

  // Step 1: Get all auth users with vendor role
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching users:', authError);
    return;
  }

  const vendorUsers = authData.users.filter(u => u.user_metadata?.role === 'vendor');
  console.log(`📋 Found ${vendorUsers.length} vendor users:`);
  vendorUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  console.log();

  // Debug: Check existing vendor_users entries
  const { data: existingVendorUsers, error: vendorUsersError } = await supabase
    .from('vendor_users')
    .select('*');
  
  console.log(`🔍 Existing vendor_users entries: ${existingVendorUsers?.length || 0}`);
  if (vendorUsersError) {
    console.log('⚠️  Error fetching vendor_users:', vendorUsersError);
  }
  console.log();

  // Step 2: Create or get vendor records
  console.log('📦 Setting up vendor records...\n');
  
  for (const vendorInfo of VENDORS) {
    // Check if vendor exists
    const { data: existing, error: checkError } = await supabase
      .from('vendors')
      .select('*')
      .eq('name', vendorInfo.name)
      .single();

    let vendorId;
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`❌ Error checking vendor ${vendorInfo.name}:`, checkError);
      continue;
    }

    if (existing) {
      console.log(`✓ Vendor "${vendorInfo.name}" already exists (ID: ${existing.id})`);
      vendorId = existing.id;
    } else {
      // Create vendor
      const { data: newVendor, error: createError } = await supabase
        .from('vendors')
        .insert({
          name: vendorInfo.name,
          max_daily_streams: vendorInfo.max_daily_streams,
          max_concurrent_campaigns: 10,
          is_active: true,
          cost_per_1k_streams: 15
        })
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating vendor ${vendorInfo.name}:`, createError);
        continue;
      }

      vendorId = newVendor.id;
      console.log(`✅ Created vendor "${vendorInfo.name}" (ID: ${vendorId})`);
    }

    // Step 3: Find matching vendor user by email pattern
    const matchingUser = vendorUsers.find(u => {
      // Match vendor1@arti-demo.com -> Club Restricted (first vendor)
      // Match vendor2@arti-demo.com -> Glenn (second vendor)
      // etc.
      const match = u.email.match(/vendor(\d+)@arti-demo\.com/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        return VENDORS[index]?.name === vendorInfo.name;
      }
      return false;
    });

    if (!matchingUser) {
      console.log(`  ⚠️  No matching user found for ${vendorInfo.name}`);
      continue;
    }

    // Step 4: Create vendor_users association
    const { data: existingAssoc, error: assocCheckError } = await supabase
      .from('vendor_users')
      .select('*')
      .eq('user_id', matchingUser.id)
      .eq('vendor_id', vendorId)
      .single();

    if (existingAssoc) {
      console.log(`  ✓ User ${matchingUser.email} already linked`);
    } else {
      const { error: linkError } = await supabase
        .from('vendor_users')
        .insert({
          user_id: matchingUser.id,
          vendor_id: vendorId
        });

      if (linkError) {
        console.error(`  ❌ Error linking user ${matchingUser.email}:`, linkError);
      } else {
        console.log(`  ✅ Linked user ${matchingUser.email} to ${vendorInfo.name}`);
      }
    }
    console.log();
  }

  console.log('\n🎉 Vendor association setup complete!\n');
  
  // Display summary
  console.log('📊 Summary:');
  const { data: allVendors } = await supabase
    .from('vendors')
    .select(`
      id,
      name,
      vendor_users (
        user_id
      )
    `);
  
  allVendors?.forEach(v => {
    const userCount = v.vendor_users?.length || 0;
    console.log(`  ${v.name}: ${userCount} user(s)`);
  });
}

main().catch(console.error);

