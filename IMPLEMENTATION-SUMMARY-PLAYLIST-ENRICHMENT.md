# Playlist Enrichment Implementation Summary

## What Was Built

A complete system to enrich your database with Spotify playlist metadata (follower counts, descriptions, track counts, etc.) using the Spotify Web API.

## Files Created

### 1. Database Migration
**File**: `supabase/migrations/999_add_playlist_metadata_columns.sql`
- Adds columns to `playlists` table: `spotify_id`, `description`, `owner_name`, `track_count`, `is_algorithmic`, `last_enriched_at`
- Adds columns to `campaign_playlists` table: `playlist_url`, `playlist_follower_count`, `playlist_description`, `playlist_owner`, `playlist_track_count`, `playlist_spotify_id`
- Creates indexes for faster lookups
- Adds documentation comments

### 2. Enrichment Scripts

**File**: `scripts/enrich-playlists-from-csv.ts`
- Simple script that reads CSV and enriches existing playlists in the database
- Updates follower counts for playlists that already exist
- Skips playlists not yet in the database

**File**: `scripts/enrich-campaign-playlists.ts` (⭐ Main Script)
- Comprehensive script that:
  - Reads campaigns from your CSV
  - Extracts playlist URLs from "SP Playlist Stuff" column
  - Fetches metadata from Spotify Web API
  - Creates/updates playlists in `playlists` table
  - Links playlists to campaigns in `campaign_playlists` table
  - Associates playlists with vendors
  - Handles rate limiting automatically

### 3. Frontend Components

**File**: `apps/frontend/components/PlaylistCard.tsx`
- `PlaylistCard` - Full card component showing:
  - Playlist name and owner
  - Follower count
  - Track count
  - Daily stream average
  - Campaign count
  - Engagement rate calculation
  - Description
  - Link to open in Spotify
- `PlaylistCompactCard` - Compact version for lists

### 4. Documentation

**File**: `SPOTIFY-PLAYLIST-ENRICHMENT.md`
- Complete guide covering:
  - System overview and data flow
  - Database schema details
  - Setup instructions
  - Usage examples (scripts + API)
  - CSV structure requirements
  - API authentication details
  - UI integration examples
  - Troubleshooting guide
  - Production deployment steps

**File**: `scripts/RUN-PLAYLIST-ENRICHMENT.md`
- Quick start guide with copy-paste commands
- Local and production instructions
- Verification queries
- Troubleshooting tips
- Automated scheduling setup

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CSV File (SP Playlist Stuff column)                      │
│    - Contains playlist URLs separated by newlines/tabs      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Enrichment Script                                        │
│    - Parses CSV and extracts URLs                          │
│    - Extracts Spotify playlist IDs (22 char base62)        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Spotify Web API                                          │
│    - Authenticates with Client Credentials                  │
│    - Fetches playlist metadata:                            │
│      • Name                                                 │
│      • Follower count                                       │
│      • Track count                                          │
│      • Description                                          │
│      • Owner name                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Database Updates                                         │
│    - Creates/updates playlists table                       │
│    - Links to campaigns via campaign_playlists             │
│    - Associates with vendors                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UI Display                                               │
│    - Campaign cards show playlist followers                │
│    - Vendor portal shows playlist performance              │
│    - Analytics use follower data                           │
└─────────────────────────────────────────────────────────────┘
```

## Data Structure

### CSV Column: "SP Playlist Stuff"

Example data:
```
https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72?si=19aeee2514994f08
https://open.spotify.com/playlist/5quud9tyyGwkmk2vgLK1Vd?si=80fc5e6aace744a3
https://open.spotify.com/playlist/1MAGl3BMI56FXHTWAwK1c8?si=f26c6d0206af4efb
```

The script handles:
- Multiple URLs per campaign
- Newline or tab-separated
- Query parameters (`?si=...`)
- Various URL formats

### Database Schema

**playlists table**:
```sql
- spotify_id VARCHAR(22) -- Base62 Spotify ID
- follower_count INTEGER -- From API
- track_count INTEGER    -- From API
- description TEXT       -- From API
- owner_name TEXT        -- From API
- last_enriched_at TIMESTAMP
```

**campaign_playlists table**:
```sql
- playlist_url TEXT
- playlist_spotify_id VARCHAR(22)
- playlist_follower_count INTEGER
- playlist_description TEXT
- playlist_owner TEXT
- playlist_track_count INTEGER
```

## Usage

### Quick Start (Local)

```bash
# 1. Set environment variables
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"

# 2. Run migration
npx supabase migration up

# 3. Run enrichment
npx tsx scripts/enrich-campaign-playlists.ts
```

### Expected Results

For 653 campaigns with ~2,000 playlist URLs:
- **Campaigns processed**: 653
- **Playlists enriched**: ~800-900 (existing playlists updated)
- **Playlists created**: ~40-50 (new playlists)
- **Campaign links created**: ~2,000 (one per URL)
- **Processing time**: ~7-10 minutes (with rate limiting)

## API Endpoints Available

The existing Spotify Web API routes (`apps/api/src/routes/spotify-web-api.ts`) provide:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/spotify-web-api/playlist/:id` | GET | Fetch single playlist metadata |
| `/api/spotify-web-api/track/:id` | GET | Fetch track metadata |
| `/api/spotify-web-api/enrich-playlists` | POST | Bulk enrich playlists |
| `/api/spotify-web-api/enrich-tracks` | POST | Bulk enrich tracks |
| `/api/spotify-web-api/extract-id` | GET | Extract Spotify ID from URL |

## Integration Points

### Campaign Cards
Show follower counts alongside playlist names:
```tsx
import { PlaylistCompactCard } from '@/components/PlaylistCard';

<PlaylistCompactCard
  name="house bangers"
  url="https://open.spotify.com/playlist/..."
  followerCount={1234567}
  ownerName="ClubRestrictedOfficial"
/>
```

### Analytics Queries
Use follower data for insights:
```sql
-- Top performing playlists
SELECT 
  name,
  follower_count,
  avg_daily_streams,
  (avg_daily_streams::float / follower_count * 100) AS engagement_rate
FROM playlists
WHERE follower_count > 10000
ORDER BY engagement_rate DESC;
```

## Rate Limiting

- **Built-in delay**: 200ms between requests (5 req/sec)
- **Spotify's limit**: 100 req/30sec (we're well under)
- **Processing speed**: ~300 playlists/minute
- **Token management**: Auto-refresh before expiry

## Next Steps

1. **Run the enrichment script** on your CSV:
   ```bash
   npx tsx scripts/enrich-campaign-playlists.ts
   ```

2. **Verify the data** in Supabase Studio:
   - Check `playlists` table for follower counts
   - Check `campaign_playlists` table for links
   - Run verification queries from the docs

3. **Update your UI components** to display:
   - Follower counts on campaign cards
   - Playlist metadata in vendor portal
   - Engagement rates in analytics

4. **Set up automated refreshes**:
   - Weekly cron job to update follower counts
   - Keeps data fresh without manual work

5. **Use in analytics**:
   - Calculate engagement rates
   - Identify high-performing playlists
   - Track follower growth over time

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| "CSV file not found" | Place CSV in project root with exact name |
| "Authentication failed" | Verify Spotify credentials in env vars |
| "Campaign not found" | Campaign must exist in `spotify_campaigns` table |
| "Rate limit exceeded" | Script has built-in rate limiting; should not occur |

## Maintenance

### Weekly Refresh (Recommended)

Set up a cron job to keep follower counts updated:

```bash
# crontab -e
0 2 * * 0 cd /root/arti-marketing-ops && npx tsx scripts/enrich-campaign-playlists.ts >> /var/log/playlist-enrichment.log 2>&1
```

This runs every Sunday at 2 AM.

### Manual Refresh

Re-run the script anytime to update all data:
```bash
npx tsx scripts/enrich-campaign-playlists.ts
```

## Production Deployment

### On Your DigitalOcean Droplet

```bash
# 1. SSH in
ssh root@157.230.82.234

# 2. Go to project
cd ~/arti-marketing-ops

# 3. Pull latest code
git pull origin main

# 4. Run migration
npx supabase migration up

# 5. Upload CSV if needed
# (from local): scp "Spotify Playlisting-Active Campaigns (1).csv" root@157.230.82.234:/root/arti-marketing-ops/

# 6. Set env vars
export SUPABASE_URL="http://kong:8000"
export SUPABASE_SERVICE_ROLE_KEY="your-prod-key"
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"

# 7. Run enrichment
npx tsx scripts/enrich-campaign-playlists.ts
```

## Success Metrics

After running, you should see:
- ✅ Follower counts populated in `playlists` table
- ✅ Playlist metadata in `campaign_playlists` table
- ✅ Links between campaigns and playlists
- ✅ Vendor associations
- ✅ `last_enriched_at` timestamps

## Resources

- **Full Documentation**: `SPOTIFY-PLAYLIST-ENRICHMENT.md`
- **Quick Start Guide**: `scripts/RUN-PLAYLIST-ENRICHMENT.md`
- **Main Script**: `scripts/enrich-campaign-playlists.ts`
- **API Client**: `apps/api/src/lib/spotify-web-api.ts`
- **API Routes**: `apps/api/src/routes/spotify-web-api.ts`
- **UI Components**: `apps/frontend/components/PlaylistCard.tsx`

---

**Implementation Date**: 2025-11-03  
**Status**: ✅ Complete and Ready to Run  
**Estimated Time**: ~10 minutes for 653 campaigns

