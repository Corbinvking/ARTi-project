# Spotify Playlist Enrichment Guide

This guide explains how to enrich your playlist data using the Spotify Web API to pull follower counts, track counts, descriptions, and other metadata.

## Overview

The enrichment system:
1. Reads playlist URLs from your CSV data ("SP Playlist Stuff" column)
2. Extracts Spotify playlist IDs
3. Fetches metadata from Spotify Web API
4. Populates the database with follower counts, descriptions, owner info, etc.
5. Links playlists to campaigns in the `campaign_playlists` table

## Data Flow

```
CSV File (SP Playlist Stuff column)
    ↓
Extract Playlist URLs & IDs
    ↓
Spotify Web API Request
    ↓
Database Update (playlists & campaign_playlists tables)
    ↓
UI Display (Campaign cards, Vendor portal, Analytics)
```

## Database Schema

### `playlists` Table
Stores aggregated playlist data for each vendor:

```sql
- id (uuid)
- vendor_id (uuid) -- Which vendor owns this playlist
- name (text) -- Playlist name from Spotify
- url (text) -- Full Spotify URL
- spotify_id (varchar) -- Base62 Spotify ID (22 chars)
- follower_count (integer) -- Follower count from Spotify API
- track_count (integer) -- Number of tracks
- description (text) -- Playlist description
- owner_name (text) -- Playlist owner display name
- is_algorithmic (boolean) -- TRUE for Spotify algorithmic playlists
- genres (text[]) -- Array of genres
- avg_daily_streams (integer) -- Calculated from campaign_playlists
- last_enriched_at (timestamp) -- Last time metadata was fetched
- created_at, updated_at (timestamp)
```

### `campaign_playlists` Table
Links specific campaigns to playlists with performance metrics:

```sql
- id (uuid)
- campaign_id (integer) -- Reference to spotify_campaigns
- vendor_id (uuid) -- Which vendor placed this campaign
- playlist_name (text)
- playlist_curator (text) -- e.g., "Spotify", curator name
- playlist_url (text) -- Full Spotify URL
- playlist_spotify_id (varchar) -- Base62 ID
- playlist_follower_count (integer) -- Followers at time of placement
- playlist_description (text)
- playlist_owner (text)
- playlist_track_count (integer)
- streams_7d, streams_28d, streams_12m (integer) -- Performance metrics
- date_added (text) -- When song was added to playlist
- last_scraped (timestamp)
- created_at, updated_at (timestamp)
```

## Setup

### 1. Environment Variables

Make sure you have Spotify API credentials set in your environment:

```bash
# .env or environment variables
SPOTIFY_CLIENT_ID=294f0422469444b5b4b0178ce438b5b8
SPOTIFY_CLIENT_SECRET=7320687e4ceb475b82c2f3a543eb2f9e
```

These are already configured in:
- `apps/api/production.env` (production)
- `apps/api/.env` (local development)

### 2. Run Database Migration

Apply the migration to add metadata columns:

```bash
# Local Supabase
npx supabase migration up --db-url "postgresql://postgres:postgres@localhost:54322/postgres"

# Production
npx supabase migration up --db-url "$PRODUCTION_DB_URL"
```

The migration file is: `supabase/migrations/999_add_playlist_metadata_columns.sql`

## Usage

### Method 1: Automated Script (Recommended)

Use the enrichment script to process your CSV file:

```bash
# Set environment variables
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"

# Run the enrichment script
npx tsx scripts/enrich-campaign-playlists.ts
```

This script will:
- ✅ Read all campaigns from your CSV
- ✅ Extract playlist URLs from "SP Playlist Stuff" column
- ✅ Fetch metadata from Spotify for each playlist
- ✅ Create/update entries in the `playlists` table
- ✅ Link playlists to campaigns in `campaign_playlists` table
- ✅ Associate playlists with vendors

**Output Example:**
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

============================================================
📈 ENRICHMENT SUMMARY
============================================================
📋 Campaigns processed:   653
🎵 Playlists enriched:    892
➕ Playlists created:     45
🔗 Campaign links created: 2,145
❌ Failed:                12
============================================================
```

### Method 2: API Endpoints

Use the REST API to enrich playlists programmatically:

#### Enrich Single Playlist

```bash
curl http://localhost:3001/api/spotify-web-api/playlist/3zOnEjdz7EFZaibEDHhT72
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "3zOnEjdz7EFZaibEDHhT72",
    "name": "house bangers",
    "description": "The best house music tracks",
    "followers": 1234567,
    "track_count": 350,
    "owner": "ClubRestrictedOfficial"
  }
}
```

#### Bulk Enrich Playlists

```bash
curl -X POST http://localhost:3001/api/spotify-web-api/enrich-playlists \
  -H "Content-Type: application/json" \
  -d '{
    "playlist_urls": [
      "https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72",
      "https://open.spotify.com/playlist/5quud9tyyGwkmk2vgLK1Vd",
      "https://open.spotify.com/playlist/1MAGl3BMI56FXHTWAwK1c8"
    ]
  }'
```

Response:
```json
{
  "status": "completed",
  "success_count": 3,
  "failed_count": 0,
  "details": [
    {
      "url": "https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72",
      "name": "house bangers",
      "followers": 1234567
    },
    ...
  ]
}
```

## CSV Structure

The script reads the **"SP Playlist Stuff"** column from your CSV:

```csv
Campaign,Client,Vendor,SP Playlist Stuff
"Segan - Lost Ya Mind","Segan","Club Restricted","https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72
https://open.spotify.com/playlist/5quud9tyyGwkmk2vgLK1Vd
https://open.spotify.com/playlist/1MAGl3BMI56FXHTWAwK1c8"
```

The script handles:
- ✅ Multiple URLs separated by newlines
- ✅ URLs separated by tabs
- ✅ URLs with query parameters (`?si=...`)
- ✅ Various Spotify URL formats

## Spotify Web API Details

### Authentication

Uses **Client Credentials Flow** (no user login required):
1. Script authenticates with your Client ID + Secret
2. Receives an access token (valid for ~1 hour)
3. Token is cached and reused until expiry
4. Automatically refreshes when needed

### Rate Limiting

The script includes built-in rate limiting:
- 200ms delay between requests (5 requests/second)
- Well within Spotify's limits (no throttling)
- Can process ~300 playlists/minute safely

### Data Retrieved

For each playlist, the API returns:
- ✅ Name
- ✅ Follower count
- ✅ Track count
- ✅ Description
- ✅ Owner display name
- ✅ Playlist ID (base62)
- ✅ Public/collaborative status

## UI Integration

### Campaign Cards
Show playlist follower counts on campaign cards:

```tsx
<div className="playlist-info">
  <span>{playlist.name}</span>
  <span className="followers">
    {playlist.follower_count?.toLocaleString()} followers
  </span>
</div>
```

### Vendor Portal
Vendors can see their playlist performance:

```tsx
<VendorPlaylistCard
  name={playlist.name}
  followers={playlist.follower_count}
  avgDailyStreams={playlist.avg_daily_streams}
  campaigns={linkedCampaigns.length}
/>
```

### Analytics
Use follower counts for playlist quality scoring:

```sql
-- Top playlists by follower count
SELECT 
  name, 
  follower_count, 
  avg_daily_streams,
  (avg_daily_streams::float / NULLIF(follower_count, 0)) * 100 AS engagement_rate
FROM playlists
WHERE follower_count > 0
ORDER BY follower_count DESC
LIMIT 100;
```

## Troubleshooting

### "Invalid playlist URL"
**Cause**: URL doesn't match Spotify's format  
**Fix**: Ensure URLs are in format: `https://open.spotify.com/playlist/{ID}`

### "Spotify authentication failed"
**Cause**: Invalid Client ID/Secret  
**Fix**: Verify credentials in environment variables

### "Campaign not found in database"
**Cause**: Campaign name in CSV doesn't match database  
**Fix**: Import campaigns first using the campaign import script

### "Rate limit exceeded"
**Cause**: Too many requests to Spotify API  
**Fix**: Script has built-in rate limiting; should not occur. Wait 1 minute and retry.

## Production Deployment

### On DigitalOcean Droplet

1. **Set environment variables**:
```bash
export SUPABASE_URL="http://kong:8000"
export SUPABASE_SERVICE_ROLE_KEY="your-prod-service-role-key"
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"
```

2. **Run migration**:
```bash
cd ~/arti-marketing-ops
npx supabase migration up
```

3. **Upload CSV**:
```bash
scp "Spotify Playlisting-Active Campaigns (1).csv" root@your-droplet:/root/arti-marketing-ops/
```

4. **Run enrichment**:
```bash
cd ~/arti-marketing-ops
npx tsx scripts/enrich-campaign-playlists.ts
```

### Automated Enrichment

Set up a cron job to refresh playlist data weekly:

```bash
# Add to crontab (crontab -e)
0 2 * * 0 cd /root/arti-marketing-ops && npx tsx scripts/enrich-campaign-playlists.ts >> /var/log/playlist-enrichment.log 2>&1
```

This runs every Sunday at 2 AM to keep follower counts updated.

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/spotify-web-api/playlist/:id` | GET | Fetch single playlist metadata |
| `/api/spotify-web-api/track/:id` | GET | Fetch track metadata (name, artist, genres) |
| `/api/spotify-web-api/enrich-playlists` | POST | Bulk enrich playlists |
| `/api/spotify-web-api/enrich-tracks` | POST | Bulk enrich tracks |
| `/api/spotify-web-api/extract-id` | GET | Extract Spotify ID from URL |

### Client Library

The API client is located at: `apps/api/src/lib/spotify-web-api.ts`

Example usage in your code:

```typescript
import { spotifyWebApi } from '@/lib/spotify-web-api';

// Fetch playlist data
const playlist = await spotifyWebApi.getPlaylist('3zOnEjdz7EFZaibEDHhT72');
console.log(`${playlist.name} has ${playlist.followers.total} followers`);

// Fetch track data
const track = await spotifyWebApi.getTrack('6oxdDe9WdEHtfH62Hw1GRP');
console.log(`${track.name} by ${track.artists.map(a => a.name).join(', ')}`);
```

## Next Steps

1. ✅ Run the enrichment script on your CSV
2. ✅ Verify data in the database
3. ✅ Update UI components to display follower counts
4. ✅ Set up automated weekly refreshes
5. ✅ Use follower data in analytics and reporting

## Support

For issues or questions:
- Check the API server logs: `docker logs supabase_api_arti-marketing-ops`
- Verify Spotify credentials are correct
- Ensure CSV file path is correct
- Check database connectivity

---

**Last Updated**: 2025-11-03  
**Script Version**: 1.0.0  
**API Version**: 1.0.0

