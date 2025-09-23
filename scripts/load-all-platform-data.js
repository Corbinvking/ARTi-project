#!/usr/bin/env node

/**
 * Load ALL CSV data into separate platform tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const csvMappings = [
  {
    file: 'Spotify Playlisting-All Campaigns.csv',
    table: 'spotify_campaigns',
    columnMap: {
      'Campaign': 'campaign',
      'Client': 'client', 
      'Goal': 'goal',
      'Salesperson': 'salesperson',
      'Remaining': 'remaining',
      'Daily': 'daily',
      'Weekly': 'weekly',
      'URL': 'url',
      'Sale price': 'sale_price',
      'Start Date': 'start_date',
      'Status': 'status',
      'Invoice': 'invoice',
      'Vendor': 'vendor',
      'Paid Vendor?': 'paid_vendor',
      'Curator Status': 'curator_status',
      'Playlists': 'playlists',
      'SFA': 'sfa',
      'Notify Vendor?': 'notify_vendor',
      'Ask For SFA': 'ask_for_sfa',
      'Update Client': 'update_client',
      'Client Email': 'client_email',
      'Vendor Email': 'vendor_email',
      'Notes': 'notes',
      'Last Modified': 'last_modified',
      'SP Vendor Updates': 'sp_vendor_updates',
      'Spotify Campaign (from SP Vendor Updates)': 'spotify_campaign_from_sp_vendor_updates'
    }
  },
  {
    file: 'SoundCloud-All Campaigns.csv',
    table: 'soundcloud_campaigns',
    columnMap: {
      'Track Info': 'track_info',
      'Client': 'client',
      'Service Type': 'service_type',
      'Goal': 'goal',
      'Remaining': 'remaining',
      'Status': 'status',
      'URL': 'url',
      'Submit Date': 'submit_date',
      'Start Date': 'start_date',
      'Receipts': 'receipts',
      'Salesperson': 'salesperson',
      'Invoice': 'invoice',
      'Sale Price': 'sale_price',
      'Confirm Start Date?': 'confirm_start_date',
      'Notes': 'notes',
      'Send Receipt(s)': 'send_receipts',
      'Ask Client for Playlist': 'ask_client_for_playlist',
      'Last Modified': 'last_modified',
      ' Salesperson Email': 'salesperson_email'
    }
  },
  {
    file: 'YouTube-All Campaigns.csv',
    table: 'youtube_campaigns',
    columnMap: {
      'Campaign': 'campaign',
      'Clients': 'clients',
      'Service Type': 'service_type',
      'Goal': 'goal',
      'Remaining': 'remaining',
      'Desired Daily': 'desired_daily',
      'URL': 'url',
      'Start Date': 'start_date',
      'Status': 'status',
      'Confirm Start Date?': 'confirm_start_date',
      'Ask for Access': 'ask_for_access',
      'Ask Client for YT SS': 'ask_client_for_yt_ss',
      'Views Stalled?': 'views_stalled',
      'Paid R?': 'paid_r',
      'Sale Price': 'sale_price',
      'Invoice': 'invoice',
      'Comments': 'comments',
      'In Fixer?': 'in_fixer',
      'Client Notes': 'client_notes'
    }
  },
  {
    file: 'IG Seeding-All Campaigns.csv',
    table: 'instagram_campaigns',
    columnMap: {
      'Campaign': 'campaign',
      'Clients': 'clients',
      'Start Date': 'start_date',
      'Price': 'price',
      'Spend': 'spend',
      'Remaining': 'remaining',
      'Sound URL': 'sound_url',
      'Status': 'status',
      'Tracker': 'tracker',
      'Campaign Started': 'campaign_started',
      'Send Tracker': 'send_tracker',
      'Send Final Report': 'send_final_report',
      'Invoice': 'invoice',
      'Salespeople': 'salespeople',
      'Report Notes': 'report_notes',
      'Client Notes': 'client_notes',
      'Paid Ops?': 'paid_ops'
    }
  }
]

async function loadAllPlatformData() {
  console.log('📊 LOADING ALL PLATFORM DATA')
  console.log('=' .repeat(50))
  
  let totalLoaded = 0
  
  for (const config of csvMappings) {
    console.log(`\n📂 Processing: ${config.file} → ${config.table}`)
    
    if (!fs.existsSync(config.file)) {
      console.log('❌ File not found:', config.file)
      continue
    }
    
    try {
      // Clear existing data first
      const { error: deleteError } = await supabase
        .from(config.table)
        .delete()
        .neq('id', 0)
      
      if (deleteError) {
        console.log('⚠️  Could not clear existing data:', deleteError.message)
      } else {
        console.log('🧹 Cleared existing data')
      }
      
      const content = fs.readFileSync(config.file, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        console.log('⚠️  Empty file')
        continue
      }
      
      const headers = parseCSVLine(lines[0])
      const dataLines = lines.slice(1).filter(line => line.trim())
      
      console.log(`📋 Headers: ${headers.length}`)
      console.log(`📊 Data rows: ${dataLines.length}`)
      
      // Process all rows
      const processedRows = []
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = parseCSVLine(dataLines[i])
          
          if (values.length === 0 || (values.length === 1 && values[0] === '')) {
            continue // Skip empty rows
          }
          
          const rowData = {}
          
          headers.forEach((header, index) => {
            const dbColumn = config.columnMap[header]
            if (dbColumn) {
              rowData[dbColumn] = cleanValue(values[index] || '')
            }
          })
          
          processedRows.push(rowData)
          successCount++
          
        } catch (parseError) {
          errorCount++
          if (errorCount <= 3) {
            console.log(`⚠️  Row ${i + 1} error: ${parseError.message}`)
          }
        }
      }
      
      console.log(`📊 Processed: ${successCount} success, ${errorCount} errors`)
      
      // Insert in batches
      if (processedRows.length > 0) {
        let insertedCount = 0
        const batchSize = 100
        
        for (let i = 0; i < processedRows.length; i += batchSize) {
          const batch = processedRows.slice(i, i + batchSize)
          
          try {
            const { data, error } = await supabase
              .from(config.table)
              .insert(batch)
              .select('id')
            
            if (error) {
              console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`)
              if (error.details) {
                console.error(`   Details: ${error.details}`)
              }
            } else {
              insertedCount += data.length
              console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} rows inserted`)
            }
            
          } catch (insertError) {
            console.error(`❌ Insert error: ${insertError.message}`)
          }
        }
        
        console.log(`🎉 ${config.table}: ${insertedCount}/${successCount} rows loaded`)
        totalLoaded += insertedCount
      }
      
    } catch (fileError) {
      console.error(`❌ File processing error: ${fileError.message}`)
    }
  }
  
  // Final verification
  console.log('\n🔍 VERIFICATION')
  console.log('=' .repeat(30))
  
  for (const config of csvMappings) {
    try {
      const { count, error } = await supabase
        .from(config.table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`✅ ${config.table}: ${count} records`)
      } else {
        console.log(`❌ ${config.table}: ${error.message}`)
      }
    } catch (verifyError) {
      console.log(`⚠️  ${config.table}: Could not verify`)
    }
  }
  
  console.log(`\n🎉 TOTAL LOADED: ${totalLoaded} campaigns across all platforms`)
  
  console.log('\n🎯 SUPABASE STUDIO ACCESS:')
  console.log('1. Refresh Studio: http://127.0.0.1:54323')
  console.log('2. Go to Table Editor')
  console.log('3. Check each table:')
  console.log('   • spotify_campaigns (should have ~2,149 records)')
  console.log('   • soundcloud_campaigns (should have ~1,981 records)')
  console.log('   • youtube_campaigns (should have ~820 records)')
  console.log('   • instagram_campaigns (should have ~161 records)')
  console.log('4. All with proper column names matching CSV headers!')
}

function cleanValue(value) {
  if (!value || value === 'undefined') return ''
  return String(value).trim().replace(/^"|"$/g, '').substring(0, 1000) // Increased limit
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

loadAllPlatformData().catch(error => {
  console.error('💥 CRITICAL ERROR:', error.message)
  process.exit(1)
})
