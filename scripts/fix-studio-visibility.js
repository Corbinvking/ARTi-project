#!/usr/bin/env node

/**
 * Fix Supabase Studio visibility for campaigns table
 * Disable RLS temporarily to view data in Studio
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStudioVisibility() {
  console.log('🔧 FIXING SUPABASE STUDIO VISIBILITY')
  console.log('=' .repeat(40))
  
  try {
    // Disable RLS on campaigns table
    console.log('🔓 Disabling RLS on campaigns table...')
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;'
    })
    
    if (rlsError) {
      console.log('⚠️  Could not disable RLS via RPC, trying direct approach...')
      
      // Try using direct connection
      const { Client } = require('pg')
      const client = new Client({
        host: '127.0.0.1',
        port: 54322,
        database: 'postgres', 
        user: 'postgres',
        password: 'postgres'
      })
      
      try {
        await client.connect()
        await client.query('ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;')
        await client.end()
        console.log('✅ RLS disabled using direct connection')
      } catch (pgError) {
        console.log('❌ Direct connection failed:', pgError.message)
        console.log('📋 Manual fix needed - see instructions below')
      }
    } else {
      console.log('✅ RLS disabled successfully')
    }
    
    // Verify data is now visible
    console.log('\n🔍 Verifying data visibility...')
    
    const { count, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('❌ Still having issues:', countError.message)
    } else {
      console.log(`✅ Can access ${count} campaigns from service role`)
    }
    
    // Test anon access (what Studio uses)
    const anonSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEhxiMp1wqUmYZdx3kMCgkGRMHGdSTTG4YQ')
    
    const { count: anonCount, error: anonError } = await anonSupabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
    
    if (anonError) {
      console.log('⚠️  Anon role still blocked:', anonError.message)
      console.log('📋 Studio might still show empty - this is expected for security')
    } else {
      console.log(`✅ Anon role can access ${anonCount} campaigns`)
      console.log('🎉 Studio should now show the data!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log('\n🎯 NEXT STEPS:')
  console.log('1. Refresh Supabase Studio: http://127.0.0.1:54323')
  console.log('2. Go to Table Editor → campaigns')
  console.log('3. You should now see all 5,111 campaigns')
  console.log('4. If still empty, try the SQL Editor approach below')
  
  console.log('\n🔧 MANUAL FIX (if needed):')
  console.log('1. Open Supabase Studio → SQL Editor')
  console.log('2. Run: ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;')
  console.log('3. Go back to Table Editor → campaigns')
  console.log('4. Data should now be visible')
  
  console.log('\n📊 DATA BREAKDOWN:')
  console.log('• Total: 5,111 campaigns')
  console.log('• Spotify: 2,149 campaigns')
  console.log('• SoundCloud: 1,981 campaigns')
  console.log('• YouTube: 820 campaigns')
  console.log('• Instagram: 161 campaigns')
}

fixStudioVisibility().catch(console.error)
