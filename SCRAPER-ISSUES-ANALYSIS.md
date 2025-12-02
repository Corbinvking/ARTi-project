# Scraper Issues Analysis

**Date:** December 2, 2025  
**Status:** Identified - Pending Fix

---

## 🐛 Issue #1: No Historical Data in `scraped_data` Table

### Problem
The scraper is **NOT** saving historical scraped data to the `scraped_data` table, despite it existing in the database.

### Root Cause
Looking at `spotify_scraper/run_production_scraper.py`:

**Line 255:** The scraper stores all data in `spotify_campaigns.scrape_data` column (JSONB):
```python
return {
    'streams_24h': stats_24h.get('streams', 0),
    'streams_7d': stats_7d.get('streams', 0),
    'streams_28d': stats_28d.get('streams', 0),
    'playlists_24h_count': len(stats_24h.get('playlists', [])),
    'playlists_7d_count': len(stats_7d.get('playlists', [])),
    'playlists_28d_count': len(stats_28d.get('playlists', [])),
    'last_scraped_at': datetime.now(timezone.utc).isoformat(),
    'scrape_data': song_data  # ← This goes to spotify_campaigns.scrape_data
}
```

**Line 265-302:** The `update_campaign_in_database()` function **ONLY** updates `spotify_campaigns`:
```python
async def update_campaign_in_database(campaign_id, data):
    """Update campaign data in spotify_campaigns table (raw data storage)"""
    # ... fetches previous values ...
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {'id': f'eq.{campaign_id}'}
    response = requests.patch(url, headers=headers, params=params, json=data)
    # ← ONLY updates spotify_campaigns, never inserts into scraped_data
```

### Current Behavior
- ❌ No historical records are created
- ❌ Each scrape **overwrites** the previous data in `spotify_campaigns.scrape_data`
- ❌ Cannot track trends over time beyond "previous" vs "current"
- ❌ `scraped_data` table is empty

### Expected Behavior
- ✅ Each scrape should INSERT a new row into `scraped_data` table
- ✅ Historical data should be preserved for trend analysis
- ✅ `spotify_campaigns.scrape_data` should contain only the **most recent** scrape
- ✅ Can query `scraped_data` to see campaign performance over weeks/months

### Database Schema Reference
**`scraped_data` table** (from `supabase/migrations/012_create_scraped_data_table.sql`):
```sql
CREATE TABLE IF NOT EXISTS scraped_data (
    id SERIAL PRIMARY KEY,
    org_id UUID,
    platform TEXT DEFAULT 'spotify',
    song_url TEXT NOT NULL,
    artist_name TEXT,
    song_title TEXT,
    album_name TEXT,
    release_date DATE,
    duration_ms INTEGER,
    popularity INTEGER,
    explicit BOOLEAN,
    genres TEXT[],
    external_urls JSONB,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB,  -- ← Full scraped data should go here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🐛 Issue #2: Algorithmic Playlists Reset After Scrape

### Problem
When the scraper runs, it **resets** all `is_algorithmic` flags to `FALSE`, causing algorithmic playlists (Discover Weekly, Radio, Your DJ, etc.) to be displayed as regular vendor playlists.

### Root Cause
Looking at `spotify_scraper/run_production_scraper.py` **lines 305-387** (`sync_to_campaign_playlists` function):

**Line 351-358:** The scraper **DELETES** all existing playlists for a campaign:
```python
# First, delete existing campaign_playlists entries for this campaign
# This ensures we only show current data
delete_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
delete_params = {'campaign_id': f'eq.{campaign_id}'}

delete_response = requests.delete(delete_url, headers=headers, params=delete_params)
if delete_response.status_code not in [200, 204]:
    logger.warning(f"[{campaign_id}] Could not delete old playlists: {delete_response.status_code}")
```

**Line 361-370:** Then **RE-INSERTS** playlists with only these fields:
```python
for playlist_data in playlists_by_id.values():
    record = {
        'campaign_id': campaign_id,
        'playlist_name': playlist_data['playlist_name'],
        'streams_24h': playlist_data['streams_24h'],  # ← ONLY these 5 fields
        'streams_7d': playlist_data['streams_7d'],
        'streams_28d': playlist_data['streams_28d'],
    }
    playlist_records.append(record)
```

**Missing from insert:**
- ❌ `is_algorithmic` flag
- ❌ `playlist_curator` field
- ❌ `vendor_id` reference
- ❌ Any other existing playlist metadata

### Current Behavior
- ❌ After scrape, ALL playlists have `is_algorithmic = FALSE` (default value)
- ❌ Discover Weekly, Radio, Your DJ, etc. show as vendor playlists in UI
- ❌ Green "Algorithmic" badges disappear from frontend
- ❌ Algorithmic playlist section is empty or missing
- ❌ Vendor performance calculations are skewed

### Expected Behavior
- ✅ `is_algorithmic` flag should be **preserved** or **re-detected** during sync
- ✅ Algorithmic playlists should remain tagged after scrapes
- ✅ Frontend should consistently show algorithmic vs vendor playlists
- ✅ No need to manually re-tag playlists after every scrape

### Detection Logic Reference
From `scripts/tag-algorithmic-playlists.js` **lines 13-30**:
```javascript
const ALGORITHMIC_PATTERNS = [
  'radio',
  'discover weekly',
  'your dj',
  'daylist',
  'mixes',
  'release radar',
  'daily mix',
  'on repeat',
  'repeat rewind'
];

const SPOTIFY_CURATORS = [
  'spotify',
  'spotify official',
  'algorithmic'
];

// Check if it matches algorithmic patterns
const isAlgorithmic = ALGORITHMIC_PATTERNS.some(pattern => name.includes(pattern)) ||
                     SPOTIFY_CURATORS.some(curator_name => curator.includes(curator_name));
```

### Database Schema Reference
**`campaign_playlists` table** (from migrations 029 + 033):
```sql
CREATE TABLE IF NOT EXISTS campaign_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER REFERENCES spotify_campaigns(id) ON DELETE CASCADE,
  playlist_name TEXT NOT NULL,
  playlist_curator TEXT,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  streams_24h INTEGER DEFAULT 0,  -- Added in migration 043
  streams_7d INTEGER DEFAULT 0,
  streams_28d INTEGER DEFAULT 0,
  streams_12m INTEGER DEFAULT 0,
  is_algorithmic BOOLEAN DEFAULT FALSE,  -- Added in migration 033
  date_added TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Impact Summary

### Issue #1 Impact (No Historical Data)
- **Severity:** Medium
- **User Impact:** Cannot track long-term trends, historical performance analysis is impossible
- **Data Loss:** Every scrape overwrites previous data
- **Workaround:** None - historical data is permanently lost

### Issue #2 Impact (Algorithmic Reset)
- **Severity:** High
- **User Impact:** UI shows incorrect playlist categorization after every scrape
- **User Confusion:** Algorithmic playlists appear as vendor playlists, skewing reports
- **Workaround:** Manually run `FIX-ALGORITHMIC-FLAGS.sql` or `tag-algorithmic-playlists.js` after each scrape

---

## 🔧 Proposed Solution Strategy

### For Issue #1 (Historical Data)

**Option A: Insert into `scraped_data` table**
```python
async def save_to_scraped_data_table(campaign, scrape_data):
    """Insert a historical record of this scrape"""
    record = {
        'org_id': campaign.get('org_id'),
        'platform': 'spotify',
        'song_url': campaign['sfa'],
        'artist_name': campaign.get('artist_name'),
        'song_title': campaign.get('track_name'),
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'raw_data': scrape_data  # Full JSON of scraped data
    }
    
    url = f"{SUPABASE_URL}/rest/v1/scraped_data"
    response = requests.post(url, headers=headers, json=record)
    return response.status_code in [200, 201]
```

**Call this in addition to updating `spotify_campaigns`**

---

### For Issue #2 (Algorithmic Playlists)

**Option A: Preserve existing flags (UPDATE instead of DELETE + INSERT)**
```python
# Instead of deleting all playlists, UPDATE existing ones
# For new playlists, INSERT with detected is_algorithmic flag
```

**Option B: Re-detect algorithmic playlists during sync**
```python
ALGORITHMIC_PATTERNS = ['radio', 'discover weekly', 'your dj', 'daylist', ...]

def is_algorithmic_playlist(playlist_name, curator=''):
    name = playlist_name.lower()
    curator = (curator or '').lower()
    return any(pattern in name for pattern in ALGORITHMIC_PATTERNS) or 'spotify' in curator

# Then set is_algorithmic when creating records
record = {
    'campaign_id': campaign_id,
    'playlist_name': playlist_data['playlist_name'],
    'is_algorithmic': is_algorithmic_playlist(playlist_data['playlist_name']),
    'streams_24h': ...
}
```

**Recommended: Option B** - Auto-detect algorithmic playlists, no manual tagging needed

---

## 📋 Next Steps

1. ✅ **Analysis Complete** - Both issues identified and documented
2. ⏳ **Review with client** - Confirm proposed solutions
3. ⏳ **Implement fixes** - Update `run_production_scraper.py`
4. ⏳ **Test locally** - Verify both issues are resolved
5. ⏳ **Deploy to production** - Push fixes and verify live
6. ⏳ **Monitor first scrape** - Ensure historical data saves and flags persist

---

## 🔍 Code Files to Modify

1. **`spotify_scraper/run_production_scraper.py`**
   - Add `save_to_scraped_data_table()` function (Issue #1)
   - Modify `sync_to_campaign_playlists()` to preserve/detect `is_algorithmic` (Issue #2)
   - Call historical save function after successful scrape

2. **Testing:**
   - Run `python spotify_scraper/run_production_scraper.py --limit 1`
   - Verify `scraped_data` table has new rows
   - Verify `is_algorithmic` flags remain `TRUE` for algorithmic playlists

---

**End of Analysis**

