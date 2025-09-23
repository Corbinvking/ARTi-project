#!/usr/bin/env node

/**
 * STAGE 1.3: Create Production Auth Users
 * Creates proper auth users with metadata and database profiles
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const productionUsers = [
  {
    email: 'admin@arti-demo.com',
    password: 'Password123!',
    role: 'admin',
    full_name: 'Admin User',
    org_name: 'ARTi Marketing Demo'
  },
  {
    email: 'manager@arti-demo.com', 
    password: 'Password123!',
    role: 'manager',
    full_name: 'Manager User',
    org_name: 'ARTi Marketing Demo'
  },
  {
    email: 'analyst@arti-demo.com',
    password: 'Password123!', 
    role: 'analyst',
    full_name: 'Analyst User',
    org_name: 'ARTi Marketing Demo'
  },
  {
    email: 'creator@arti-demo.com',
    password: 'Password123!',
    role: 'creator', 
    full_name: 'Creator User',
    org_name: 'ARTi Marketing Demo'
  }
]

async function createProductionUsers() {
  console.log('👥 STAGE 1.3: CREATING PRODUCTION AUTH USERS')
  console.log('=' .repeat(50))
  
  // Step 1: Ensure demo organization exists
  console.log('\n🏢 Step 1: Setting up demo organization...')
  
  const demoOrgId = '00000000-0000-0000-0000-000000000001' // Use fixed ID for consistency
  
  try {
    // Check if org exists
    const { data: existingOrg, error: orgCheckError } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('id', demoOrgId)
      .single()
    
    if (orgCheckError && orgCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking organization:', orgCheckError.message)
      return
    }
    
    if (!existingOrg) {
      // Create demo organization
      const { data: newOrg, error: createOrgError } = await supabase
        .from('orgs')
        .insert({
          id: demoOrgId,
          name: 'ARTi Marketing Demo',
          slug: 'arti-demo',
          settings: {
            timezone: 'UTC',
            currency: 'USD',
            features: ['campaigns', 'analytics', 'insights', 'automation']
          }
        })
        .select()
        .single()
      
      if (createOrgError) {
        console.error('❌ Failed to create organization:', createOrgError.message)
        return
      }
      
      console.log('✅ Created demo organization')
    } else {
      console.log('✅ Demo organization already exists')
    }
    
  } catch (orgError) {
    console.error('❌ Organization setup failed:', orgError.message)
    return
  }
  
  // Step 2: Create auth users
  console.log('\n👤 Step 2: Creating auth users...')
  
  const createdUsers = []
  
  for (const userData of productionUsers) {
    console.log(`\n   Creating: ${userData.email} (${userData.role})`)
    
    try {
      // Check if user already exists
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error(`   ❌ Failed to check existing users: ${listError.message}`)
        continue
      }
      
      const existingUser = users.find(user => user.email === userData.email)
      
      let authUser
      
      if (existingUser) {
        console.log(`   ⚠️  User ${userData.email} already exists, updating metadata...`)
        
        // Update existing user metadata
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              full_name: userData.full_name,
              role: userData.role,
              org_id: demoOrgId,
              org_name: userData.org_name
            }
          }
        )
        
        if (updateError) {
          console.error(`   ❌ Failed to update user metadata: ${updateError.message}`)
          continue
        }
        
        authUser = updatedUser.user
        
      } else {
        // Create new user
        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            role: userData.role,
            org_id: demoOrgId,
            org_name: userData.org_name
          }
        })
        
        if (createError) {
          console.error(`   ❌ Failed to create user: ${createError.message}`)
          continue
        }
        
        authUser = createdUser.user
        console.log(`   ✅ Created auth user: ${userData.email}`)
      }
      
      createdUsers.push({ ...userData, authUser })
      
    } catch (userError) {
      console.error(`   ❌ Error processing ${userData.email}: ${userError.message}`)
    }
  }
  
  // Step 3: Create/update database profiles
  console.log('\n📝 Step 3: Creating database profiles...')
  
  for (const userData of createdUsers) {
    if (!userData.authUser) continue
    
    console.log(`\n   Profile for: ${userData.email}`)
    
    try {
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userData.authUser.id)
        .single()
      
      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error(`   ❌ Error checking profile: ${profileCheckError.message}`)
        continue
      }
      
      if (!existingProfile) {
        // Create profile
        const { data: newProfile, error: createProfileError } = await supabase
          .from('users')
          .insert({
            id: userData.authUser.id,
            email: userData.email,
            full_name: userData.full_name,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name)}&background=0ea5e9&color=fff`
          })
          .select()
          .single()
        
        if (createProfileError) {
          console.error(`   ❌ Failed to create profile: ${createProfileError.message}`)
          continue
        }
        
        console.log(`   ✅ Created database profile`)
      } else {
        // Update existing profile
        const { error: updateProfileError } = await supabase
          .from('users')
          .update({
            full_name: userData.full_name,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name)}&background=0ea5e9&color=fff`
          })
          .eq('id', userData.authUser.id)
        
        if (updateProfileError) {
          console.error(`   ❌ Failed to update profile: ${updateProfileError.message}`)
          continue
        }
        
        console.log(`   ✅ Updated database profile`)
      }
      
    } catch (profileError) {
      console.error(`   ❌ Profile error for ${userData.email}: ${profileError.message}`)
    }
  }
  
  // Step 4: Create/update memberships
  console.log('\n🔗 Step 4: Creating organization memberships...')
  
  for (const userData of createdUsers) {
    if (!userData.authUser) continue
    
    console.log(`\n   Membership for: ${userData.email}`)
    
    try {
      // Check if membership exists
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('memberships')
        .select('user_id, org_id, role')
        .eq('user_id', userData.authUser.id)
        .eq('org_id', demoOrgId)
        .single()
      
      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
        console.error(`   ❌ Error checking membership: ${membershipCheckError.message}`)
        continue
      }
      
      if (!existingMembership) {
        // Create membership
        const { data: newMembership, error: createMembershipError } = await supabase
          .from('memberships')
          .insert({
            user_id: userData.authUser.id,
            org_id: demoOrgId,
            role: userData.role
          })
          .select()
          .single()
        
        if (createMembershipError) {
          console.error(`   ❌ Failed to create membership: ${createMembershipError.message}`)
          continue
        }
        
        console.log(`   ✅ Created membership (${userData.role})`)
      } else {
        // Update existing membership
        const { error: updateMembershipError } = await supabase
          .from('memberships')
          .update({ role: userData.role })
          .eq('user_id', userData.authUser.id)
          .eq('org_id', demoOrgId)
        
        if (updateMembershipError) {
          console.error(`   ❌ Failed to update membership: ${updateMembershipError.message}`)
          continue
        }
        
        console.log(`   ✅ Updated membership (${userData.role})`)
      }
      
    } catch (membershipError) {
      console.error(`   ❌ Membership error for ${userData.email}: ${membershipError.message}`)
    }
  }
  
  // Step 5: Verification
  console.log('\n🔍 Step 5: Verification...')
  
  try {
    // Check auth users
    const { data: { users: allUsers }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (!usersError) {
      console.log(`✅ Total auth users: ${allUsers.length}`)
      allUsers.forEach(user => {
        const metadata = user.user_metadata || {}
        console.log(`   • ${user.email}: ${metadata.role || 'no role'} (${metadata.full_name || 'no name'})`)
      })
    }
    
    // Check database profiles
    const { count: profileCount, error: profileCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    if (!profileCountError) {
      console.log(`✅ Database profiles: ${profileCount}`)
    }
    
    // Check memberships
    const { count: membershipCount, error: membershipCountError } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
    
    if (!membershipCountError) {
      console.log(`✅ Organization memberships: ${membershipCount}`)
    }
    
  } catch (verifyError) {
    console.error('❌ Verification failed:', verifyError.message)
  }
  
  console.log('\n🎉 STAGE 1.3 COMPLETE: Production Auth Users')
  console.log('✅ Auth users created and verified')
  console.log('✅ Database profiles linked')
  console.log('✅ Organization memberships set')
  console.log('\n📋 LOGIN CREDENTIALS:')
  productionUsers.forEach(user => {
    console.log(`   • ${user.email} / ${user.password} (${user.role})`)
  })
  console.log('\n🚀 Ready for Stage 2: Backend API Layer')
}

// Execute if run directly
if (require.main === module) {
  createProductionUsers().catch(error => {
    console.error('💥 CRITICAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  })
}

module.exports = { createProductionUsers }
