# Spotify Web API Integration

Complete guide for using the Spotify Web API to enrich database with metadata.

---

## Overview

This integration allows us to automatically pull metadata from Spotify:
- **Playlist follower counts** - Real-time follower data for accurate playlist metrics
- **Track names and artist names** - Proper track metadata for display
- **Genre data** - Genre classification from artist profiles

---

## Architecture

### Components

1. **Spotify Web API Client** (`apps/api/src/lib/spotify-web-api.ts`)
   - Handles OAuth Client Credentials Flow
   - Token management with auto-refresh
   - Rate limiting and retry logic
   - Type-safe API wrappers

2. **API Routes** (`apps/api/src/routes/spotify-web-api.ts`)
   - `GET /api/spotify-web-api/playlist/:id` - Fetch playlist details
   - `GET /api/spotify-web-api/track/:id` - Fetch track metadata
   - `POST /api/spotify-web-api/enrich-playlists` - Bulk playlist enrichment
   - `POST /api/spotify-web-api/enrich-tracks` - Bulk track enrichment
   - `GET /api/spotify-web-api/extract-id` - Extract Spotify IDs from URLs

3. **Enrichment Script** (`scripts/enrich-spotify-metadata.js`)
   - Automated batch processing
   - Database updates via Supabase
   - Progress reporting and error handling

---

## Setup

### 1. Configure Environment Variables

**Local Development** (`apps/api/.env`):
```env
SPOTIFY_CLIENT_ID=294f0422469444b5b4b0178ce438b5b8
SPOTIFY_CLIENT_SECRET=7320687e4ceb475b82c2f3a543eb2f9e
```

**Production** (`apps/api/production.env`):
```env
SPOTIFY_CLIENT_ID=294f0422469444b5b4b0178ce438b5b8
SPOTIFY_CLIENT_SECRET=7320687e4ceb475b82c2f3a543eb2f9e
```

### 2. Apply Database Migration

```bash
# Apply migration to add new columns
cd /root/arti-marketing-ops
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/999_add_spotify_metadata_columns.sql
```

### 3. Restart API Server

**Local:**
```bash
cd apps/api
npm run dev
```

**Production:**
```bash
ssh root@164.90.129.146
cd /root/arti-marketing-ops
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart api
```

---

## Usage

### Testing the Integration

```bash
# Test all endpoints
node scripts/test-spotify-web-api.js

# Expected output:
# ✅ Playlist Endpoint: PASS
# ✅ Track Endpoint: PASS
# ✅ ID Extraction: PASS
```

### Enriching Playlist Follower Counts

```bash
# Enrich all playlists
node scripts/enrich-spotify-metadata.js playlists

# Or use the API directly
curl -X POST http://localhost:3001/api/spotify-web-api/enrich-playlists \
  -H "Content-Type: application/json" \
  -d '{"playlist_urls": ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"]}'
```

### Enriching Track Metadata

```bash
# Enrich all tracks
node scripts/enrich-spotify-metadata.js tracks

# Or use the API directly
curl http://localhost:3001/api/spotify-web-api/track/3n3Ppam7vgaVa1iaRUc9Lp
```

### Full Enrichment (Playlists + Tracks)

```bash
node scripts/enrich-spotify-metadata.js all
```

---

## API Endpoints

### GET /api/spotify-web-api/playlist/:id

Fetch playlist details including follower count.

**Request:**
```http
GET /api/spotify-web-api/playlist/37i9dQZF1DXcBWIGoYBM5M
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "37i9dQZF1DXcBWIGoYBM5M",
    "name": "Today's Top Hits",
    "description": "Ed Sheeran is on top of the Hottest 50!",
    "followers": 38000000,
    "track_count": 50,
    "owner": "Spotify"
  }
}
```

### GET /api/spotify-web-api/track/:id

Fetch track metadata including artist and genre data.

**Request:**
```http
GET /api/spotify-web-api/track/3n3Ppam7vgaVa1iaRUc9Lp
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "3n3Ppam7vgaVa1iaRUc9Lp",
    "name": "Mr. Brightside",
    "artists": [
      { "id": "0C0XlULifJtAgn6ZNCW2eu", "name": "The Killers" }
    ],
    "album": "Hot Fuss",
    "release_date": "2004-06-07",
    "duration_ms": 222973,
    "popularity": 93,
    "genres": ["alternative rock", "indie rock", "modern rock"]
  }
}
```

### POST /api/spotify-web-api/enrich-playlists

Bulk enrich multiple playlists.

**Request:**
```http
POST /api/spotify-web-api/enrich-playlists
Content-Type: application/json

{
  "playlist_urls": [
    "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "success_count": 2,
  "failed_count": 0,
  "details": [
    {
      "url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      "name": "Today's Top Hits",
      "followers": 38000000
    }
  ]
}
```

---

## Database Schema

### New Columns Added

#### `spotify_campaigns` table:
```sql
- primary_genre TEXT                -- Primary genre from main artist
- all_genres TEXT[]                 -- All genres from all artists
- track_name TEXT                   -- Official track name from Spotify
- track_popularity INTEGER          -- Popularity score (0-100)
- track_duration_ms INTEGER         -- Track duration in milliseconds
- release_date DATE                 -- Track/album release date
```

#### `campaign_groups` table:
```sql
- primary_genre TEXT                -- Primary genre for the campaign
- all_genres TEXT[]                 -- All genres associated with campaign
```

---

## Rate Limiting

Spotify Web API has rate limits:
- **Client Credentials Flow**: ~100 requests per second
- **Our Implementation**: 150ms delay between requests (safe)
- **Automatic retry**: Built-in retry logic for rate limit errors (429)

---

## Error Handling

The integration includes comprehensive error handling:
- ✅ Token expiration auto-refresh
- ✅ Rate limit detection and retry
- ✅ Invalid URL format detection
- ✅ Network error retry logic
- ✅ Database update error logging

---

## Production Deployment

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Add Spotify Web API integration"
git push origin main
```

### Step 2: Pull Changes on Production
```bash
ssh root@164.90.129.146
cd /root/arti-marketing-ops
git pull origin main
```

### Step 3: Update Environment Variables
```bash
# Edit production.env to include Spotify credentials
nano apps/api/production.env

# Add:
SPOTIFY_CLIENT_ID=294f0422469444b5b4b0178ce438b5b8
SPOTIFY_CLIENT_SECRET=7320687e4ceb475b82c2f3a543eb2f9e
```

### Step 4: Apply Database Migration
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/999_add_spotify_metadata_columns.sql
```

### Step 5: Rebuild and Restart API
```bash
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build api
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart api
```

### Step 6: Test in Production
```bash
# Test from the droplet
curl http://localhost:3002/api/spotify-web-api/playlist/37i9dQZF1DXcBWIGoYBM5M

# Or test from your local machine
curl https://api.artistinfluence.com/api/spotify-web-api/playlist/37i9dQZF1DXcBWIGoYBM5M
```

### Step 7: Run Enrichment
```bash
# On the production droplet
cd /root/arti-marketing-ops
API_URL=http://localhost:3002 node scripts/enrich-spotify-metadata.js all
```

---

## Monitoring

### Check API Logs
```bash
# View API logs
docker logs -f arti-marketing-ops-api-1 --tail 100

# Look for:
# 🔑 Requesting new Spotify access token...
# ✅ Spotify access token obtained successfully
```

### Verify Database Updates
```sql
-- Check playlist follower counts
SELECT name, follower_count, updated_at 
FROM playlists 
WHERE follower_count IS NOT NULL 
ORDER BY follower_count DESC 
LIMIT 10;

-- Check track metadata
SELECT id, track_name, artist_name, primary_genre, all_genres
FROM spotify_campaigns
WHERE track_name IS NOT NULL
LIMIT 10;
```

---

## Troubleshooting

### API Returns 401 (Unauthorized)
- Check that `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set correctly
- Verify the credentials are valid in Spotify Developer Dashboard

### API Returns 429 (Rate Limited)
- The script includes automatic retry logic
- Increase the delay between requests (currently 150ms)

### Track Genres Not Populating
- Genres come from artist profiles, not tracks directly
- Some artists may have no genres listed in Spotify

### Migration Fails
- Check if columns already exist: `\d spotify_campaigns` in psql
- Ensure you have proper database permissions

---

## Future Enhancements

- [ ] Add audio features (danceability, energy, etc.)
- [ ] Cache Spotify API responses in Redis
- [ ] Add Spotify playlist auto-discovery
- [ ] Implement webhook for real-time updates
- [ ] Add track popularity tracking over time

---

**This integration provides rich metadata from Spotify to enhance campaign analytics and vendor playlist tracking.**

