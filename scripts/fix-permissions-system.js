#!/usr/bin/env node

/**
 * Fix Permissions System Script
 * Ensures the production permissions system matches local functionality
 */

const { createClient } = require('@supabase/supabase-js');

// Production Supabase connection (on droplet)
const SUPABASE_URL = 'http://localhost:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkPermissionsSetup() {
  console.log('🔍 CHECKING PERMISSIONS SYSTEM SETUP');
  console.log('====================================\n');
  
  try {
    // Check if user_permissions table exists and has data
    const { data: permissions, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .limit(5);
    
    if (permError) {
      console.log('❌ Error accessing user_permissions:', permError.message);
      return false;
    }
    
    console.log(`✅ user_permissions table: ${permissions.length} sample records`);
    
    // Check current users and their permissions
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log(`👤 Total auth users: ${users.users.length}`);
    
    // For each user, check their permissions
    for (const user of users.users.slice(0, 3)) { // Check first 3 users
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      
      console.log(`   • ${user.email}: ${userPerms?.length || 0} permissions`);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Permission check failed:', error.message);
    return false;
  }
}

async function createMissingPermissions() {
  console.log('\n🔧 CREATING MISSING PERMISSIONS');
  console.log('===============================\n');
  
  try {
    // Get all users
    const { data: users } = await supabase.auth.admin.listUsers();
    
    const platforms = ['dashboard', 'spotify', 'soundcloud', 'youtube', 'instagram'];
    
    for (const user of users.users) {
      console.log(`🔄 Processing permissions for: ${user.email}`);
      
      // Check existing permissions
      const { data: existingPerms } = await supabase
        .from('user_permissions')
        .select('platform')
        .eq('user_id', user.id);
      
      const existingPlatforms = existingPerms?.map(p => p.platform) || [];
      
      // Create missing permissions based on role
      const userRole = user.user_metadata?.role || 'vendor';
      
      for (const platform of platforms) {
        if (!existingPlatforms.includes(platform)) {
          // Set permissions based on role
          let canRead = true;
          let canWrite = false;
          let canDelete = false;
          
          if (userRole === 'admin') {
            canRead = true;
            canWrite = true;
            canDelete = true;
          } else if (userRole === 'manager') {
            canRead = true;
            canWrite = true;
            canDelete = false;
          } else if (userRole === 'sales') {
            canRead = true;
            canWrite = platform !== 'dashboard';
            canDelete = false;
          } else if (userRole === 'vendor') {
            canRead = platform !== 'dashboard';
            canWrite = false;
            canDelete = false;
          }
          
          const newPermission = {
            user_id: user.id,
            platform: platform,
            can_read: canRead,
            can_write: canWrite,
            can_delete: canDelete
          };
          
          const { error: insertError } = await supabase
            .from('user_permissions')
            .insert(newPermission);
          
          if (insertError) {
            console.log(`  ❌ Failed to create ${platform} permission: ${insertError.message}`);
          } else {
            console.log(`  ✅ Created ${platform} permission (${canRead ? 'R' : ''}${canWrite ? 'W' : ''}${canDelete ? 'D' : ''})`);
          }
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Permission creation failed:', error.message);
  }
}

async function verifyPermissions() {
  console.log('\n📊 VERIFYING PERMISSIONS SETUP');
  console.log('==============================\n');
  
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    
    console.log('User Permissions Summary:');
    console.log('------------------------');
    
    for (const user of users.users) {
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      
      const role = user.user_metadata?.role || 'unknown';
      const email = user.email.padEnd(30);
      const permCount = userPerms?.length || 0;
      
      console.log(`${email} | ${role.padEnd(8)} | ${permCount} permissions`);
      
      // Show platform breakdown
      if (userPerms && userPerms.length > 0) {
        const platforms = userPerms.map(p => {
          const perms = `${p.can_read ? 'R' : ''}${p.can_write ? 'W' : ''}${p.can_delete ? 'D' : ''}`;
          return `${p.platform}:${perms}`;
        }).join(', ');
        console.log(`    Platforms: ${platforms}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
  }
}

async function runPermissionsFix() {
  console.log('🚀 FIXING PERMISSIONS SYSTEM');
  console.log('============================');
  console.log('Goal: Ensure all users have proper platform permissions\n');
  
  // Step 1: Check current setup
  const setupOk = await checkPermissionsSetup();
  if (!setupOk) {
    console.log('\n❌ Permissions system not properly set up');
    return;
  }
  
  // Step 2: Create missing permissions
  await createMissingPermissions();
  
  // Step 3: Verify the setup
  await verifyPermissions();
  
  console.log('🎉 PERMISSIONS FIX COMPLETE!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Test permission editing in admin panel');
  console.log('2. Verify role-based access for different users'); 
  console.log('3. Test vendor vs admin view differences');
}

if (require.main === module) {
  runPermissionsFix().catch(console.error);
}

module.exports = { runPermissionsFix };
