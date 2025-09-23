// Quick recovery script to create essential users
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const testUsers = [
  { email: 'admin@arti-demo.com', password: 'Password123!', role: 'admin', name: 'Admin User' },
  { email: 'manager@arti-demo.com', password: 'Password123!', role: 'manager', name: 'Manager User' },
  { email: 'analyst@arti-demo.com', password: 'Password123!', role: 'analyst', name: 'Analyst User' },
  { email: 'creator@arti-demo.com', password: 'Password123!', role: 'creator', name: 'Creator User' }
]

async function createUsers() {
  console.log('🚨 EMERGENCY USER RECOVERY - Creating auth users...')
  
  for (const userData of testUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: { name: userData.name, role: userData.role }
      })
      
      if (error) {
        console.error(`❌ Failed: ${userData.email} - ${error.message}`)
      } else {
        console.log(`✅ Created: ${userData.email} (${userData.role})`)
      }
    } catch (err) {
      console.error(`❌ Error: ${userData.email} - ${err.message}`)
    }
  }
  
  console.log('\n🎉 USER RECOVERY COMPLETE!')
  console.log('📋 Login Credentials:')
  testUsers.forEach(user => {
    console.log(`   • ${user.email} / ${user.password} (${user.role})`)
  })
}

createUsers().catch(console.error)
