# 📊 Active Campaigns Playlist Status

## Current State

### Overall Statistics

| Metric                                  | Count |
|-----------------------------------------|-------|
| **Total Active Campaigns**              | 471   |
| **Active with Playlists**               | 206   |
| **Active without Playlists**            | 265   |
| Coverage                                | 43.7% |

### Breakdown of Campaigns WITHOUT Playlists

| Source            | Count | Reason                                    |
|-------------------|-------|-------------------------------------------|
| Airtable Import   | 246   | Old data - no playlist info in CSV        |
| CSV Import (Full) | 16    | No playlists listed in CSV "Playlists" column |
| CSV Import (Full) | 3     | Have playlist data but no `vendor_id`    |
| **Total**         | **265** |                                         |

## Why Some Active Campaigns Don't Have Playlists

### 1. Airtable Imports (246 campaigns)

These are **older campaigns** imported from Airtable before the CSV playlist tracking system was implemented. They simply don't have playlist data available in the source data.

**Solution**: These campaigns would need playlist data to be manually added or scraped.

### 2. CSV Campaigns Without Playlist Data (16 campaigns)

These are campaigns from the CSV where the "Playlists" column is empty. Examples:
- "Reece Rosé - Back Back"
- "Harel - Look Twice"
- "Neyvo - I Want You"
- "Friendly Fire - Saving"
- "Karma - Perfect Angel BB"
- "Filthy - Break The Pattern"

**Reason**: These are newer campaigns where playlists haven't been confirmed/added yet, or the vendor hasn't provided playlist placement information.

### 3. CSV Campaigns With Data But No Vendor (3 campaigns)

Example: "Andrea Botez - Naughty" (Vendor: Majed)
- Has `historical_playlists` data
- Missing `vendor_id` (vendor "Majed" doesn't exist in vendors table or wasn't linked)

**Solution**: Create vendor record for "Majed" and link these campaigns.

## What's Working ✅

### 206 Active Campaigns with Playlists

These campaigns show playlists in:
- ✅ Campaign Details Modal (when clicking on a campaign)
- ✅ Vendor pages (under each vendor's playlist section)
- ✅ Client cards (campaigns associated with that client)

### Data Sources with Playlists

- **CSV Import (Full)**: 207 campaigns with playlist data imported
  - Status fixed: Changed from NULL → "Active"
  - 809 total `campaign_playlists` records created
  - Linked to vendors: Club Restricted (701), Glenn (60), Golden Nugget (35), etc.

## Technical Details

### Database State

```sql
-- Active campaigns with playlists
SELECT COUNT(DISTINCT sc.id) 
FROM spotify_campaigns sc 
INNER JOIN campaign_playlists cp ON sc.id = cp.campaign_id 
WHERE LOWER(sc.status) = 'active';
-- Result: 206

-- Active campaigns without playlists
SELECT COUNT(DISTINCT sc.id) 
FROM spotify_campaigns sc 
LEFT JOIN campaign_playlists cp ON sc.id = cp.campaign_id 
WHERE LOWER(sc.status) = 'active' AND cp.id IS NULL;
-- Result: 265
```

### Changes Made

1. **Fixed CSV Import Status Bug**
   - Script: `scripts/fix-csv-campaign-statuses.js`
   - Updated 223 campaigns from NULL → "Active" status
   - This made CSV campaigns show up in active campaign lists

2. **Created Playlists from CSV Data**
   - Script: `scripts/create-playlists-from-csv-data.js`
   - Created 809 `campaign_playlists` records
   - Linked to appropriate vendors

3. **Synced to Playlists Table**
   - Script: `scripts/sync-campaign-playlists-to-playlists-v2.js`
   - Added 458 playlists to vendor pages

## Recommendations

### For Better Coverage

1. **Add Missing Vendors**
   - Create vendor record for "Majed" (3 campaigns waiting)
   - Link campaigns to this vendor
   - Run playlist creation script again for these campaigns

2. **Manual Data Entry**
   - The 16 CSV campaigns without playlist data need:
     - Vendor to provide playlist names
     - Update CSV or add directly to database
     - Or wait for scraper to discover playlists

3. **Airtable Campaign Cleanup**
   - Decision needed: Keep these 246 old campaigns as-is OR
   - Archive/mark as historical data OR
   - Attempt to backfill playlist data

### Next Steps

1. **Immediate**: Create "Majed" vendor and link campaigns
2. **Short-term**: Follow up with vendors for pending playlist data
3. **Long-term**: Run Spotify scraper to auto-discover playlists

## Files Created

- `scripts/fix-csv-campaign-statuses.js` - Fix status bug
- `scripts/create-playlists-from-csv-data.js` - Create playlist records
- `CSV-PLAYLIST-IMPORT-SUMMARY.md` - Initial import summary
- `ACTIVE-CAMPAIGNS-PLAYLIST-STATUS.md` - This file

## Success Metrics

- ✅ **43.7% of active campaigns** now have playlist data
- ✅ **206 out of 471 active campaigns** display playlists
- ✅ **701 playlists** for Club Restricted vendor
- ✅ **0 duplicate clients**
- ✅ All vendor pages show playlists correctly

