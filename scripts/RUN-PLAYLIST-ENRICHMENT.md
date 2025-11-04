# Quick Start: Playlist Enrichment

## Local Development

```bash
# 1. Navigate to project root
cd C:\Users\Admin\Desktop\ARTi-project

# 2. Make sure your CSV is in the root directory
# File should be named: "Spotify Playlisting-Active Campaigns (1).csv"

# 3. Set environment variables (or use .env file)
$env:SUPABASE_URL="http://localhost:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$env:SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
$env:SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"

# 4. Run the database migration
npx supabase migration up

# 5. Run the enrichment script
npx tsx scripts/enrich-campaign-playlists.ts
```

## Production (DigitalOcean)

```bash
# 1. SSH into your droplet
ssh root@157.230.82.234

# 2. Navigate to project directory
cd ~/arti-marketing-ops

# 3. Pull latest code
git pull origin main

# 4. Set environment variables
export SUPABASE_URL="http://kong:8000"
export SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"

# 5. Upload CSV if needed (from your local machine)
# scp "Spotify Playlisting-Active Campaigns (1).csv" root@157.230.82.234:/root/arti-marketing-ops/

# 6. Run migration
npx supabase migration up

# 7. Run enrichment
npx tsx scripts/enrich-campaign-playlists.ts
```

## What the Script Does

1. ✅ Reads your CSV file
2. ✅ Finds all Spotify playlist URLs in the "SP Playlist Stuff" column
3. ✅ Calls Spotify Web API to get:
   - Playlist name
   - Follower count
   - Track count
   - Description
   - Owner name
4. ✅ Updates or creates entries in the `playlists` table
5. ✅ Links playlists to campaigns in `campaign_playlists` table
6. ✅ Associates playlists with vendors

## Expected Output

```
🚀 Starting campaign-playlist enrichment from CSV...

📄 Reading CSV from: /path/to/Spotify Playlisting-Active Campaigns (1).csv
📊 Found 653 campaigns in CSV

============================================================
📌 Campaign: Segan - Lost Ya Mind
🏢 Vendor: Club Restricted
🎵 Found 4 playlist(s) for this campaign

  Processing playlist: 3zOnEjdz7EFZaibEDHhT72
    ✅ house bangers
    👥 1,234,567 followers
    📀 350 tracks
    🔄 Updated existing playlist
    🔗 Linked to campaign

[... continues for all campaigns ...]

============================================================
📈 ENRICHMENT SUMMARY
============================================================
📋 Campaigns processed:   653
🎵 Playlists enriched:    892
➕ Playlists created:     45
🔗 Campaign links created: 2,145
❌ Failed:                12
============================================================

✅ Enrichment complete!
```

## Verification

After running, verify the data:

```sql
-- Check enriched playlists
SELECT 
  name, 
  follower_count, 
  track_count,
  owner_name,
  last_enriched_at
FROM playlists
WHERE last_enriched_at IS NOT NULL
ORDER BY follower_count DESC
LIMIT 10;

-- Check campaign-playlist links
SELECT 
  cp.playlist_name,
  cp.playlist_follower_count,
  sc.campaign_name,
  v.name as vendor_name
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
LEFT JOIN vendors v ON cp.vendor_id = v.id
WHERE cp.playlist_follower_count IS NOT NULL
LIMIT 10;
```

## Troubleshooting

### Script can't find CSV file
```bash
# Make sure the CSV is in the project root
ls -la "Spotify Playlisting-Active Campaigns (1).csv"

# If not, copy it there
cp /path/to/csv/file.csv "Spotify Playlisting-Active Campaigns (1).csv"
```

### Authentication errors
```bash
# Verify environment variables are set
echo $SPOTIFY_CLIENT_ID
echo $SPOTIFY_CLIENT_SECRET

# Re-export if needed
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"
```

### Database connection issues
```bash
# Local: Make sure Supabase is running
npx supabase status

# Production: Check if containers are running
docker ps | grep supabase

# Test database connection
npx supabase db ping
```

## Schedule Automatic Updates

To keep follower counts fresh, set up a weekly cron job:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 2 AM)
0 2 * * 0 cd /root/arti-marketing-ops && /usr/local/bin/npx tsx scripts/enrich-campaign-playlists.ts >> /var/log/playlist-enrichment.log 2>&1
```

View logs:
```bash
tail -f /var/log/playlist-enrichment.log
```

## Manual API Testing

Test individual playlists without running the full script:

```bash
# Fetch single playlist
curl http://localhost:3001/api/spotify-web-api/playlist/3zOnEjdz7EFZaibEDHhT72

# Extract Spotify ID from URL
curl "http://localhost:3001/api/spotify-web-api/extract-id?url=https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72&type=playlist"
```

## Next Steps

1. Run the enrichment script
2. Check the database for populated follower counts
3. Update your UI components to display the enriched data
4. Set up automated weekly refreshes
5. Use follower data in analytics queries

---

**Questions?** Check `SPOTIFY-PLAYLIST-ENRICHMENT.md` for full documentation.

