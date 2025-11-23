# Spotify Scraper - Current Status & Next Steps

## ✅ What's Working

### Backend (100% Complete)
- ✅ Fresh incognito login working perfectly
- ✅ Scraping 24h, 7d, 28d data for all campaigns
- ✅ 131/131 campaigns scraped successfully (100% success rate)
- ✅ Data stored in `spotify_campaigns` table
- ✅ Columns populated:
  - `streams_24h`, `streams_7d`, `streams_28d`
  - `playlists_24h_count`, `playlists_7d_count`, `playlists_28d_count`
  - `last_scraped_at`
  - `scrape_data` (JSON with full playlist details)

### Database Verification
```sql
-- 131 campaigns with fresh data
SELECT COUNT(*) FROM spotify_campaigns WHERE last_scraped_at IS NOT NULL;
-- Result: 131

-- Sample data
campaign: "delete me"
streams_24h: 274
streams_7d: 2,073  
streams_28d: 7,904
playlists_28d_count: 59
last_scraped_at: 2025-11-23 00:55:11
```

---

## ❌ What's Not Working

### Frontend Display Issue

**Problem:** Frontend shows "No Vendor Playlist Data Yet"

**Root Cause:** Data structure mismatch

### Current Data Flow:

```
Scraper → spotify_campaigns table
           ├─ streams_24h, streams_7d, streams_28d  ✅ Populated
           ├─ playlists_*_count                      ✅ Populated
           └─ scrape_data (JSON)                     ✅ Contains playlist details

Frontend ← campaign_playlists table                 ❌ EMPTY!
            Expects individual playlist rows with:
            - playlist_name
            - playlist_spotify_id
            - streams_24h, streams_7d, streams_28d
            - vendor_id
            - etc.
```

---

## 🔧 Two Solutions

### Option 1: Update Scraper to Populate `campaign_playlists` ⭐ RECOMMENDED

**What to do:**
1. After scraping, extract playlist details from `scrape_data`
2. For each playlist, create/update row in `campaign_playlists` table
3. Include: playlist name, Spotify ID, streams per time range, vendor assignment

**Pros:**
- Frontend works immediately (no code changes needed)
- Individual playlist tracking
- Vendor payout calculations work
- Historical playlist performance data

**Cons:**
- More complex scraper logic
- More database writes
- Need to handle playlist matching/deduplication

**Implementation:**
```python
async def update_campaign_playlists(campaign_id, scrape_data):
    """Extract and save individual playlist data"""
    for time_range in ['24hour', '7day', '28day']:
        stats = scrape_data['time_ranges'][time_range]['stats']
        playlists = stats.get('playlists', [])
        
        for playlist in playlists:
            # Upsert to campaign_playlists table
            data = {
                'campaign_id': campaign_id,
                'playlist_name': playlist['name'],
                'playlist_spotify_id': playlist.get('spotify_id'),
                'streams_24h': ...,  # Extract from each time range
                'streams_7d': ...,
                'streams_28d': ...,
                # ... other fields
            }
            # INSERT or UPDATE logic
```

---

### Option 2: Update Frontend to Read from `spotify_campaigns`

**What to do:**
1. Modify `CampaignDetailsModal.tsx` 
2. Query `spotify_campaigns` instead of `campaign_playlists`
3. Display aggregate stats (total streams, count)
4. Extract playlist details from `scrape_data` JSON if needed

**Pros:**
- Simpler (no scraper changes)
- Faster (data already there)

**Cons:**
- Frontend code changes required
- Loses individual playlist tracking
- Vendor payout logic needs updating
- No historical per-playlist data

---

## 📋 Recommended Approach

### Phase 1: Quick Frontend Fix (TODAY)

**File:** `apps/frontend/app/(dashboard)/spotify/stream-strategist/components/CampaignDetailsModal.tsx`

**Change the query** (line 120-203) to show aggregate stats from `spotify_campaigns`:

```typescript
// Instead of querying campaign_playlists, show aggregate data
const { data: campaignStats } = useQuery({
  queryKey: ['campaign-stats', campaign?.id],
  queryFn: async () => {
    const { data: songs } = await supabase
      .from('spotify_campaigns')
      .select('streams_24h, streams_7d, streams_28d, playlists_24h_count, playlists_7d_count, playlists_28d_count')
      .eq('campaign_group_id', campaign.id);
    
    // Aggregate across all songs in campaign
    return {
      streams_24h: songs.reduce((sum, s) => sum + (s.streams_24h || 0), 0),
      streams_7d: songs.reduce((sum, s) => sum + (s.streams_7d || 0), 0),
      streams_28d: songs.reduce((sum, s) => sum + (s.streams_28d || 0), 0),
      playlists_count: songs.reduce((sum, s) => sum + (s.playlists_28d_count || 0), 0),
    };
  }
});
```

**Display:**
- Show aggregate metrics (total streams, playlist count)
- Add note: "Individual playlist breakdown coming soon"
- Keep existing functionality for manual playlist addition

**Time:** 30 minutes  
**Impact:** Users can see the scraped data immediately

---

### Phase 2: Full Playlist Tracking (NEXT WEEK)

**Update scraper** to populate `campaign_playlists` table:
1. Extract playlist details from `scrape_data`
2. Match playlists by Spotify ID
3. Create/update individual playlist rows
4. Link to vendors where applicable

**Time:** 2-3 hours  
**Impact:** Full playlist tracking, vendor payouts, historical data

---

## 🎯 Immediate Action Items

### 1. Verify Database (Done ✅)
```bash
# 131 campaigns with data confirmed
```

### 2. Quick Frontend Update (30 min)
- Show aggregate stats from `spotify_campaigns` table
- Display 24h/7d/28d columns
- Users can see their data TODAY

### 3. Plan Phase 2 (Next sprint)
- Design `campaign_playlists` population logic
- Handle playlist matching/deduplication
- Update vendor payout calculations

---

## 📊 Current Production Data

```
Total campaigns scraped: 131
Success rate: 100%
Data freshness: < 1 hour old
Sample campaign: "delete me"
  - 24h: 274 streams (14 playlists)
  - 7d: 2,073 streams (36 playlists)
  - 28d: 7,904 streams (59 playlists)
```

**The scraper is working perfectly. We just need to surface the data in the UI!** 🎯

---

## 🚀 Decision Needed

**Do you want to:**

**A)** Quick fix - Show aggregate stats in UI (30 min, data visible today)  
**B)** Full solution - Update scraper to populate playlist table (3 hours, full features)  
**C)** Both - Quick fix now, full solution next week ⭐ RECOMMENDED

---

**Last Updated:** 2025-11-23  
**Status:** Backend 100% complete, Frontend needs update  
**Blocker:** Data structure mismatch between scraper output and frontend expectations

