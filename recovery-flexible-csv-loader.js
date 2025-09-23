// Flexible CSV loader that adapts to actual CSV structure
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function loadFlexibleCSV() {
  console.log('🚨 FLEXIBLE CSV RECOVERY - Analyzing and loading data...')
  
  // Create a generic campaigns table to hold all data
  console.log('📋 Creating unified campaigns table...')
  
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      DROP TABLE IF EXISTS campaigns;
      CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        platform TEXT,
        campaign_name TEXT,
        client TEXT,
        artist TEXT,
        song TEXT,
        url TEXT,
        status TEXT,
        goal TEXT,
        start_date TEXT,
        salesperson TEXT,
        notes TEXT,
        raw_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  })
  
  if (createError) {
    console.error('❌ Failed to create campaigns table:', createError.message)
    return
  }
  
  console.log('✅ Created unified campaigns table')
  
  const csvFiles = [
    { file: 'Spotify Playlisting-All Campaigns.csv', platform: 'spotify' },
    { file: 'SoundCloud-All Campaigns.csv', platform: 'soundcloud' },
    { file: 'YouTube-All Campaigns.csv', platform: 'youtube' },
    { file: 'IG Seeding-All Campaigns.csv', platform: 'instagram' }
  ]
  
  for (const { file, platform } of csvFiles) {
    const filePath = path.join(__dirname, file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`)
      continue
    }
    
    console.log(`\n📂 Processing: ${file}`)
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        console.log('   ⚠️  Empty file')
        continue
      }
      
      // Parse header
      const headerLine = lines[0]
      const headers = parseCSVLine(headerLine)
      console.log(`   📊 Found ${headers.length} columns: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`)
      
      const rows = []
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        try {
          const values = parseCSVLine(line)
          if (values.length > 0) {
            const row = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            
            // Extract common fields
            const mappedRow = {
              platform,
              campaign_name: row['Campaign'] || row['campaign_name'] || '',
              client: row['Client'] || row['client'] || '',
              artist: row['Artist'] || row['artist'] || extractArtistFromCampaign(row['Campaign'] || ''),
              song: row['Song'] || row['song'] || row['Track'] || '',
              url: row['URL'] || row['url'] || row['Link'] || '',
              status: row['Status'] || row['status'] || '',
              goal: row['Goal'] || row['goal'] || '',
              start_date: row['Start Date'] || row['start_date'] || '',
              salesperson: row['Salesperson'] || row['salesperson'] || '',
              notes: row['Notes'] || row['notes'] || '',
              raw_data: row
            }
            
            rows.push(mappedRow)
          }
        } catch (parseError) {
          // Skip problematic rows
          continue
        }
      }
      
      console.log(`   📊 Parsed ${rows.length} valid rows`)
      
      if (rows.length > 0) {
        // Insert in batches
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50)
          const { error } = await supabase.from('campaigns').insert(batch)
          
          if (error) {
            console.error(`   ❌ Batch ${Math.floor(i/50) + 1} failed: ${error.message}`)
          } else {
            console.log(`   ✅ Batch ${Math.floor(i/50) + 1} loaded (${batch.length} rows)`)
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${file}: ${error.message}`)
    }
  }
  
  // Verify final counts
  console.log('\n🎉 CSV RECOVERY COMPLETE!')
  
  try {
    const { count, error } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
    
    if (!error) {
      console.log(`📋 Total campaigns loaded: ${count}`)
      
      // Show breakdown by platform
      for (const platform of ['spotify', 'soundcloud', 'youtube', 'instagram']) {
        const { count: platformCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('platform', platform)
        
        console.log(`   • ${platform}: ${platformCount || 0} campaigns`)
      }
    }
  } catch (err) {
    console.log('⚠️  Could not verify final counts')
  }
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
        i++ // Skip next quote
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
  return result
}

function extractArtistFromCampaign(campaign) {
  // Try to extract artist name from campaign string
  if (!campaign) return ''
  
  // Look for patterns like "Artist - Song" or "Artist: Song"
  const patterns = [
    /^"([^"]+)"/,  // Extract from quotes
    /^([^-:]+)[-:]/, // Extract before dash or colon
    /\(([^)]+)\)/, // Extract from parentheses
  ]
  
  for (const pattern of patterns) {
    const match = campaign.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return ''
}

loadFlexibleCSV().catch(console.error)
