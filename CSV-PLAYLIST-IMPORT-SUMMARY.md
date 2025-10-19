# 🎵 CSV Playlist Import Summary

## Problem Identified

The CSV import script (`scripts/import-csv-campaigns-full.js`) was importing campaign data but **NOT creating playlist records** in the `campaign_playlists` table. The playlist data was only being stored in two fields on the `spotify_campaigns` table:
- `historical_playlists`: JSON array like `[{"name":"DUBSTEP BRUTAL DROPS","isNew":true}]`
- `playlist_links`: String with playlist URLs separated by newlines

This meant that:
- No playlists were showing under vendors in the UI
- The Campaign Details Modal had no playlist data
- The Playlists page was empty

## Solution Implemented

### 1. Created New Script: `scripts/create-playlists-from-csv-data.js`

This script:
- Reads all `spotify_campaigns` records that have `historical_playlists` data
- Parses the JSON array of playlist objects
- Creates `campaign_playlists` records for each playlist
- Links playlists to the correct vendor via `vendor_id`
- Marks algorithmic playlists (Discover Weekly, Radio, etc.)
- Marks new playlists from the CSV with `is_new` flag
- Sets `added_via_csv` flag to track source

### 2. Script Execution Results

```
✅ Playlists created: 809
⏭️  Already existed: 4
❌ Errors: 0
```

### 3. Vendor Breakdown

| Vendor          | Playlist Count |
|-----------------|---------------|
| Club Restricted | 701           |
| Glenn           | 60            |
| Golden Nugget   | 35            |
| Moon            | 13            |
| Levianth        | 12            |
| House Views     | 9             |
| Alekk           | 8             |

### 4. Synced to Playlists Table

Ran `sync-campaign-playlists-to-playlists-v2.js` to populate the `playlists` table:
```
✅ Playlists inserted: 458
🔄 Playlists updated: 14
```

This ensures playlists show on the Vendors/Playlists page.

## Data Quality Notes

### Issue: Some Playlist Names are URLs

Many "playlist names" in the CSV are actually playlist URLs (e.g., `https://open.spotify.com/playlist/...`). This happened because the "Playlists" column in the CSV contains free-form text that sometimes includes:
- Playlist names (e.g., "DUBSTEP BRUTAL DROPS")
- Playlist URLs (should be in "SP Playlist Stuff" column)

**Recommendation:** Clean up these records by:
1. Identifying playlists where `playlist_name` starts with "http"
2. Extracting the actual playlist name from Spotify API
3. Updating the `playlist_name` field

### Duplicate Clients Status

✅ **No duplicate clients found** (verified after previous cleanup)

## Next Steps

### For Production Deployment

1. **Run migrations** (if any new columns were added)
2. **Run the import script** on production:
   ```bash
   node scripts/import-csv-campaigns-full.js
   ```
3. **Create playlists from CSV data**:
   ```bash
   node scripts/create-playlists-from-csv-data.js
   ```
4. **Sync to playlists table**:
   ```bash
   node scripts/sync-campaign-playlists-to-playlists-v2.js
   ```

### For Better Data Quality

1. **Clean up URL-based playlist names**:
   - Query playlist names that start with "http"
   - Use Spotify API to get actual playlist names
   - Update records

2. **Run Spotify Scraper**:
   - The `streams_28d` fields are currently 0
   - Need to run scraper to populate actual stream data
   - This will match playlists by name to scraped data

3. **Verify Client Card Display**:
   - Check that playlists show in Client Detail modals
   - Verify Campaign Details Modal shows all playlists
   - Test Vendor pages show their playlists

## Files Created/Modified

### New Files
- `scripts/create-playlists-from-csv-data.js` - Creates campaign_playlists from CSV data

### Modified Files
- None (new script is standalone)

## Database State

### Tables Updated
1. `campaign_playlists` - **+809 records**
2. `playlists` - **+458 records**

### Key Data Points
- **Total campaigns with vendor assigned**: 761
- **Total campaign_playlists**: 809
- **Unique playlist names** in `playlists` table: 458
- **Clients**: 259 (no duplicates)
- **Vendors**: 7 active

## Verification Queries

```sql
-- Check playlists per vendor
SELECT v.name, COUNT(cp.id) as playlist_count 
FROM vendors v 
LEFT JOIN campaign_playlists cp ON v.id = cp.vendor_id 
GROUP BY v.name 
ORDER BY playlist_count DESC;

-- Check campaigns with playlists
SELECT 
  COUNT(DISTINCT cp.campaign_id) as campaigns_with_playlists,
  COUNT(cp.id) as total_playlist_assignments
FROM campaign_playlists cp;

-- Check for playlist URLs stored as names
SELECT COUNT(*) as url_names
FROM campaign_playlists
WHERE playlist_name LIKE 'http%';

-- Check new playlists from CSV
SELECT COUNT(*) FROM campaign_playlists WHERE is_new = TRUE;
SELECT COUNT(*) FROM campaign_playlists WHERE added_via_csv = TRUE;
```

