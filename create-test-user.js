const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestUser() {
  try {
    // Create a test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@artistinfluence.com',
      password: 'ArtistInfluence2025!',
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    })

    if (error) {
      console.error('Error creating user:', error)
      return
    }

    console.log('✅ Test user created successfully!')
    console.log('Email: admin@artistinfluence.com')
    console.log('Password: ArtistInfluence2025!')
    console.log('User ID:', data.user.id)

    // Check if we can sign in with the new user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@artistinfluence.com',
      password: 'ArtistInfluence2025!'
    })

    if (signInError) {
      console.error('❌ Sign in test failed:', signInError)
    } else {
      console.log('✅ Sign in test successful!')
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

createTestUser()
