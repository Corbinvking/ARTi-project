#!/usr/bin/env node

/**
 * Diagnose the "Invalid credentials" authentication issue
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEhxiMp1wqUmYZdx3kMCgkGRMHGdSTTG4YQ'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

async function diagnoseAuthIssue() {
  console.log('🔐 DIAGNOSING AUTHENTICATION ISSUE')
  console.log('=' .repeat(50))
  
  // Test 1: Check auth users exist
  console.log('\n🧪 Test 1: Checking auth users...')
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.log('❌ Cannot list users:', usersError.message)
      return
    }
    
    console.log(`✅ Found ${users.length} auth users:`)
    users.forEach(user => {
      console.log(`   • ${user.email} (confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'})`)
      console.log(`     Created: ${user.created_at}`)
      console.log(`     Metadata: ${JSON.stringify(user.user_metadata || {})}`)
    })
    
    // Find admin user specifically
    const adminUser = users.find(u => u.email === 'admin@arti-demo.com')
    if (!adminUser) {
      console.log('❌ Admin user not found!')
      return
    }
    
    console.log(`\n🔍 Admin user details:`)
    console.log(`   ID: ${adminUser.id}`)
    console.log(`   Email confirmed: ${adminUser.email_confirmed_at ? 'YES' : 'NO'}`)
    console.log(`   Last sign in: ${adminUser.last_sign_in_at || 'Never'}`)
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message)
    return
  }
  
  // Test 2: Try authentication with anon client (what frontend uses)
  console.log('\n🧪 Test 2: Testing authentication with anon client...')
  
  try {
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: 'admin@arti-demo.com',
      password: 'Password123!'
    })
    
    if (error) {
      console.log('❌ AUTHENTICATION FAILED:', error.message)
      console.log('📋 Error details:')
      console.log(`   Code: ${error.status || 'unknown'}`)
      console.log(`   Message: ${error.message}`)
      
      // Common causes analysis
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n🔍 DIAGNOSIS: Invalid login credentials error')
        console.log('📋 This could be caused by:')
        console.log('   1. Email confirmation required but not set')
        console.log('   2. Wrong password')
        console.log('   3. User created incorrectly')
        console.log('   4. Auth configuration issue')
      }
      
    } else {
      console.log('✅ AUTHENTICATION SUCCESSFUL!')
      console.log(`   User ID: ${data.user?.id}`)
      console.log(`   Email: ${data.user?.email}`)
      console.log(`   Session: ${data.session ? 'Created' : 'None'}`)
      
      // Sign out after test
      await supabaseAnon.auth.signOut()
      console.log('🚪 Signed out after test')
    }
    
  } catch (authError) {
    console.error('❌ Auth test error:', authError.message)
  }
  
  // Test 3: Check Supabase configuration
  console.log('\n🧪 Test 3: Checking Supabase configuration...')
  
  try {
    // Check auth settings
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const settings = await response.json()
      console.log('✅ Auth settings accessible')
      console.log(`   External email enabled: ${settings.external?.email?.enabled || 'unknown'}`)
      console.log(`   Email confirmations: ${settings.email_confirm || 'unknown'}`)
    } else {
      console.log('⚠️  Could not fetch auth settings')
    }
    
  } catch (settingsError) {
    console.log('⚠️  Settings check failed:', settingsError.message)
  }
  
  // Test 4: Manual user recreation with explicit settings
  console.log('\n🧪 Test 4: Recreating admin user with explicit confirmation...')
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Delete existing admin user first
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingAdmin = users.find(u => u.email === 'admin@arti-demo.com')
    
    if (existingAdmin) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAdmin.id)
      if (deleteError) {
        console.log('⚠️  Could not delete existing user:', deleteError.message)
      } else {
        console.log('🗑️  Deleted existing admin user')
      }
    }
    
    // Create new admin user with explicit confirmation
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@arti-demo.com',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User',
        role: 'admin'
      }
    })
    
    if (createError) {
      console.log('❌ Could not recreate user:', createError.message)
    } else {
      console.log('✅ Recreated admin user with confirmation')
      console.log(`   ID: ${newUser.user.id}`)
      console.log(`   Confirmed: ${newUser.user.email_confirmed_at ? 'YES' : 'NO'}`)
    }
    
  } catch (recreateError) {
    console.log('❌ User recreation failed:', recreateError.message)
  }
  
  // Test 5: Final authentication test
  console.log('\n🧪 Test 5: Final authentication test...')
  
  try {
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: 'admin@arti-demo.com',
      password: 'Password123!'
    })
    
    if (error) {
      console.log('❌ Still failing:', error.message)
    } else {
      console.log('🎉 AUTHENTICATION NOW WORKING!')
      await supabaseAnon.auth.signOut()
    }
    
  } catch (finalError) {
    console.log('❌ Final test error:', finalError.message)
  }
  
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Try login again at: http://localhost:3000')
  console.log('2. Use: admin@arti-demo.com / Password123!')
  console.log('3. If still failing, check browser console for detailed errors')
  console.log('4. Verify frontend is using correct Supabase URL/keys')
}

diagnoseAuthIssue().catch(console.error)
