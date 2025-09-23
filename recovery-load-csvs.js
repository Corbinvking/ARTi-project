// Emergency CSV data recovery script
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const csvFiles = [
  'Spotify Playlisting-All Campaigns.csv',
  'SoundCloud-All Campaigns.csv', 
  'YouTube-All Campaigns.csv',
  'IG Seeding-All Campaigns.csv'
]

const platformTableMap = {
  'Spotify Playlisting-All Campaigns.csv': 'spotify_campaigns',
  'SoundCloud-All Campaigns.csv': 'soundcloud_campaigns',
  'YouTube-All Campaigns.csv': 'youtube_campaigns', 
  'IG Seeding-All Campaigns.csv': 'instagram_campaigns'
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    if (values.length === headers.length) {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      rows.push(row)
    }
  }
  
  return rows
}

async function createPlatformTables() {
  console.log('📋 Creating platform tables...')
  
  const tables = [
    { 
      name: 'spotify_campaigns',
      sql: `CREATE TABLE IF NOT EXISTS spotify_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name TEXT,
        artist TEXT,
        song TEXT,
        playlist TEXT,
        platform TEXT DEFAULT 'spotify',
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'soundcloud_campaigns', 
      sql: `CREATE TABLE IF NOT EXISTS soundcloud_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name TEXT,
        artist TEXT,
        song TEXT,
        track_url TEXT,
        platform TEXT DEFAULT 'soundcloud',
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'youtube_campaigns',
      sql: `CREATE TABLE IF NOT EXISTS youtube_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name TEXT,
        artist TEXT,
        song TEXT,
        video_url TEXT,
        platform TEXT DEFAULT 'youtube',
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'instagram_campaigns',
      sql: `CREATE TABLE IF NOT EXISTS instagram_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name TEXT,
        artist TEXT,
        song TEXT,
        post_url TEXT,
        platform TEXT DEFAULT 'instagram',
        created_at TIMESTAMP DEFAULT NOW()
      )`
    }
  ]
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
      if (error) {
        console.log(`⚠️  Table ${table.name} might already exist`)
      } else {
        console.log(`✅ Created table: ${table.name}`)
      }
    } catch (err) {
      console.log(`⚠️  Table ${table.name}: ${err.message}`)
    }
  }
}

async function loadCSVs() {
  console.log('🚨 EMERGENCY CSV RECOVERY - Loading campaign data...')
  
  await createPlatformTables()
  
  for (const csvFile of csvFiles) {
    const filePath = path.join(__dirname, csvFile)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${csvFile}`)
      continue
    }
    
    console.log(`\n📂 Loading: ${csvFile}`)
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const data = parseCSV(content)
      const tableName = platformTableMap[csvFile]
      
      console.log(`   📊 Parsed ${data.length} rows`)
      
      if (data.length > 0) {
        // Clear existing data
        await supabase.from(tableName).delete().neq('id', 0)
        
        // Insert new data in batches
        for (let i = 0; i < data.length; i += 100) {
          const batch = data.slice(i, i + 100)
          const { error } = await supabase.from(tableName).insert(batch)
          
          if (error) {
            console.error(`   ❌ Batch ${Math.floor(i/100) + 1} failed: ${error.message}`)
          } else {
            console.log(`   ✅ Batch ${Math.floor(i/100) + 1} loaded (${batch.length} rows)`)
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to load ${csvFile}: ${error.message}`)
    }
  }
  
  console.log('\n🎉 CSV RECOVERY COMPLETE!')
  
  // Verify data loaded
  for (const csvFile of csvFiles) {
    const tableName = platformTableMap[csvFile]
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`   📋 ${tableName}: ${count} records`)
      }
    } catch (err) {
      console.log(`   ⚠️  ${tableName}: Could not verify`)
    }
  }
}

loadCSVs().catch(console.error)
