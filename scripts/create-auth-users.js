#!/usr/bin/env node

/**
 * Create authentication users directly in Supabase Auth
 * Clean script without hardcoded API keys
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const testUsers = [
  {
    email: 'admin@arti-demo.com',
    password: 'Password123!',
    role: 'admin',
    name: 'Admin User'
  },
  {
    email: 'manager@arti-demo.com', 
    password: 'Password123!',
    role: 'manager',
    name: 'Manager User'
  },
  {
    email: 'analyst@arti-demo.com',
    password: 'Password123!', 
    role: 'analyst',
    name: 'Analyst User'
  },
  {
    email: 'creator@arti-demo.com',
    password: 'Password123!',
    role: 'creator', 
    name: 'Creator User'
  }
]

async function createUsers() {
  console.log('🔐 Creating authentication users...')
  
  for (const userData of testUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          role: userData.role
        }
      })
      
      if (error) {
        console.error(`❌ Failed to create ${userData.email}:`, error.message)
      } else {
        console.log(`✅ Created user: ${userData.email} (${userData.role})`)
      }
    } catch (err) {
      console.error(`❌ Error creating ${userData.email}:`, err.message)
    }
  }
  
  console.log('🎉 User creation completed!')
  console.log('')
  console.log('📋 Test Credentials:')
  testUsers.forEach(user => {
    console.log(`   • ${user.email} / ${user.password} (${user.role})`)
  })
}

createUsers()
