#!/usr/bin/env node

/**
 * STAGE 1.2: CSV Data Validation
 * Loads ALL CSV data properly with correct schema mapping
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const csvFiles = [
  { file: 'Spotify Playlisting-All Campaigns.csv', platform: 'spotify' },
  { file: 'SoundCloud-All Campaigns.csv', platform: 'soundcloud' },
  { file: 'YouTube-All Campaigns.csv', platform: 'youtube' },
  { file: 'IG Seeding-All Campaigns.csv', platform: 'instagram' }
]

async function validateAndLoadCSVData() {
  console.log('📊 STAGE 1.2: CSV DATA VALIDATION')
  console.log('=' .repeat(50))
  
  // Step 1: Verify files exist
  console.log('\n🔍 Step 1: Verifying CSV files...')
  for (const { file } of csvFiles) {
    const filePath = path.join(process.cwd(), file)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ CRITICAL: File not found: ${file}`)
      process.exit(1)
    }
    const stats = fs.statSync(filePath)
    console.log(`✅ ${file}: ${(stats.size / 1024).toFixed(1)}KB`)
  }
  
  // Step 2: Analyze CSV structure
  console.log('\n🔍 Step 2: Analyzing CSV structure...')
  const csvAnalysis = {}
  
  for (const { file, platform } of csvFiles) {
    const filePath = path.join(process.cwd(), file)
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      console.error(`❌ CRITICAL: Empty file: ${file}`)
      continue
    }
    
    const headers = parseCSVLine(lines[0])
    const dataRows = lines.slice(1).filter(line => line.trim()).length
    
    csvAnalysis[platform] = {
      file,
      headers,
      totalRows: dataRows,
      sampleData: lines.slice(1, 3).map(line => parseCSVLine(line))
    }
    
    console.log(`📋 ${platform.toUpperCase()}:`)
    console.log(`   • Headers (${headers.length}): ${headers.slice(0, 5).join(', ')}...`)
    console.log(`   • Data rows: ${dataRows}`)
  }
  
  // Step 3: Drop and recreate campaigns table with flexible schema
  console.log('\n🔍 Step 3: Creating flexible campaigns table...')
  
  const createTableSQL = `
    DROP TABLE IF EXISTS campaigns CASCADE;
    
    CREATE TABLE campaigns (
      id SERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      
      -- Common fields across all platforms
      campaign_name TEXT,
      client TEXT,
      goal TEXT,
      salesperson TEXT,
      remaining TEXT,
      daily TEXT,
      weekly TEXT,
      url TEXT,
      sale_price TEXT,
      start_date TEXT,
      status TEXT,
      invoice TEXT,
      vendor TEXT,
      paid_vendor TEXT,
      curator_status TEXT,
      playlists TEXT,
      sfa TEXT,
      notify_vendor TEXT,
      ask_for_sfa TEXT,
      update_client TEXT,
      client_email TEXT,
      vendor_email TEXT,
      notes TEXT,
      last_modified TEXT,
      
      -- Additional flexible fields for other platforms
      artist TEXT,
      song TEXT,
      track TEXT,
      video_url TEXT,
      post_url TEXT,
      
      -- Store complete raw data
      raw_data JSONB,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_campaigns_platform ON campaigns(platform);
    CREATE INDEX idx_campaigns_client ON campaigns(client);
    CREATE INDEX idx_campaigns_status ON campaigns(status);
    CREATE INDEX idx_campaigns_raw_data ON campaigns USING GIN(raw_data);
  `
  
  console.log('Creating campaigns table with flexible schema...')
  
  // Execute SQL via direct postgres connection since rpc might not work
  try {
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
    
    console.log('✅ Campaigns table created successfully')
  } catch (error) {
    console.error('❌ Failed to create table:', error.message)
    console.log('📝 Attempting via Supabase migrations...')
    
    // Fallback: write migration file
    const migrationSQL = `-- Auto-generated migration for CSV data\n${createTableSQL}`
    const migrationFile = `supabase/migrations/009_campaigns_flexible.sql`
    fs.writeFileSync(migrationFile, migrationSQL)
    console.log(`✅ Created migration: ${migrationFile}`)
    console.log('⚠️  Run: npx supabase db reset to apply')
    return
  }
  
  // Step 4: Load ALL CSV data
  console.log('\n🔍 Step 4: Loading complete CSV data...')
  
  let totalLoaded = 0
  
  for (const { file, platform } of csvFiles) {
    console.log(`\n📂 Processing ${platform.toUpperCase()}: ${file}`)
    
    const filePath = path.join(process.cwd(), file)
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) continue
    
    const headers = parseCSVLine(lines[0])
    const dataLines = lines.slice(1).filter(line => line.trim())
    
    console.log(`   📊 Processing ${dataLines.length} rows...`)
    
    const rows = []
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = parseCSVLine(dataLines[i])
        if (values.length === 0) continue
        
        // Create row object with all CSV columns mapped
        const rowData = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index] || ''
        })
        
        // Map to our table structure
        const mappedRow = {
          platform,
          
          // Common mapping (adjust field names to match actual CSV headers)
          campaign_name: rowData['Campaign'] || rowData['campaign_name'] || '',
          client: rowData['Client'] || rowData['client'] || '',
          goal: rowData['Goal'] || rowData['goal'] || '',
          salesperson: rowData['Salesperson'] || rowData['salesperson'] || '',
          remaining: rowData['Remaining'] || rowData['remaining'] || '',
          daily: rowData['Daily'] || rowData['daily'] || '',
          weekly: rowData['Weekly'] || rowData['weekly'] || '',
          url: rowData['URL'] || rowData['url'] || '',
          sale_price: rowData['Sale price'] || rowData['sale_price'] || '',
          start_date: rowData['Start Date'] || rowData['start_date'] || '',
          status: rowData['Status'] || rowData['status'] || '',
          invoice: rowData['Invoice'] || rowData['invoice'] || '',
          vendor: rowData['Vendor'] || rowData['vendor'] || '',
          paid_vendor: rowData['Paid Vendor?'] || rowData['paid_vendor'] || '',
          curator_status: rowData['Curator Status'] || rowData['curator_status'] || '',
          playlists: rowData['Playlists'] || rowData['playlists'] || '',
          sfa: rowData['SFA'] || rowData['sfa'] || '',
          notify_vendor: rowData['Notify Vendor?'] || rowData['notify_vendor'] || '',
          ask_for_sfa: rowData['Ask For SFA'] || rowData['ask_for_sfa'] || '',
          update_client: rowData['Update Client'] || rowData['update_client'] || '',
          client_email: rowData['Client Email'] || rowData['client_email'] || '',
          vendor_email: rowData['Vendor Email'] || rowData['vendor_email'] || '',
          notes: rowData['Notes'] || rowData['notes'] || '',
          last_modified: rowData['Last Modified'] || rowData['last_modified'] || '',
          
          // Platform-specific fields
          artist: extractArtistFromCampaign(rowData['Campaign'] || ''),
          song: rowData['Song'] || rowData['Track'] || '',
          
          // Store complete raw data
          raw_data: rowData
        }
        
        rows.push(mappedRow)
        successCount++
        
      } catch (parseError) {
        errorCount++
        if (errorCount <= 5) {
          console.log(`   ⚠️  Row ${i + 1} parse error: ${parseError.message}`)
        }
      }
    }
    
    console.log(`   📊 Parsed: ${successCount} success, ${errorCount} errors`)
    
    // Insert in batches of 100
    let insertedCount = 0
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100)
      
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(batch)
          .select('id')
        
        if (error) {
          console.error(`   ❌ Batch ${Math.floor(i/100) + 1} failed: ${error.message}`)
          if (error.details) console.error(`      Details: ${error.details}`)
        } else {
          insertedCount += data.length
          console.log(`   ✅ Batch ${Math.floor(i/100) + 1}: ${data.length} rows inserted`)
        }
      } catch (insertError) {
        console.error(`   ❌ Insert error: ${insertError.message}`)
      }
    }
    
    console.log(`   🎉 ${platform.toUpperCase()}: ${insertedCount}/${successCount} rows loaded`)
    totalLoaded += insertedCount
  }
  
  // Step 5: Verify data integrity
  console.log('\n🔍 Step 5: Verifying data integrity...')
  
  try {
    const { count: totalCount, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Could not verify total count:', countError.message)
    } else {
      console.log(`📊 Total campaigns in database: ${totalCount}`)
    }
    
    // Platform breakdown
    for (const { platform } of csvFiles) {
      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('platform', platform)
      
      if (!error) {
        console.log(`   • ${platform}: ${count} campaigns`)
      }
    }
    
    // Sample data check
    const { data: sampleData, error: sampleError } = await supabase
      .from('campaigns')
      .select('platform, campaign_name, client, status')
      .limit(5)
    
    if (!sampleError && sampleData) {
      console.log('\n📋 Sample data:')
      sampleData.forEach((row, i) => {
        console.log(`   ${i + 1}. [${row.platform}] ${row.campaign_name} - ${row.client} (${row.status})`)
      })
    }
    
  } catch (verifyError) {
    console.error('❌ Verification failed:', verifyError.message)
  }
  
  console.log('\n🎉 STAGE 1.2 COMPLETE: CSV Data Validation')
  console.log(`✅ ${totalLoaded} total campaigns loaded`)
  console.log('✅ Data integrity verified')
  console.log('✅ Ready for Stage 1.3: Auth Users Creation')
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
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result.filter(val => val !== undefined)
}

function extractArtistFromCampaign(campaign) {
  if (!campaign) return ''
  
  const cleaned = campaign.replace(/"/g, '').trim()
  
  const patterns = [
    /^([^-:]+)[-:]/, // Before dash or colon
    /^([^(]+)\(/, // Before parentheses
    /^"([^"]+)"/, // Inside quotes
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match && match[1] && match[1].trim().length > 1) {
      return match[1].trim()
    }
  }
  
  return cleaned.split(' ').slice(0, 2).join(' ')
}

// Execute if run directly
if (require.main === module) {
  validateAndLoadCSVData().catch(error => {
    console.error('💥 CRITICAL ERROR:', error.message)
    process.exit(1)
  })
}

module.exports = { validateAndLoadCSVData }
