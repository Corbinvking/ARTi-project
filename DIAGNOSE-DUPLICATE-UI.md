# Diagnose Duplicate Playlist UI Elements

## Problem
The "Segan - DNBMF" campaign shows duplicate playlist cards with different stream counts:
- "Your DJ" appears twice (474 streams and 35 streams)
- "Daylist" appears twice (both showing 9 streams)
- Other playlists are also duplicated

## Likely Causes

### 1. **Multiple Scraping Runs**
The scraper ran multiple times and created duplicate entries for the same playlist with different stream counts (from different time periods).

### 2. **Data Import Issue**
The `populate-playlist-vendor-data-v2.js` script may have inserted duplicates instead of updating existing records.

### 3. **Track ID Mismatch**
Different scraped files for the same song created separate playlist records.

## Diagnostic Steps

### On Production

```bash
# SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Pull latest diagnostic
git pull origin main

# Check for duplicates
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < CHECK-DUPLICATE-PLAYLISTS.sql
```

## What To Look For

The output will show:
1. **All playlist records** with their stream counts and timestamps
2. **Duplicate playlist names** with their stream values
3. **Summary** showing total records vs unique playlist names

## Expected Issues

### If you see duplicates like:
```
playlist_name | duplicate_count | stream_values | playlist_ids
Your DJ       | 2              | 474, 35       | abc123, def456
Daylist       | 2              | 9, 9          | ghi789, jkl012
```

This means the same playlist was inserted multiple times.

## Solution Options

### Option A: Keep Latest (Most Recent Scrape)
Keep only the most recently scraped entry for each playlist.

### Option B: Keep Highest Streams
Keep the entry with the highest stream count for each playlist.

### Option C: Merge Data
Combine duplicate entries, keeping the latest timestamp and highest stream count.

## After Diagnosis

Share the output and I'll create a fix script to:
1. Identify all duplicates
2. Choose which record to keep (based on criteria)
3. Delete duplicate records
4. Update the UI to show clean data

