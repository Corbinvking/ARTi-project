#!/usr/bin/env node

/**
 * Load CSV data into separate platform tables
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
  }
]

async function loadCSVToSeparateTables() {
  console.log('📊 LOADING CSV TO SEPARATE TABLES')
  console.log('=' .repeat(40))
  
  // Just do Spotify first as a test
  const config = csvMappings[0]
  
  console.log(`\n📂 Loading: ${config.file} → ${config.table}`)
  
  if (!fs.existsSync(config.file)) {
    console.log('❌ File not found:', config.file)
    return
  }
  
  try {
    const content = fs.readFileSync(config.file, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      console.log('⚠️  Empty file')
      return
    }
    
    const headers = parseCSVLine(lines[0])
    const dataLines = lines.slice(1).filter(line => line.trim())
    
    console.log(`📋 Headers: ${headers.length}`)
    console.log(`📊 Data rows: ${dataLines.length}`)
    
    // Process first 5 rows as test
    const testRows = dataLines.slice(0, 5)
    const processedRows = []
    
    for (const line of testRows) {
      try {
        const values = parseCSVLine(line)
        const rowData = {}
        
        headers.forEach((header, index) => {
          const dbColumn = config.columnMap[header]
          if (dbColumn) {
            rowData[dbColumn] = (values[index] || '').substring(0, 500)
          }
        })
        
        processedRows.push(rowData)
      } catch (error) {
        console.log('⚠️  Row parse error:', error.message)
      }
    }
    
    console.log(`📊 Processed ${processedRows.length} test rows`)
    
    if (processedRows.length > 0) {
      const { data, error } = await supabase
        .from(config.table)
        .insert(processedRows)
        .select('id')
      
      if (error) {
        console.error('❌ Insert failed:', error.message)
        console.error('Details:', error.details)
      } else {
        console.log(`✅ Inserted ${data.length} test rows successfully!`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log('\n🎯 CHECK SUPABASE STUDIO:')
  console.log('1. Go to: http://127.0.0.1:54323')
  console.log('2. Table Editor → spotify_campaigns')
  console.log('3. You should see test data!')
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

loadCSVToSeparateTables().catch(console.error)
