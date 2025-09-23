#!/usr/bin/env node

/**
 * STAGE 1.2: Complete CSV Data Loading
 * Loads ALL data from all 4 CSV files with proper column mapping
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CSV file configurations with exact column mappings
const csvConfigs = [
  {
    file: 'Spotify Playlisting-All Campaigns.csv',
    platform: 'spotify',
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
    platform: 'soundcloud',
    columns: [
      'Track Info', 'Client', 'Service Type', 'Goal', 'Remaining', 'Status', 'URL', 
      'Submit Date', 'Start Date', 'Receipts', 'Salesperson', 'Invoice', 'Sale Price', 
      'Confirm Start Date?', 'Notes', 'Send Receipt(s)', 'Ask Client for Playlist', 
      'Last Modified', ' Salesperson Email'
    ]
  },
  {
    file: 'YouTube-All Campaigns.csv',
    platform: 'youtube',
    columns: [
      'Campaign', 'Clients', 'Service Type', 'Goal', 'Remaining', 'Desired Daily', 'URL', 
      'Start Date', 'Status', 'Confirm Start Date?', 'Ask for Access', 'Ask Client for YT SS', 
      'Views Stalled?', 'Paid R?', 'Sale Price', 'Invoice', 'Comments', 'In Fixer?', 'Client Notes'
    ]
  },
  {
    file: 'IG Seeding-All Campaigns.csv',
    platform: 'instagram',
    columns: [
      'Campaign', 'Clients', 'Start Date', 'Price', 'Spend', 'Remaining', 'Sound URL', 
      'Status', 'Tracker', 'Campaign Started', 'Send Tracker', 'Send Final Report', 
      'Invoice', 'Salespeople', 'Report Notes', 'Client Notes', 'Paid Ops?'
    ]
  }
]

async function loadAllCSVData() {
  console.log('📊 LOADING ALL CSV DATA')
  console.log('=' .repeat(60))
  
  let totalLoaded = 0
  let totalErrors = 0
  
  for (const config of csvConfigs) {
    console.log(`\n📂 Processing ${config.platform.toUpperCase()}: ${config.file}`)
    
    const filePath = path.join(process.cwd(), config.file)
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${config.file}`)
      continue
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        console.log(`⚠️  Empty or invalid file: ${config.file}`)
        continue
      }
      
      // Parse header and validate
      const headerLine = lines[0]
      const actualHeaders = parseCSVLine(headerLine)
      
      console.log(`   📋 Headers found: ${actualHeaders.length}`)
      console.log(`   📋 Expected: ${config.columns.length}`)
      
      // Process data lines
      const dataLines = lines.slice(1).filter(line => line.trim())
      console.log(`   📊 Data lines to process: ${dataLines.length}`)
      
      const processedRows = []
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = parseCSVLine(dataLines[i])
          
          if (values.length === 0 || (values.length === 1 && values[0] === '')) {
            continue // Skip empty rows
          }
          
          // Create raw data object
          const rawData = {}
          actualHeaders.forEach((header, index) => {
            rawData[header] = values[index] || ''
          })
          
          // Map to database columns based on platform
          const mappedRow = mapCSVRowToDatabase(rawData, config.platform)
          
          if (mappedRow) {
            processedRows.push(mappedRow)
            successCount++
          }
          
        } catch (parseError) {
          errorCount++
          if (errorCount <= 3) {
            console.log(`   ⚠️  Row ${i + 1} error: ${parseError.message.substring(0, 100)}`)
          }
        }
      }
      
      console.log(`   📊 Processed: ${successCount} success, ${errorCount} errors`)
      totalErrors += errorCount
      
      // Insert data in batches
      if (processedRows.length > 0) {
        let insertedCount = 0
        const batchSize = 50
        
        for (let i = 0; i < processedRows.length; i += batchSize) {
          const batch = processedRows.slice(i, i + batchSize)
          
          try {
            const { data, error } = await supabase
              .from('campaigns')
              .insert(batch)
              .select('id')
            
            if (error) {
              console.error(`   ❌ Batch ${Math.floor(i/batchSize) + 1} failed:`)
              console.error(`      ${error.message}`)
              if (error.details) {
                console.error(`      Details: ${error.details}`)
              }
              if (error.hint) {
                console.error(`      Hint: ${error.hint}`)
              }
            } else {
              insertedCount += data.length
              console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} rows inserted`)
            }
            
          } catch (insertError) {
            console.error(`   ❌ Insert error: ${insertError.message}`)
          }
        }
        
        console.log(`   🎉 ${config.platform.toUpperCase()}: ${insertedCount}/${successCount} rows loaded`)
        totalLoaded += insertedCount
      }
      
    } catch (fileError) {
      console.error(`❌ Failed to process ${config.file}: ${fileError.message}`)
    }
  }
  
  console.log('\n🔍 VERIFICATION')
  console.log('=' .repeat(30))
  
  // Verify total counts
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
    for (const config of csvConfigs) {
      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('platform', config.platform)
      
      if (!error) {
        console.log(`   • ${config.platform}: ${count} campaigns`)
      }
    }
    
    // Show sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('campaigns')
      .select('platform, campaign, track_info, client, clients, status')
      .limit(10)
    
    if (!sampleError && sampleData) {
      console.log('\n📋 Sample data loaded:')
      sampleData.forEach((row, i) => {
        const name = row.campaign || row.track_info || 'Unknown'
        const client = row.client || row.clients || 'Unknown'
        console.log(`   ${i + 1}. [${row.platform}] ${name.substring(0, 40)} - ${client} (${row.status || 'N/A'})`)
      })
    }
    
  } catch (verifyError) {
    console.error('❌ Verification failed:', verifyError.message)
  }
  
  console.log('\n🎉 CSV DATA LOADING COMPLETE!')
  console.log(`✅ ${totalLoaded} total campaigns loaded`)
  console.log(`⚠️  ${totalErrors} total parsing errors`)
  console.log('✅ Ready for Stage 1.3: Auth Users Creation')
}

function mapCSVRowToDatabase(rawData, platform) {
  const baseRow = {
    platform,
    raw_data: rawData
  }
  
  switch (platform) {
    case 'spotify':
      return {
        ...baseRow,
        campaign: cleanValue(rawData['Campaign']),
        client: cleanValue(rawData['Client']),
        goal: cleanValue(rawData['Goal']),
        salesperson: cleanValue(rawData['Salesperson']),
        remaining: cleanValue(rawData['Remaining']),
        daily: cleanValue(rawData['Daily']),
        weekly: cleanValue(rawData['Weekly']),
        url: cleanValue(rawData['URL']),
        sale_price: cleanValue(rawData['Sale price']),
        start_date: cleanValue(rawData['Start Date']),
        status: cleanValue(rawData['Status']),
        invoice: cleanValue(rawData['Invoice']),
        vendor: cleanValue(rawData['Vendor']),
        paid_vendor: cleanValue(rawData['Paid Vendor?']),
        curator_status: cleanValue(rawData['Curator Status']),
        playlists: cleanValue(rawData['Playlists']),
        sfa: cleanValue(rawData['SFA']),
        notify_vendor: cleanValue(rawData['Notify Vendor?']),
        ask_for_sfa: cleanValue(rawData['Ask For SFA']),
        update_client: cleanValue(rawData['Update Client']),
        client_email: cleanValue(rawData['Client Email']),
        vendor_email: cleanValue(rawData['Vendor Email']),
        notes: cleanValue(rawData['Notes']),
        last_modified: cleanValue(rawData['Last Modified']),
        sp_vendor_updates: cleanValue(rawData['SP Vendor Updates']),
        spotify_campaign_from_sp_vendor_updates: cleanValue(rawData['Spotify Campaign (from SP Vendor Updates)']),
        artist: extractArtist(rawData['Campaign'] || ''),
        song: extractSong(rawData['Campaign'] || '')
      }
      
    case 'soundcloud':
      return {
        ...baseRow,
        track_info: cleanValue(rawData['Track Info']),
        client: cleanValue(rawData['Client']),
        service_type: cleanValue(rawData['Service Type']),
        goal: cleanValue(rawData['Goal']),
        remaining: cleanValue(rawData['Remaining']),
        status: cleanValue(rawData['Status']),
        url: cleanValue(rawData['URL']),
        start_date: cleanValue(rawData['Start Date']),
        receipts: cleanValue(rawData['Receipts']),
        salesperson: cleanValue(rawData['Salesperson']),
        invoice: cleanValue(rawData['Invoice']),
        sale_price: cleanValue(rawData['Sale Price']),
        confirm_start_date: cleanValue(rawData['Confirm Start Date?']),
        notes: cleanValue(rawData['Notes']),
        send_receipts: cleanValue(rawData['Send Receipt(s)']),
        ask_client_for_playlist: cleanValue(rawData['Ask Client for Playlist']),
        last_modified: cleanValue(rawData['Last Modified']),
        salesperson_email: cleanValue(rawData[' Salesperson Email']),
        artist: extractArtist(rawData['Track Info'] || ''),
        song: extractSong(rawData['Track Info'] || '')
      }
      
    case 'youtube':
      return {
        ...baseRow,
        campaign: cleanValue(rawData['Campaign']),
        clients: cleanValue(rawData['Clients']),
        service_type: cleanValue(rawData['Service Type']),
        goal: cleanValue(rawData['Goal']),
        remaining: cleanValue(rawData['Remaining']),
        desired_daily: cleanValue(rawData['Desired Daily']),
        url: cleanValue(rawData['URL']),
        start_date: cleanValue(rawData['Start Date']),
        status: cleanValue(rawData['Status']),
        confirm_start_date: cleanValue(rawData['Confirm Start Date?']),
        ask_for_access: cleanValue(rawData['Ask for Access']),
        ask_client_for_yt_ss: cleanValue(rawData['Ask Client for YT SS']),
        views_stalled: cleanValue(rawData['Views Stalled?']),
        paid_r: cleanValue(rawData['Paid R?']),
        sale_price: cleanValue(rawData['Sale Price']),
        invoice: cleanValue(rawData['Invoice']),
        comments: cleanValue(rawData['Comments']),
        in_fixer: cleanValue(rawData['In Fixer?']),
        client_notes: cleanValue(rawData['Client Notes']),
        artist: extractArtist(rawData['Campaign'] || ''),
        song: extractSong(rawData['Campaign'] || '')
      }
      
    case 'instagram':
      return {
        ...baseRow,
        campaign: cleanValue(rawData['Campaign']),
        clients: cleanValue(rawData['Clients']),
        start_date: cleanValue(rawData['Start Date']),
        price: cleanValue(rawData['Price']),
        spend: cleanValue(rawData['Spend']),
        remaining: cleanValue(rawData['Remaining']),
        sound_url: cleanValue(rawData['Sound URL']),
        status: cleanValue(rawData['Status']),
        tracker: cleanValue(rawData['Tracker']),
        campaign_started: cleanValue(rawData['Campaign Started']),
        send_tracker: cleanValue(rawData['Send Tracker']),
        send_final_report: cleanValue(rawData['Send Final Report']),
        invoice: cleanValue(rawData['Invoice']),
        salespeople: cleanValue(rawData['Salespeople']),
        report_notes: cleanValue(rawData['Report Notes']),
        client_notes: cleanValue(rawData['Client Notes']),
        paid_ops: cleanValue(rawData['Paid Ops?']),
        artist: extractArtist(rawData['Campaign'] || ''),
        song: extractSong(rawData['Campaign'] || '')
      }
      
    default:
      return null
  }
}

function cleanValue(value) {
  if (!value || value === 'undefined') return ''
  return String(value).trim().replace(/^"|"$/g, '').substring(0, 500) // Limit length
}

function extractArtist(text) {
  if (!text) return ''
  
  // Clean the text first
  const cleaned = text.replace(/^"|"$/g, '').trim()
  
  // Common patterns for artist extraction
  const patterns = [
    /^([^-–]+)\s*[-–]\s*/, // Artist - Song
    /^([^:]+):\s*/, // Artist: Song
    /^([^(]+)\s*\(/, // Artist (something)
    /^([^,]+),/, // Artist, something
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      const artist = match[1].trim()
      if (artist.length > 1 && artist.length < 100) {
        return artist
      }
    }
  }
  
  // Fallback: take first few words
  const words = cleaned.split(/\s+/)
  if (words.length >= 2) {
    return words.slice(0, 2).join(' ')
  }
  
  return cleaned.substring(0, 50)
}

function extractSong(text) {
  if (!text) return ''
  
  const cleaned = text.replace(/^"|"$/g, '').trim()
  
  // Extract song after common separators
  const patterns = [
    /[-–]\s*(.+)$/, // After dash
    /:\s*(.+)$/, // After colon
    /\(([^)]+)\)/, // In parentheses (if no dash/colon)
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      const song = match[1].trim().replace(/\(.*?\)/g, '').trim()
      if (song.length > 1 && song.length < 100) {
        return song
      }
    }
  }
  
  return ''
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

// Execute if run directly
if (require.main === module) {
  loadAllCSVData().catch(error => {
    console.error('💥 CRITICAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  })
}

module.exports = { loadAllCSVData }
