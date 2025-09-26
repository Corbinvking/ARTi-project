# Setup Structured Scraper Tables

## 🎯 Goal
Create structured tables to organize your Spotify scraper data into queryable, organized tables instead of raw JSON blocks.

## 📋 Step-by-Step Setup

### 1. Open Supabase Studio
- Go to: http://localhost:54323
- You should see the Supabase Studio interface

### 2. Create Tables
In the Supabase Studio, go to **Table Editor** and create these 4 tables:

#### Table 1: `scraping_jobs`
```sql
CREATE TABLE scraping_jobs (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    job_id TEXT UNIQUE NOT NULL,
    song_id TEXT NOT NULL,
    song_url TEXT NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_playlists INTEGER DEFAULT 0,
    total_streams BIGINT DEFAULT 0,
    time_ranges TEXT[] DEFAULT '{}',
    raw_file TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table 2: `scraped_songs`
```sql
CREATE TABLE scraped_songs (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    job_id TEXT REFERENCES scraping_jobs(job_id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_url TEXT NOT NULL,
    time_range TEXT NOT NULL CHECK (time_range IN ('28day', '7day', '12months')),
    total_playlists INTEGER DEFAULT 0,
    total_streams BIGINT DEFAULT 0,
    scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table 3: `scraped_playlists`
```sql
CREATE TABLE scraped_playlists (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    job_id TEXT REFERENCES scraping_jobs(job_id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    time_range TEXT NOT NULL CHECK (time_range IN ('28day', '7day', '12months')),
    rank INTEGER NOT NULL,
    playlist_name TEXT NOT NULL,
    made_by TEXT DEFAULT 'Unknown',
    streams BIGINT DEFAULT 0,
    date_added TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table 4: `scraped_streams`
```sql
CREATE TABLE scraped_streams (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    job_id TEXT REFERENCES scraping_jobs(job_id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    time_range TEXT NOT NULL CHECK (time_range IN ('28day', '7day', '12months')),
    playlist_rank INTEGER NOT NULL,
    playlist_name TEXT NOT NULL,
    stream_count BIGINT DEFAULT 0,
    date_added TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. How to Create Tables in Supabase Studio

1. **Go to Table Editor** in the left sidebar
2. **Click "New Table"**
3. **Enter table name** (e.g., `scraping_jobs`)
4. **Click "Save"**
5. **Add columns** by clicking "Add Column" for each field
6. **Set column types** (SERIAL, UUID, TEXT, INTEGER, BIGINT, TIMESTAMP WITH TIME ZONE, TEXT[])
7. **Set constraints** (PRIMARY KEY, FOREIGN KEY, CHECK, DEFAULT)
8. **Repeat for all 4 tables**

### 4. Alternative: Use SQL Editor

1. **Go to SQL Editor** in the left sidebar
2. **Click "New Query"**
3. **Paste the SQL** for each table
4. **Click "Run"**

### 5. Test the Setup

Once tables are created, run:

```bash
# Parse your existing scraper data
node scripts/parse-scraper-data.js

# View the structured data
node scripts/view-scraper-data.js
```

## 🎉 What You'll Get

After setup, your scraper data will be organized into:

- **`scraping_jobs`** - Each scraping job with metadata and totals
- **`scraped_songs`** - Song performance per time range (28-day, 7-day, 12-month)
- **`scraped_playlists`** - Individual playlist data with stream counts and rankings
- **`scraped_streams`** - Detailed stream data per playlist per time range

## 📊 Benefits

- **Clear data organization** - Each scraping job becomes its own organized dataset
- **Easy querying** - Structured tables make it simple to analyze data
- **Performance metrics** - Rankings, totals, and comparisons across time ranges
- **Playlist insights** - See which playlists are most effective
- **Stream analytics** - Detailed stream data per playlist per time period

## 🚀 Next Steps

1. Create the 4 tables in Supabase Studio
2. Run the parser to populate them with your existing data
3. Use the viewer to explore your structured data
4. Run custom queries to analyze your Spotify data

Your scraper will now produce **beautifully organized, queryable data** instead of raw JSON blocks!
