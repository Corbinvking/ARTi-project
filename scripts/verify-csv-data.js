#!/usr/bin/env node

/**
 * Quick verification of CSV data in Supabase
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyCsvData() {
  console.log('🔍 VERIFYING CSV DATA IN SUPABASE')
  console.log('=' .repeat(40))
  
  try {
    // Check if campaigns table exists and has data
    const { count, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('❌ Error accessing campaigns table:', countError.message)
      console.log('📋 This means the table might not exist or there are permission issues')
      return
    }
    
    console.log(`📊 Total campaigns in database: ${count}`)
    
    if (count === 0) {
      console.log('⚠️  NO DATA FOUND - Table exists but is empty')
      console.log('📋 The CSV loading might have failed')
    } else {
      console.log('✅ Data found! Fetching samples...')
      
      // Get platform breakdown
      const platforms = ['spotify', 'soundcloud', 'youtube', 'instagram']
      
      for (const platform of platforms) {
        const { count: platformCount, error: platformError } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('platform', platform)
        
        if (!platformError) {
          console.log(`   • ${platform}: ${platformCount} campaigns`)
        }
      }
      
      // Get sample data
      const { data: sampleData, error: sampleError } = await supabase
        .from('campaigns')
        .select('platform, campaign, track_info, client, clients, status')
        .limit(5)
      
      if (!sampleError && sampleData) {
        console.log('\n📋 Sample campaigns:')
        sampleData.forEach((row, i) => {
          const name = row.campaign || row.track_info || 'Unknown'
          const client = row.client || row.clients || 'Unknown'
          console.log(`   ${i + 1}. [${row.platform}] ${name.substring(0, 40)}... - ${client}`)
        })
      }
    }
    
    // Check table structure
    console.log('\n🏗️  Checking table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1)
    
    if (!tableError && tableInfo && tableInfo.length > 0) {
      const columns = Object.keys(tableInfo[0])
      console.log(`✅ Table has ${columns.length} columns`)
      console.log(`📋 Columns: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log('\n🎯 SUPABASE STUDIO ACCESS:')
  console.log('1. Open: http://127.0.0.1:54323')
  console.log('2. Go to: Table Editor')
  console.log('3. Look for: campaigns table')
  console.log('4. Check: Data should be visible there')
  
  console.log('\n🔧 IF NO DATA IN STUDIO:')
  console.log('• The table might be in a different schema')
  console.log('• RLS policies might be hiding data')
  console.log('• Studio might need a refresh')
  console.log('• Table might not be in the public schema')
}

verifyCsvData().catch(console.error)
