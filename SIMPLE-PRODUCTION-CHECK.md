# Simple Production Playlist Check

## Run these commands on production server

```bash
# SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Check if playlist data exists at all
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campaign_playlists;"

# Check specifically for Segan campaign
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    cp.id,
    cp.playlist_name,
    cp.streams_28d,
    cp.is_algorithmic,
    sc.campaign as song_name
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
WHERE sc.campaign LIKE '%Segan%DNBMF%'
LIMIT 10;
"
```

## Expected Result
- You should see 7-10 playlists for the Segan - DNBMF campaign
- If you see 0 rows, the data was never imported

## If No Data Found
The playlist data import likely failed. Run:

```bash
cd /root/arti-marketing-ops

# Set environment variables
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d '=' -f2)

# Run the import
node scripts/populate-playlist-vendor-data-v2.js
```

This will:
1. Read all scraped JSON files from `spotify_scraper/data/`
2. Extract playlist data
3. Link playlists to campaigns via track ID
4. Insert into `campaign_playlists` table

