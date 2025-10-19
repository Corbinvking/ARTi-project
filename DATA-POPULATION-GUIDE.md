# Data Population Guide

This guide explains how to populate your Spotify campaign platform with data from various sources.

## Overview

The platform now separates playlists into two categories:
1. **Vendor Playlists** - Playlists from paid vendors (Club Restricted, Glenn, Golden Nugget, etc.)
2. **Spotify Algorithmic Playlists** - Spotify's own playlists (Discover Weekly, Radio, Release Radar, etc.)

## Step-by-Step Data Population

### 1. Scrape Artist Data from S4A List

The `s4alist.md` file contains Spotify for Artists links for various songs. Run the scraper to collect playlist data:

```bash
cd spotify_scraper
python run_s4a_list.py
```

This will:
- Parse all SFA links from `s4alist.md`
- Scrape playlist data for each song
- Save data files to `spotify_scraper/data/`
- Automatically create client records if they don't exist

**Expected Output:**
- One JSON file per song in `data/` directory
- Console showing progress for each artist

### 2. Import Campaign Data from CSV

The `Spotify Playlisting-Active Campaigns.csv` contains all active campaigns with clients, goals, budgets, and vendors.

```bash
cd ..  # Back to project root
node scripts/import-csv-campaigns.js
```

This will:
- Create client records (if they don't exist)
- Create campaign_groups for each artist
- Create individual spotify_campaigns for each song
- Link campaigns to vendors
- Populate goals, budgets, start dates, etc.

**What gets imported:**
- Campaign names
- Client information
- Goals and remaining streams
- Sale prices
- Vendor assignments
- Status
- Notes
- Spotify track URLs and SFA links

### 3. Populate Playlist-Vendor Data

After scraping, run the populate script to link playlists to campaigns and separate algorithmic vs vendor playlists:

```bash
node scripts/populate-playlist-vendor-data-v2.js
```

This will:
- Read all scraped JSON files from `spotify_scraper/data/`
- Match playlists to campaigns by track ID
- Separate Spotify algorithmic playlists from vendor playlists
- Populate the `campaign_playlists` table
- Calculate streams for each playlist

**Playlist Separation Logic:**
- **Algorithmic Playlists** (marked with `is_algorithmic=true`):
  - Discover Weekly
  - Radio
  - Release Radar
  - Daylist
  - Smart Shuffle
  - Your DJ
  - Mixes
  
- **Vendor Playlists** (marked with `is_algorithmic=false`):
  - All other playlists
  - Matched to vendors by curator name or campaign vendor assignment

### 4. View Results in UI

Once populated, you can view the data in the platform:

1. Navigate to **Campaigns** tab
2. Click on any campaign to open the details modal
3. Go to the **Playlists** tab

You'll see two sections:
- **Spotify Algorithmic Playlists** - Shows Discover Weekly, Radio, etc. with stream counts
- **Vendor Playlists** - Shows all paid vendor playlists grouped by vendor

## Database Schema

### New Column Added

```sql
ALTER TABLE campaign_playlists 
ADD COLUMN is_algorithmic BOOLEAN DEFAULT FALSE;
```

This column determines whether a playlist is:
- `true` - Spotify algorithmic playlist (Discover Weekly, Radio, etc.)
- `false` - Vendor playlist (paid placement)

### Key Tables

1. **campaign_playlists** - Links playlists to campaigns
   - `campaign_id` - Links to spotify_campaigns
   - `vendor_id` - NULL for algorithmic playlists
   - `playlist_name`
   - `playlist_curator`
   - `streams_28d`, `streams_7d`, `streams_12m`
   - `is_algorithmic` - NEW: Separates Spotify from vendor playlists
   - `date_added`

2. **spotify_campaigns** - Individual song campaigns
   - `campaign_group_id` - Links to campaign_groups
   - `client_id`
   - `url` - Spotify track URL
   - `sfa` - Spotify for Artists link
   - `vendor` - Vendor name
   - `goal`, `remaining`
   - `sale_price`

3. **campaign_groups** - Artist/album groupings
   - `name` - Artist or album name
   - `client_id`
   - `total_goal`, `total_budget`
   - `status`

4. **clients** - Client records
   - `name`
   - `email`

## Maintenance

### Re-scraping Data

To update playlist data (recommended weekly):

```bash
# Scrape updated data
cd spotify_scraper
python run_s4a_list.py

# Update database
cd ..
node scripts/populate-playlist-vendor-data-v2.js
```

The populate script will:
- Update existing playlist records
- Add new playlists that appear
- Keep historical data

### Adding New Songs

1. Add the SFA link to `s4alist.md` under the appropriate artist
2. Run `python spotify_scraper/run_s4a_list.py`
3. Run `node scripts/populate-playlist-vendor-data-v2.js`

OR

1. Add the campaign to the CSV
2. Run `node scripts/import-csv-campaigns.js`
3. Scrape the song and populate playlists

## Troubleshooting

### "No campaign found for track"

**Cause:** The track ID in scraped data doesn't match any campaign in the database.

**Solution:** 
1. Check that the campaign exists in `spotify_campaigns`
2. Verify the `url` or `sfa` field contains the correct track ID
3. Run the CSV import if the campaign is missing

### "No vendor found"

**Cause:** The playlist couldn't be matched to a vendor.

**Solution:**
1. Check if the vendor exists in the `vendors` table
2. Update the `VENDOR_PLAYLIST_MAP` in the populate script
3. Ensure the campaign has a vendor assigned

### Playlists not showing in UI

**Cause:** Either no data scraped, or playlists have no streams.

**Solution:**
1. Verify scraped JSON files exist in `spotify_scraper/data/`
2. Check the `campaign_playlists` table has records
3. Ensure campaigns are linked to songs via `campaign_group_id`

## Production Deployment

After populating locally, deploy the migration to production:

```bash
# SSH into production server
ssh root@artistinfluence.com

cd /root/arti-marketing-ops

# Apply migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/033_add_algorithmic_playlists.sql

# Run populate scripts (copy your local data/ directory first)
node scripts/populate-playlist-vendor-data-v2.js
```

## Next Steps

1. ✅ Separate algorithmic playlists in UI
2. ✅ Create scraper script for s4alist.md
3. ✅ Create CSV import script
4. ✅ Update populate script to handle separation
5. ⏭️ Schedule weekly scraping (cron job)
6. ⏭️ Add playlist performance charts
7. ⏭️ Add vendor cost tracking

