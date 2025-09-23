// Simple CSV loader for existing campaigns table
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function loadSimpleCSV() {
  console.log('🚨 SIMPLE CSV RECOVERY - Loading campaign data...')
  
  const csvFiles = [
    { file: 'Spotify Playlisting-All Campaigns.csv', platform: 'spotify' },
    { file: 'SoundCloud-All Campaigns.csv', platform: 'soundcloud' },
    { file: 'YouTube-All Campaigns.csv', platform: 'youtube' },
    { file: 'IG Seeding-All Campaigns.csv', platform: 'instagram' }
  ]
  
  let totalLoaded = 0
  
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
      
      if (lines.length < 2) {
        console.log('   ⚠️  Empty or invalid file')
        continue
      }
      
      // Get first few valid data rows for testing
      const sampleRows = []
      for (let i = 1; i < Math.min(6, lines.length); i++) {
        const line = lines[i].trim()
        if (line) {
          // Basic parsing - just take first few columns
          const parts = line.split(',')
          if (parts.length > 0) {
            sampleRows.push({
              platform,
              campaign_name: parts[0] ? parts[0].replace(/"/g, '').substring(0, 200) : '',
              client: parts[1] ? parts[1].replace(/"/g, '').substring(0, 100) : '',
              artist: extractArtistFromName(parts[0] || ''),
              raw_data: { original_line: line.substring(0, 500) }
            })
          }
        }
      }
      
      console.log(`   📊 Prepared ${sampleRows.length} sample rows`)
      
      if (sampleRows.length > 0) {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(sampleRows)
          .select()
        
        if (error) {
          console.error(`   ❌ Failed: ${error.message}`)
        } else {
          console.log(`   ✅ Loaded ${data.length} rows from ${platform}`)
          totalLoaded += data.length
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${file}: ${error.message}`)
    }
  }
  
  console.log(`\n🎉 CSV RECOVERY COMPLETE! Loaded ${totalLoaded} sample campaigns`)
  
  // Verify final counts
  try {
    const { count, error } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
    
    if (!error) {
      console.log(`📋 Total campaigns in database: ${count}`)
    }
  } catch (err) {
    console.log('⚠️  Could not verify final counts')
  }
}

function extractArtistFromName(name) {
  if (!name) return ''
  
  // Clean up the name
  const cleaned = name.replace(/"/g, '').trim()
  
  // Look for artist patterns
  const patterns = [
    /^([^-:]+)[-:]/, // Before dash or colon
    /^([^(]+)\(/, // Before parentheses
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      return match[1].trim().substring(0, 100)
    }
  }
  
  // Fallback - just take first part
  return cleaned.split(' ').slice(0, 3).join(' ').substring(0, 100)
}

loadSimpleCSV().catch(console.error)
