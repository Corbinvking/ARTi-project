#!/usr/bin/env node

/**
 * STAGE 3.1: Frontend Authentication Test
 * Tests the authentication flow and diagnoses "invalid credentials" issues
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEhxiMp1wqUmYZdx3kMCgkGRMHGdSTTG4YQ'

async function testFrontendAuth() {
  console.log('🔐 STAGE 3.1: FRONTEND AUTHENTICATION TEST')
  console.log('=' .repeat(50))
  
  // Test 1: Supabase Connection from Frontend Perspective
  console.log('\n🧪 Test 1: Supabase Client Connection')
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Supabase client created successfully')
    console.log(`   URL: ${supabaseUrl}`)
    console.log(`   Key: ${supabaseAnonKey.substring(0, 50)}...`)
    
    // Test basic connection
    const { data, error } = await supabase.from('orgs').select('id').limit(1)
    
    if (error) {
      console.log(`⚠️  Database query error: ${error.message}`)
    } else {
      console.log('✅ Database connection working')
    }
    
  } catch (clientError) {
    console.error('❌ Supabase client error:', clientError.message)
    return
  }
  
  // Test 2: Authentication with Valid Credentials
  console.log('\n🧪 Test 2: Authentication Test')
  
  const testCredentials = [
    { email: 'admin@arti-demo.com', password: 'Password123!', role: 'admin' },
    { email: 'manager@arti-demo.com', password: 'Password123!', role: 'manager' }
  ]
  
  for (const cred of testCredentials) {
    console.log(`\n   Testing: ${cred.email}`)
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password
      })
      
      if (error) {
        console.log(`   ❌ FAILED: ${error.message}`)
        
        // Diagnose the error
        if (error.message.includes('Invalid login credentials')) {
          console.log('   🔍 DIAGNOSIS: Invalid credentials error detected')
          console.log('   📋 This could be:')
          console.log('      • User not created in Supabase Auth')
          console.log('      • Password mismatch')
          console.log('      • Email confirmation required')
          console.log('      • Auth service misconfiguration')
        }
        
      } else {
        console.log(`   ✅ SUCCESS: Authentication successful`)
        console.log(`   👤 User ID: ${data.user?.id}`)
        console.log(`   📧 Email: ${data.user?.email}`)
        console.log(`   🎭 Metadata: ${JSON.stringify(data.user?.user_metadata || {})}`)
        
        // Test profile fetch
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('id', data.user.id)
            .single()
          
          if (profileError) {
            console.log(`   ⚠️  Profile fetch error: ${profileError.message}`)
          } else {
            console.log(`   👤 Profile: ${profile.full_name} (${profile.email})`)
          }
        } catch (profileErr) {
          console.log(`   ⚠️  Profile fetch failed: ${profileErr.message}`)
        }
        
        // Sign out
        await supabase.auth.signOut()
        console.log(`   🚪 Signed out successfully`)
      }
      
    } catch (authError) {
      console.log(`   ❌ ERROR: ${authError.message}`)
    }
  }
  
  // Test 3: Verify Auth Users in Database
  console.log('\n🧪 Test 3: Auth Users Verification')
  
  try {
    const supabaseService = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU')
    
    const { data: { users }, error: usersError } = await supabaseService.auth.admin.listUsers()
    
    if (usersError) {
      console.log('❌ Could not fetch auth users:', usersError.message)
    } else {
      console.log(`✅ Found ${users.length} auth users:`)
      users.forEach(user => {
        const metadata = user.user_metadata || {}
        console.log(`   • ${user.email}: ${metadata.role || 'no role'} (confirmed: ${user.email_confirmed_at ? 'yes' : 'no'})`)
      })
    }
    
  } catch (verifyError) {
    console.log('❌ Auth verification error:', verifyError.message)
  }
  
  // Test 4: Frontend Environment Check
  console.log('\n🧪 Test 4: Frontend Environment Check')
  
  console.log('📋 Frontend should use these environment variables:')
  console.log(`   NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`)
  console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`)
  console.log(`   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api`)
  
  console.log('\n🎯 FRONTEND DEBUGGING STEPS:')
  console.log('1. Open browser to: http://localhost:3000')
  console.log('2. Open Developer Tools → Console')
  console.log('3. Try login with: admin@arti-demo.com / Password123!')
  console.log('4. Check for errors in console')
  console.log('5. Verify network requests in Network tab')
  
  console.log('\n📋 COMMON FIXES FOR "Invalid Credentials":')
  console.log('• Check if users were created with email_confirm: true')
  console.log('• Verify Supabase URL/keys are correct in frontend')
  console.log('• Ensure auth.email.enable_confirmations = false in config')
  console.log('• Check if RLS policies are blocking auth')
  
  console.log('\n🚀 STAGE 3.1 DIAGNOSTIC COMPLETE')
  console.log('Ready for manual frontend testing...')
}

testFrontendAuth().catch(error => {
  console.error('💥 CRITICAL ERROR:', error.message)
  process.exit(1)
})
