# Spotify Platform - Complete System Guide

**Last Updated**: 2025-11-04  
**Status**: ✅ Production Ready  
**Database**: 1,239 campaigns, 149 playlists (28 enriched), 242 clients, 12 vendors

---

## 🏗️ Architecture Overview

### Database Schema -test

The Spotify platform uses multiple interconnected tables:

#### Core Tables

**1. `spotify_campaigns`** - Individual song campaigns
```sql
Key Columns:
- id (integer, primary key)
- campaign (text) - Campaign/song name (e.g., "Segan - Lost Ya Mind")
- client (text) - Client name
- client_id (uuid) - FK to clients table
- vendor (text) - Vendor name
- vendor_id (uuid) - FK to vendors table  
- campaign_group_id (uuid) - FK to campaign_groups
- url (text) - Spotify track URL
- goal, remaining, daily, weekly (text) - Stream metrics
- sale_price (text) - Price paid (e.g., "$500.00")
- start_date (text) - Campaign start date
- status (text) - "Active", "Pending", "Complete", etc.
- sfa (text) - Spotify for Artists URL
- playlist_links (text) - Playlist URLs from CSV "SP Playlist Stuff" column
- paid_vendor (text) - "checked" if vendor paid
- curator_status (text) - "Accepted", "Rejected", "Pending"
- playlists (text) - Playlist names from CSV
- track_name, artist_name (text) - Enriched from Spotify Web API
- primary_genre (text), all_genres (text[]) - Enriched genre data
- track_popularity, track_duration_ms, release_date - Enriched metadata
- plays_last_7d, plays_last_3m, plays_last_12m - Real scraped stream data
- playlist_adds, saves - Spotify metrics
```

**2. `campaign_groups`** - Campaign containers (multiple songs per campaign)
```sql
Key Columns:
- id (uuid, primary key)
- name (text) - Campaign name
- artist_name (text)
- client_id (uuid) - FK to clients
- total_goal (integer) - Total stream goal
- total_budget (decimal) - Total budget
- start_date, end_date (date)
- status (text) - "Draft", "Active", "Pending", "Complete"
- invoice_status (text) - "Not Invoiced", "Sent", "Paid"
- salesperson (text)
- primary_genre (text), all_genres (text[]) - Enriched from tracks
```

**3. `campaign_playlists`** - Links songs to specific playlists with performance data
```sql
Key Columns:
- id (uuid, primary key)
- campaign_id (integer) - FK to spotify_campaigns.id
- vendor_id (uuid) - FK to vendors table
- playlist_name (text) - e.g., "GYM - TEMAZOS MOTIVACION 2025"
- playlist_curator (text) - Who made the playlist
- playlist_url (text) - Full Spotify playlist URL
- playlist_spotify_id (varchar) - Base62 Spotify ID (22 chars)
- playlist_follower_count (integer) - Followers at time of scrape
- playlist_description, playlist_owner, playlist_track_count - Enriched metadata
- streams_7d, streams_28d, streams_12m (integer) - Performance metrics
- is_algorithmic (boolean) - TRUE for Spotify algorithmic playlists
- date_added (text) - When song was added
- last_scraped (timestamp)
```

**4. `playlists`** - Aggregated playlist data for vendor display
```sql
Key Columns:
- id (uuid, primary key)
- vendor_id (uuid) - FK to vendors (can be NULL)
- name (text) - Playlist name
- url (text) - Spotify playlist URL
- spotify_id (varchar, unique) - Base62 Spotify ID
- follower_count (integer) - From Spotify Web API
- track_count (integer) - Number of tracks
- genres (text[]) - Array of genres (fetched from track artists)
- description (text) - Playlist description
- owner_name (text) - Playlist owner display name
- is_algorithmic (boolean) - TRUE for Spotify playlists
- avg_daily_streams (integer) - Calculated from campaign_playlists
- last_enriched_at (timestamp) - Last Spotify API fetch
```

**5. `clients`** - Client entities
```sql
- id (uuid, primary key)
- name (text)
- emails (text[])
- phone, contact_person, credit_balance, notes
```

**6. `vendors`** - Playlist vendors/curators
```sql
- id (uuid, primary key)
- name (text)
- max_daily_streams (integer)
- cost_per_1k_streams (decimal)
- is_active (boolean)
```

### Data Flow

```
CSV Import → spotify_campaigns (playlist_links column)
    ↓
Enrichment Script → Fetches from Spotify Web API
    ↓
playlists table (follower_count, genres, metadata)
    ↓
campaign_playlists table (links campaigns to playlists with vendor_id)
    ↓
UI Display (vendor panels, campaign details, analytics)
```

---

## 🔑 Key Concepts

### 1. Campaign Structure

A **campaign** can have multiple levels:
- **campaign_groups**: Top-level campaign (e.g., "Reece Rosé - Album Campaign")
- **spotify_campaigns**: Individual song placements (e.g., "Reece Rosé - Back Back")
- **campaign_playlists**: Specific playlist placements with performance data

### 2. Playlist Associations

Playlists can be associated with:
- **Vendors** (via `playlists.vendor_id`) - Direct ownership
- **Campaigns** (via `campaign_playlists`) - Specific placements
- **Both** (when a vendor's playlist is used in a campaign)

### 3. Enrichment Process

**Data Sources:**
1. **CSV Import**: Campaign data, client info, vendor names, playlist names
2. **Spotify Web API**: Follower counts, track metadata, artist genres
3. **Spotify for Artists Scraper**: Real stream performance data

**Enrichment Flow:**
```
1. Import campaigns from CSV → spotify_campaigns.playlist_links populated
2. Run enrich-playlists-direct.sh:
   a. Extracts playlist URLs from playlist_links
   b. Calls Spotify Web API for each playlist
   c. Fetches playlist metadata (name, followers, tracks)
   d. Extracts artist IDs from first 10 tracks
   e. Fetches genres from artists
   f. Updates playlists table with enriched data
   g. Links to campaigns via campaign_playlists
3. Run merge script:
   a. Matches enriched playlists to vendor playlists by name
   b. Updates vendor playlists with enriched data
   c. Removes duplicate enriched-only playlists
```

### 4. Algorithmic vs Vendor Playlists

**Algorithmic Playlists** (Spotify-owned):
- Discover Weekly
- Release Radar
- Daily Mixes
- Radio
- Smart Shuffle
- Your DJ
- Daylist

**Criteria for algorithmic**:
- `is_algorithmic = true`
- `vendor_id IS NULL`
- `playlist_curator = 'Spotify'`

**Vendor Playlists** (Paid placements):
- All other playlists
- Have `vendor_id` set
- Linked to specific vendors

---

## 🗄️ Current Data State (as of 2025-11-04)

### Production Database

```
spotify_campaigns: 1,239 campaigns
  - 661 from Airtable legacy import
  - 289 from active campaigns CSV
  - 289 imported recently

campaign_groups: 653 campaign groups

campaign_playlists: 3,485 campaign-playlist links
  - Links songs to specific playlists
  - Tracks performance metrics

playlists: 149 total
  - 149 with vendor_id (all vendor playlists)
  - 28 with follower_count > 0 (enriched)
  - 27 with genres populated (enriched)
  - 121 without enriched data yet (have real URLs but no Spotify data)

clients: 242 clients

vendors: 12 active vendors
  - Club Restricted (primary)
  - Glenn
  - Golden Nugget
  - Vynx
  - Moon
  - Levianth
  - House Views
  - Alekk
  - Majed
  - Torok
  - SoundWorld
  - Others
```

### Known Issues

**Playlist Duplication (RESOLVED)**:
- ✅ Old playlists with fake/slugified URLs have been cleaned up (359 deleted)
- ✅ Only 149 playlists with real Spotify URLs remain

**Vendor Association (CURRENT STATE)**:
- ✅ All 149 playlists have vendor_id set
- ✅ 28 have enriched data (follower_count, genres)
- ⚠️  121 still need enrichment (URLs are real, but no Spotify metadata yet)

**Genre Data**:
- ✅ Genres are fetched from track artists (not playlists directly)
- ✅ Top 3 most common genres stored as text[] array
- ⚠️  Some playlists have no genres if artists have no genre metadata

---

## 🚀 Scripts and Tools

### Production Scripts (on DigitalOcean droplet)

**Location**: `/root/arti-marketing-ops/scripts/`

#### 1. `simple-import.sh`
**Purpose**: Import campaigns from CSV to database
```bash
bash scripts/simple-import.sh
```
- Reads "Spotify Playlisting-Active Campaigns (1).csv"
- Creates clients and vendors as needed
- Imports all campaigns into `spotify_campaigns` table
- Preserves `playlist_links` from "SP Playlist Stuff" column

#### 2. `enrich-playlists-direct.sh`
**Purpose**: Fetch playlist metadata from Spotify Web API
```bash
bash scripts/enrich-playlists-direct.sh
```
**What it does:**
- Queries campaigns with `playlist_links` data
- Extracts playlist URLs
- Calls Spotify Web API to get:
  - Playlist name, follower count, track count, owner
  - Artist IDs from first 10 tracks
  - Genres from those artists
- Updates `playlists` table with enriched data
- Updates `campaign_playlists` with spotify_id and metadata

**Environment Variables Required:**
```bash
export SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
export SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"
```

**Processing time**: ~30-45 minutes for 1,394 campaigns  
**Rate limiting**: 200ms delay between playlists (safe for Spotify's limits)

#### 3. `merge-enriched-playlists.sql`
**Purpose**: Merge enriched playlist data into vendor playlists
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/merge-enriched-playlists.sql
```
- Matches enriched playlists (vendor_id=NULL) to vendor playlists by name
- Updates vendor playlists with follower_count and genres
- Deletes duplicate enriched-only playlists
- Shows summary of results

#### 4. `cleanup-unenriched-playlists.sql`
**Purpose**: Remove old playlists with fake/slugified URLs
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/cleanup-unenriched-playlists.sql
```
- Deletes playlists with follower_count=0 and fake URLs
- Keeps playlists with real Spotify URLs (22-char base62 IDs)

#### 5. `enrich-spotify-metadata.js`
**Purpose**: Enrich track metadata (LEGACY - use for tracks only)
```bash
API_URL=http://localhost:3002 node scripts/enrich-spotify-metadata.js tracks
```
- Enriches `spotify_campaigns` with track names, artist names, genres
- Updates `campaign_groups` with genre data
- Uses the API server endpoints

#### 6. `test-spotify-web-api.js`
**Purpose**: Test Spotify Web API integration
```bash
API_URL=http://localhost:3002 node scripts/test-spotify-web-api.js
```
- Tests playlist endpoint
- Tests track endpoint  
- Tests ID extraction

### Database Migrations

**Key Migrations:**
- `036_add_playlist_metadata_columns.sql` - Adds spotify_id, description, owner_name, etc.
- `037_add_spotify_metadata_columns.sql` - Adds track metadata columns
- `041_make_vendor_id_nullable.sql` - Makes vendor_id nullable in playlists

**Run migrations:**
```bash
npx supabase migration up
```

---

## 💻 Frontend Architecture

### Pages

**`/spotify/playlists`** (`apps/frontend/app/(dashboard)/spotify/stream-strategist/pages/PlaylistsPage.tsx`)
- **Vendors View**: Card-based view showing vendors and their playlists
- **Table View**: All playlists in a sortable/filterable table
- **Features**:
  - Display follower counts and genres
  - Edit playlist URLs/metadata
  - Add/delete playlists
  - Import playlists from CSV
  - Filter by vendor, genre, search term

**`/spotify/campaigns`** (`pages/CampaignHistory.tsx`)
- List of all campaign_groups
- Enhanced with real-time metrics
- Tabs: Campaigns, Submissions, Vendor Payouts
- Click to open campaign details modal

**`/spotify/campaign-intake`** (`pages/CampaignIntakePage.tsx`)
- Multi-step campaign creation wizard
- Client selection/creation
- Vendor assignment
- Playlist allocation

### Key Components

**`CampaignDetailsModal.tsx`**
- Shows campaign overview, playlists, performance, payments
- **Playlists Tab**: 
  - Vendor Playlists section (grouped by vendor)
  - Algorithmic Playlists section (Spotify-owned)
- **Performance Tab**: Charts and analytics
- **Payments Tab**: Vendor payment tracking
- Features "Add Playlist" button → opens PlaylistSelector

**`PlaylistSelector.tsx`**
- Modal to add playlists to campaigns
- Filters: Search, vendor, genre, min daily streams
- Shows: Playlist name, vendor, followers, daily streams, genres
- Compact scrollable design (h-[400px])
- Highlights genre matches with campaign genre

**`EditPlaylistVendorDialog.tsx`**
- Edit playlist-to-vendor associations within a campaign
- Toggle algorithmic flag
- Select vendor from dropdown
- Updates `campaign_playlists` table

**`VendorGroupedPlaylistView.tsx`**
- Displays playlists grouped by vendor
- Shows performance metrics per playlist
- Collapsible vendor sections

### Hooks

**`useVendorPayouts.ts`**
- Fetches vendor payment data
- Sources:
  1. `campaign_allocations_performance` table
  2. `campaign_groups.vendor_allocations` JSON
  3. `spotify_campaigns` (vendor, paid_vendor, sale_price)
- Aggregates by vendor
- Calculates amount_owed and amount_paid

**`useCampaignVendorResponses.ts`**
- Fetches vendor responses for campaigns
- Used in campaign details modal

**`useCampaignPerformanceData.ts`**
- Fetches performance metrics
- Aggregates stream data

---

## 🔍 Data Queries

### Common Queries

**Get all playlists for a vendor:**
```sql
-- Method 1: Direct vendor assignment
SELECT * FROM playlists WHERE vendor_id = '<vendor_uuid>';

-- Method 2: Via campaign_playlists (more comprehensive)
SELECT DISTINCT p.*
FROM playlists p
INNER JOIN campaign_playlists cp ON p.spotify_id = cp.playlist_spotify_id
WHERE cp.vendor_id = '<vendor_uuid>';
```

**Get enriched playlists:**
```sql
SELECT name, follower_count, genres, vendor_id
FROM playlists
WHERE follower_count > 0 AND array_length(genres, 1) > 0
ORDER BY follower_count DESC;
```

**Get campaign playlists with vendor info:**
```sql
SELECT 
  cp.playlist_name,
  cp.playlist_follower_count,
  v.name as vendor_name,
  sc.campaign as campaign_name
FROM campaign_playlists cp
LEFT JOIN vendors v ON cp.vendor_id = v.id
LEFT JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
WHERE cp.playlist_follower_count > 0
ORDER BY cp.playlist_follower_count DESC;
```

**Get algorithmic playlists for a campaign:**
```sql
SELECT *
FROM campaign_playlists
WHERE campaign_id IN (
  SELECT id FROM spotify_campaigns WHERE campaign_group_id = '<campaign_group_uuid>'
)
AND is_algorithmic = true
AND (playlist_curator = 'Spotify' OR playlist_curator IS NULL)
AND vendor_id IS NULL;
```

---

## 🐛 Known Issues & Solutions

### Issue 1: Playlists Show No Genres/Followers in UI

**Symptoms:**
- UI displays "-" or "0" for follower count
- Genre badges don't appear

**Root Causes:**
1. **Data not in database** - Run enrichment script
2. **Query not fetching enriched data** - Check query invalidation
3. **Playlist has vendor_id=NULL** - Run merge script
4. **Browser cache** - Hard refresh (Ctrl+Shift+R)

**Solution:**
```bash
# 1. Enrich playlists
bash scripts/enrich-playlists-direct.sh

# 2. Merge into vendor playlists
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/merge-enriched-playlists.sql

# 3. Restart frontend
pm2 restart all

# 4. Hard refresh browser
```

### Issue 2: Playlist URL Edits Don't Persist

**Symptoms:**
- Edit playlist URL in modal
- Click "Update Playlist"
- After refresh, URL reverts to old value

**Root Causes:**
1. **Duplicate playlists** - One with vendor_id, one without (RESOLVED via cleanup)
2. **Validation blocking save** - Required genres on edit (FIXED)
3. **Query cache not invalidating** - (FIXED - added comprehensive invalidation)

**Current Status**: ✅ RESOLVED
- Cleanup script removed 359 duplicate playlists
- Validation relaxed for edits (genres not required)
- Query invalidation comprehensive

### Issue 3: Non-Algorithmic Playlists in Algorithmic Section

**Symptoms:**
- Vendor playlists appearing in "Algorithmic Streaming Data" section

**Root Cause:**
- Filtering only checked `is_algorithmic = true`
- Didn't verify `playlist_curator = 'Spotify'` and `vendor_id IS NULL`

**Solution**: Updated filter in `CampaignDetailsModal.tsx` (line 172-176)
```typescript
const algorithmicPlaylists = (data || []).filter((p: any) => 
  p.is_algorithmic === true && 
  !p.vendor_id && 
  (p.playlist_curator?.toLowerCase() === 'spotify' || !p.playlist_curator)
);
```

### Issue 4: Vendor Payouts Showing $0

**Symptoms:**
- All vendor payouts show $0.00 amount owed

**Root Causes:**
1. `campaign_groups.vendor_allocations` column doesn't exist
2. `sale_price` stored as string with "$" symbol
3. `paid_vendor` stored as string "true" instead of boolean

**Solution**: Updated `useVendorPayouts.ts` to:
- Fetch from `spotify_campaigns` table directly
- Parse `sale_price` (remove "$" and commas)
- Check `paid_vendor === 'true'` OR `paid_vendor === true`
- Calculate amount_paid separately from amount_owed

---

## 📝 Important Patterns

### URL Formats

**Valid Spotify Playlist URL:**
```
https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
                                  ↑ 22-character base62 ID
```

**Invalid/Fake URLs (from CSV import):**
```
https://open.spotify.com/playlist/gymtemazosmotivacion2025
                                  ↑ Slugified name (not a real ID)
```

**URL Extraction Regex:**
```javascript
/spotify\.com\/playlist\/([a-zA-Z0-9]+)/
```

### Genre Storage

**Database**: PostgreSQL `text[]` array
```sql
genres: {"phonk", "brazilian phonk", "rap"}
```

**TypeScript Interface**:
```typescript
genres: string[]  // e.g., ["phonk", "brazilian phonk", "rap"]
```

**Conversion** (in enrichment script):
```sql
ARRAY(SELECT jsonb_array_elements_text('["phonk", "rap"]'::jsonb))
-- Converts JSON array to PostgreSQL text array
```

### Spotify Web API Authentication

**Flow**:
1. Client Credentials Flow (no user login needed)
2. POST to `https://accounts.spotify.com/api/token`
3. Base64 encode `client_id:client_secret`
4. Receive access token (valid ~1 hour)
5. Cache token until expiry
6. Auto-refresh on 401 errors

**Rate Limits**:
- ~100 requests per 30 seconds
- Our scripts use 200ms delay (safe)
- Automatic retry on 429 (rate limit) errors

---

## 🔧 API Integration

### Backend API Routes

**Location**: `apps/api/src/routes/spotify-web-api.ts`

**Endpoints:**
```
GET  /api/spotify-web-api/playlist/:id
GET  /api/spotify-web-api/track/:id
POST /api/spotify-web-api/enrich-playlists
POST /api/spotify-web-api/enrich-tracks
GET  /api/spotify-web-api/extract-id
```

**Example Usage:**
```bash
# Fetch single playlist
curl http://localhost:3002/api/spotify-web-api/playlist/37i9dQZF1DXcBWIGoYBM5M

# Bulk enrich
curl -X POST http://localhost:3002/api/spotify-web-api/enrich-playlists \
  -H "Content-Type: application/json" \
  -d '{"playlist_urls": ["https://open.spotify.com/playlist/..."]}'
```

### Spotify Web API Client

**Location**: `apps/api/src/lib/spotify-web-api.ts`

**Features:**
- Token management with auto-refresh
- Rate limiting and retry logic
- Type-safe API wrappers
- Batch operations (up to 50 items)

**Methods:**
- `getPlaylist(id)` - Fetch playlist metadata
- `getTrack(id)` - Fetch track metadata
- `getTracks(ids[])` - Batch fetch tracks
- `getArtist(id)` - Fetch artist (with genres)
- `getArtists(ids[])` - Batch fetch artists
- `extractSpotifyId(url, type)` - Extract ID from URL

---

## 📊 UI Data Display

### Playlist Table Columns

When viewing playlists under a vendor:

| Column | Source | Format | Example |
|--------|--------|--------|---------|
| Name | `playlists.name` | text | "GYM - TEMAZOS MOTIVACION 2025" |
| Genres | `playlists.genres` | Badge array | [pop] [rock] [indie] |
| Avg Daily Streams | `playlists.avg_daily_streams` | number | 5,000 |
| Followers | `playlists.follower_count` | number | 1,017,748 |
| Cost/1K | `vendors.cost_per_1k_streams` | currency | $2.50 |
| URL | `playlists.url` | link | [Open ↗] |

### Genre Rendering Logic

**Code** (`PlaylistsPage.tsx` line 814):
```typescript
{(playlist.genres && Array.isArray(playlist.genres) && playlist.genres.length > 0) ? (
  <>
    {playlist.genres.slice(0, 3).map((genre) => (
      <Badge key={genre} variant="secondary">{genre}</Badge>
    ))}
    {playlist.genres.length > 3 && (
      <Badge variant="outline">+{playlist.genres.length - 3}</Badge>
    )}
  </>
) : (
  <span className="text-xs text-muted-foreground">-</span>
)}
```

**Display Rules:**
- Show first 3 genres as badges
- If more than 3, show "+X" badge with tooltip
- If no genres, show "-"
- Safely handles null/undefined/empty arrays

---

## 🔐 Authentication & Permissions

### Spotify Web API Credentials

**Client ID**: `294f0422469444b5b4b0178ce438b5b8`  
**Client Secret**: `7320687e4ceb475b82c2f3a543eb2f9e`

**Storage**:
- `apps/api/production.env` (production)
- `apps/api/.env` (local)
- `docker-compose.supabase-project.yml` (container env vars)

### Database Access

**Production**:
- Internal: `http://kong:8000` or `http://supabase_kong_arti-marketing-ops:8000`
- External: `https://api.artistinfluence.com`
- Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

**For scripts on production server:**
```bash
# Use internal Docker network
export SUPABASE_URL="http://kong:8000"
export SUPABASE_SERVICE_ROLE_KEY="..."

# OR use external API
export SUPABASE_URL="https://api.artistinfluence.com"
```

---

## 🎯 Workflow: Adding New Campaigns

### From CSV Import

1. **Upload CSV** to production:
```bash
scp "Spotify Playlisting-Active Campaigns (1).csv" root@164.90.156.78:/root/arti-marketing-ops/
```

2. **Run import**:
```bash
bash scripts/simple-import.sh
```

3. **Enrich playlists**:
```bash
bash scripts/enrich-playlists-direct.sh
```

4. **Merge enriched data**:
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/merge-enriched-playlists.sql
```

5. **Verify in UI**:
- Refresh browser
- Navigate to `/spotify/campaigns`
- Check campaign details
- Verify playlists show follower counts and genres

### Manual Campaign Creation

1. Navigate to `/spotify/campaign-intake`
2. Fill out campaign form:
   - Select/create client
   - Enter track URL
   - Set stream goal and budget
   - Select genre
3. Assign vendors and allocate streams
4. Select playlists from vendor rosters
5. Review and submit
6. Admin approves → Creates campaign_group and spotify_campaign

---

## 🚨 Troubleshooting Guide

### "No data showing for vendor playlists"

**Check:**
```bash
# 1. Is data in database?
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM playlists WHERE follower_count > 0;
"

# 2. Are playlists linked to vendor?
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT name, vendor_id, follower_count FROM playlists WHERE vendor_id IS NOT NULL LIMIT 5;
"

# 3. Check browser console logs
# Look for: 🎵 All playlists loaded, 🎵 Genres value, 🎵 Follower count
```

**Fix:**
- If data is in DB but vendor_id is NULL → Run merge script
- If no data in DB → Run enrichment script
- If data in DB with vendor_id but not in UI → Clear browser cache, restart frontend

### "Enrichment script not finding playlists"

**Check:**
```bash
# Are campaigns imported with playlist_links?
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM spotify_campaigns WHERE playlist_links IS NOT NULL AND playlist_links != '';
"
```

**Fix:**
- If 0 results → Run `bash scripts/simple-import.sh` first
- If CSV missing → Upload CSV to server
- If playlist_links empty → CSV import didn't capture "SP Playlist Stuff" column

### "Duplicate playlists appearing"

**Check:**
```bash
# Find duplicates by name
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT name, COUNT(*) 
FROM playlists 
GROUP BY name 
HAVING COUNT(*) > 1;
"
```

**Fix:**
```bash
# Run cleanup script
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/cleanup-unenriched-playlists.sql
```

### "Playlist edits don't persist"

**Diagnostic Steps:**
1. Edit a playlist → Note the playlist name
2. Click "Update Playlist"
3. Check console for: `🔍 Submit clicked - validating form data:`
4. Check database immediately:
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT url, updated_at FROM playlists WHERE name = 'PLAYLIST_NAME_HERE';
"
```

**Possible Issues:**
- Validation blocking save (check for red toast)
- Duplicate playlists (one updates, other displays)
- Query cache issue (invalidation not working)

**Fix:**
- Add genres if validation error appears
- Run cleanup to remove duplicates
- Hard refresh browser

---

## 📚 Documentation Files

- `SPOTIFY-PLATFORM-COMPLETE-GUIDE.md` - This file
- `SPOTIFY-WEB-API-INTEGRATION.md` - Spotify API setup and usage
- `SPOTIFY-PLAYLIST-ENRICHMENT.md` - Enrichment system details
- `POPULATE-GENRES-GUIDE.md` - How to populate genre data
- `IMPLEMENTATION-SUMMARY-PLAYLIST-ENRICHMENT.md` - Implementation summary
- `scripts/RUN-PLAYLIST-ENRICHMENT.md` - Quick start guide

---

## 🎓 Development Best Practices

### When Adding New Features

1. **Check existing queries** - Don't create duplicate data fetching
2. **Use TypeScript interfaces** - Keep types in sync with database
3. **Invalidate queries properly** - Ensure UI refreshes after mutations
4. **Add console logging** - Helps debug production issues
5. **Handle null/undefined** - Playlists may have incomplete data

### When Debugging UI Issues

1. **Check browser console logs** - Look for fetch errors, validation messages
2. **Verify database state** - Use psql to confirm data exists
3. **Check React Query cache** - May need to invalidate queries
4. **Test on production** - localhost may connect to different DB

### When Running Scripts

1. **Test on small dataset first** - Use LIMIT in queries
2. **Check results before deleting** - Preview what will be deleted
3. **Back up data** - Run exports before major changes
4. **Monitor API rate limits** - Spotify can throttle at high volumes
5. **Use transactions** - For multi-step operations

---

## 🚀 Deployment Checklist

### Frontend Deployment (Vercel)

1. ✅ Code pushed to `main` branch
2. ✅ Production build passes (`npm run build`)
3. ✅ No TypeScript errors
4. ✅ Vercel auto-deploys from GitHub
5. ✅ Environment variables set in Vercel dashboard

### Backend API Deployment (DigitalOcean)

```bash
# 1. SSH to droplet
ssh root@164.90.156.78

# 2. Pull latest code
cd ~/arti-marketing-ops
git pull origin main

# 3. Rebuild API container (if API code changed)
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build api

# 4. Restart services
docker restart supabase_api_arti-marketing-ops

# 5. Run migrations (if database schema changed)
npx supabase migration up

# 6. Verify API health
curl http://localhost:3002/health
```

### Database Migrations

```bash
# On production droplet
cd ~/arti-marketing-ops

# Run pending migrations
npx supabase migration up

# If migration fails with constraint errors
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
DELETE FROM supabase_migrations.schema_migrations WHERE version = 'XXX';
"

# Then retry
npx supabase migration up
```

---

## 📈 Success Metrics

**Current Achievement:**
- ✅ 1,239 campaigns in database
- ✅ 149 playlists with real Spotify URLs
- ✅ 28 playlists with enriched data (follower counts, genres)
- ✅ 3,485 campaign-to-playlist links
- ✅ 242 clients, 12 vendors
- ✅ Playlist URL edits persist properly
- ✅ Genres and follower counts display in UI

**Goals:**
- 🎯 Enrich all 149 playlists with follower counts and genres
- 🎯 Automate weekly playlist data refreshes
- 🎯 Implement fuzzy name matching for better merge results
- 🎯 Add playlist performance tracking over time

---

## 🆘 Emergency Contacts

**If system breaks:**

1. Check logs:
```bash
# Frontend (Vercel)
# View in Vercel dashboard → Deployments → Logs

# Backend API
docker logs -f supabase_api_arti-marketing-ops --tail 100

# Database
docker logs -f supabase_db_arti-marketing-ops --tail 50
```

2. Rollback if needed:
```bash
# Frontend: Revert to previous deployment in Vercel dashboard

# Backend: Revert code and restart
git checkout <previous-commit>
docker restart supabase_api_arti-marketing-ops
```

3. Database recovery:
```bash
# If data is corrupted, re-import from CSV
bash scripts/simple-import.sh
```

---

**This guide contains everything needed to understand, maintain, and extend the Spotify platform. All scripts, queries, and workflows are documented with examples.**

