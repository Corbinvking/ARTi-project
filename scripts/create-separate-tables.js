#!/usr/bin/env node

/**
 * Create separate tables for each CSV platform
 * Load data into platform-specific tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const csvConfigs = [
  {
    file: 'Spotify Playlisting-All Campaigns.csv',
    tableName: 'spotify_campaigns',
    columns: [
      'Campaign', 'Client', 'Goal', 'Salesperson', 'Remaining', 'Daily', 'Weekly', 
      'URL', 'Sale price', 'Start Date', 'Status', 'Invoice', 'Vendor', 'Paid Vendor?', 
      'Curator Status', 'Playlists', 'SFA', 'Notify Vendor?', 'Ask For SFA', 'Update Client', 
      'Client Email', 'Vendor Email', 'Notes', 'Last Modified', 'SP Vendor Updates', 
      'Spotify Campaign (from SP Vendor Updates)'
    ]
  },
  {
    file: 'SoundCloud-All Campaigns.csv',
    tableName: 'soundcloud_campaigns',
    columns: [
      'Track Info', 'Client', 'Service Type', 'Goal', 'Remaining', 'Status', 'URL', 
      'Submit Date', 'Start Date', 'Receipts', 'Salesperson', 'Invoice', 'Sale Price', 
      'Confirm Start Date?', 'Notes', 'Send Receipt(s)', 'Ask Client for Playlist', 
      'Last Modified', ' Salesperson Email'
    ]
  },
  {
    file: 'YouTube-All Campaigns.csv',
    tableName: 'youtube_campaigns',
    columns: [
      'Campaign', 'Clients', 'Service Type', 'Goal', 'Remaining', 'Desired Daily', 'URL', 
      'Start Date', 'Status', 'Confirm Start Date?', 'Ask for Access', 'Ask Client for YT SS', 
      'Views Stalled?', 'Paid R?', 'Sale Price', 'Invoice', 'Comments', 'In Fixer?', 'Client Notes'
    ]
  },
  {
    file: 'IG Seeding-All Campaigns.csv',
    tableName: 'instagram_campaigns',
    columns: [
      'Campaign', 'Clients', 'Start Date', 'Price', 'Spend', 'Remaining', 'Sound URL', 
      'Status', 'Tracker', 'Campaign Started', 'Send Tracker', 'Send Final Report', 
      'Invoice', 'Salespeople', 'Report Notes', 'Client Notes', 'Paid Ops?'
    ]
  }
]

async function createSeparateTables() {
  console.log('🏗️  CREATING SEPARATE TABLES FOR EACH CSV')
  console.log('=' .repeat(50))
  
  for (const config of csvConfigs) {
    console.log(`\n📋 Processing: ${config.tableName}`)
    
    // Step 1: Create table structure
    console.log('   🔨 Creating table structure...')
    
    // Generate column definitions
    const columnDefs = config.columns.map(col => {
      const cleanCol = col.trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/^_+|_+$/g, '')
      
      return `"${cleanCol}" TEXT`
    }).join(',\n      ')
    
    const createTableSQL = `
      DROP TABLE IF EXISTS ${config.tableName} CASCADE;
      
      CREATE TABLE ${config.tableName} (
        id SERIAL PRIMARY KEY,
        ${columnDefs},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Disable RLS so data is visible in Studio
      ALTER TABLE ${config.tableName} DISABLE ROW LEVEL SECURITY;
      
      -- Create basic indexes
      CREATE INDEX idx_${config.tableName}_created_at ON ${config.tableName}(created_at);
    `
    
    try {
      // Use direct PostgreSQL connection
      const { Client } = require('pg')
      const client = new Client({
        host: '127.0.0.1',
        port: 54322,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres'
      })
      
      await client.connect()
      await client.query(createTableSQL)
      await client.end()
      
      console.log('   ✅ Table created successfully')
      
    } catch (createError) {
      console.error(`   ❌ Table creation failed: ${createError.message}`)
      continue
    }
    
    // Step 2: Load CSV data
    console.log('   📊 Loading CSV data...')
    
    const filePath = path.join(process.cwd(), config.file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${config.file}`)
      continue
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        console.log('   ⚠️  Empty or invalid file')
        continue
      }
      
      // Parse header and data
      const headerLine = lines[0]
      const actualHeaders = parseCSVLine(headerLine)
      const dataLines = lines.slice(1).filter(line => line.trim())
      
      console.log(`   📋 Found ${actualHeaders.length} columns, ${dataLines.length} data rows`)
      
      // Process data rows
      const processedRows = []
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = parseCSVLine(dataLines[i])
          
          if (values.length === 0) continue
          
          // Create row object with cleaned column names
          const rowData = {}
          actualHeaders.forEach((header, index) => {
            const cleanCol = header.trim().toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-zA-Z0-9_]/g, '')
              .replace(/^_+|_+$/g, '')
            
            rowData[cleanCol] = (values[index] || '').substring(0, 500) // Limit length
          })
          
          processedRows.push(rowData)
          successCount++
          
        } catch (parseError) {
          errorCount++
        }
      }
      
      console.log(`   📊 Processed: ${successCount} success, ${errorCount} errors`)
      
      // Insert data in batches
      if (processedRows.length > 0) {
        let insertedCount = 0
        const batchSize = 100
        
        for (let i = 0; i < processedRows.length; i += batchSize) {
          const batch = processedRows.slice(i, i + batchSize)
          
          try {
            const { data, error } = await supabase
              .from(config.tableName)
              .insert(batch)
              .select('id')
            
            if (error) {
              console.error(`   ❌ Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`)
            } else {
              insertedCount += data.length
              console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} rows inserted`)
            }
            
          } catch (insertError) {
            console.error(`   ❌ Insert error: ${insertError.message}`)
          }
        }
        
        console.log(`   🎉 ${config.tableName}: ${insertedCount}/${successCount} rows loaded`)
      }
      
    } catch (fileError) {
      console.error(`   ❌ File processing error: ${fileError.message}`)
    }
  }
  
  // Final verification
  console.log('\n🔍 VERIFICATION')
  console.log('=' .repeat(30))
  
  for (const config of csvConfigs) {
    try {
      const { count, error } = await supabase
        .from(config.tableName)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`✅ ${config.tableName}: ${count} records`)
      } else {
        console.log(`❌ ${config.tableName}: ${error.message}`)
      }
    } catch (verifyError) {
      console.log(`⚠️  ${config.tableName}: Could not verify`)
    }
  }
  
  console.log('\n🎯 SUPABASE STUDIO ACCESS:')
  console.log('1. Refresh Studio: http://127.0.0.1:54323')
  console.log('2. Go to Table Editor')
  console.log('3. You should now see:')
  console.log('   • spotify_campaigns')
  console.log('   • soundcloud_campaigns') 
  console.log('   • youtube_campaigns')
  console.log('   • instagram_campaigns')
  console.log('4. Each table will have its original CSV structure!')
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

createSeparateTables().catch(error => {
  console.error('💥 CRITICAL ERROR:', error.message)
  process.exit(1)
})
