# Spotify Campaign History UI Enhancements

## Overview
Enhanced the Campaign History table to display real-time scraped data from Spotify for Artists, including trend indicators and SFA URL status badges.

---

## 🎯 Key Features Implemented

### 1. **Real Scraped Data Display**
- **Before:** Displayed vendor-promised daily/weekly streams (often inaccurate)
- **After:** Shows actual scraped data from Spotify for Artists
  - **24h Streams**: Real streams in last 24 hours
  - **7d Streams**: Real streams in last 7 days  
  - **28d Streams**: Available in campaign details (future enhancement)

### 2. **Trend Indicators** 🟢🔴
Shows increase/decrease from previous scrape:
- **Green ↑**: Streams increased (e.g., `↑1,234`)
- **Red ↓**: Streams decreased (e.g., `↓567`)
- Calculated by comparing current scrape vs previous scrape (stored in `scrape_data.previous`)

### 3. **SFA URL Status Badges** 🎯

| Badge | Meaning | Appearance |
|-------|---------|------------|
| **✓ Active SFA** | Has valid SFA URL, scraped within 48 hours | Green badge with checkmark |
| **⚠ Stale SFA** | Has SFA URL but not scraped in 48+ hours | Yellow badge with clock |
| **✗ No SFA** | No SFA URL configured | Gray badge with warning |

**Hover tooltips** show:
- Last scraped timestamp
- Hours since last scrape
- Instructions for adding SFA URL

### 4. **Enhanced CSV Export**
Exports now include:
- Streams (24h, 7d, 28d)
- 24h & 7d trends
- Playlist counts per time range
- SFA status
- Last scraped timestamp
- Salesperson

---

## 📊 Database Schema

### Added Fields to `Campaign` Interface

```typescript
interface Campaign {
  // New scraped data fields
  streams_24h?: number;
  streams_7d?: number;
  streams_28d?: number;
  playlists_24h_count?: number;
  playlists_7d_count?: number;
  
  // Trend data
  streams_24h_trend?: number;  // Change from previous scrape
  streams_7d_trend?: number;   // Change from previous scrape
  
  // SFA URL status
  has_sfa_url?: boolean;
  last_scraped_at?: string | null;
  sfa_status?: 'active' | 'stale' | 'no_url' | 'connected' | 'no_access' | 'pending';
  hours_since_scrape?: number;
}
```

### Database Columns Used

From `spotify_campaigns` table:
- `streams_24h` (INTEGER)
- `streams_7d` (INTEGER)
- `streams_28d` (INTEGER)
- `playlists_24h_count` (INTEGER)
- `playlists_7d_count` (INTEGER)
- `playlists_28d_count` (INTEGER)
- `last_scraped_at` (TIMESTAMPTZ)
- `scrape_data` (JSONB) - Contains `previous` object for trends
- `sfa` (TEXT) - SFA URL

---

## 🔧 Implementation Details

### 1. Query Enhancement

**Location:** `CampaignHistory.tsx` (lines 180-270)

```typescript
// Fetch campaigns with scraped data
const { data: songs } = await supabase
  .from('spotify_campaigns')
  .select('*')
  .eq('campaign_group_id', group.id)
  .order('last_scraped_at', { ascending: false, nullsFirst: false });

// Calculate totals
const real_streams_24h = (songs || []).reduce((sum, song) => 
  sum + (parseInt(song.streams_24h) || 0), 0);

// SFA Status Logic
const hasSfaUrl = (songs || []).some((song) => 
  song.sfa && song.sfa.trim() !== '');
const hoursSinceLastScrape = lastScrapedDate 
  ? (Date.now() - lastScrapedDate) / (1000 * 60 * 60) 
  : Infinity;
const sfa_status = !hasSfaUrl ? 'no_url' 
  : (hoursSinceLastScrape < 48 ? 'active' : 'stale');

// Trend Calculation
const mostRecentSong = songs[0]; // Sorted by last_scraped_at desc
if (mostRecentSong?.scrape_data?.previous) {
  streams_24h_trend = curr_24h - prev_24h;
  streams_7d_trend = curr_7d - prev_7d;
}
```

### 2. Scraper Enhancement

**Location:** `spotify_scraper/run_production_scraper.py` (lines 190-220)

**Before updating database, scraper now:**
1. Fetches previous stream values
2. Stores them in `scrape_data.previous` object
3. Frontend can calculate trends from this data

```python
# Fetch previous values
previous_response = requests.get(
  f"{SUPABASE_URL}/rest/v1/spotify_campaigns",
  params={'id': f'eq.{campaign_id}', 'select': 'streams_24h,streams_7d,streams_28d'}
)

# Add to scrape_data
data['scrape_data']['previous'] = {
  'streams_24h': prev_data['streams_24h'],
  'streams_7d': prev_data['streams_7d'],
  'streams_28d': prev_data['streams_28d']
}
```

### 3. UI Components

**Location:** `CampaignHistory.tsx` (lines 935-1050)

**Table Headers:**
- "Daily Streams" → "24h Streams"
- "Weekly Streams" → "7d Streams"

**Table Cells:**
```tsx
<div className="flex items-center justify-center gap-1">
  <span className="font-semibold text-sm">
    {campaign.streams_24h?.toLocaleString() || '0'}
  </span>
  {campaign.streams_24h_trend !== 0 && (
    <span className={campaign.streams_24h_trend > 0 ? 'text-green-400' : 'text-red-400'}>
      {campaign.streams_24h_trend > 0 ? '↑' : '↓'}
      {Math.abs(campaign.streams_24h_trend).toLocaleString()}
    </span>
  )}
</div>
<div className="text-xs text-muted-foreground">
  {campaign.streams_24h !== undefined ? 'scraped' : 'estimated'}
</div>
```

**SFA Badge with Tooltip:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge className="bg-green-500/10 text-green-400 border-green-500/30 border text-xs px-1.5 py-0 cursor-help">
        <CheckCircle className="w-3 h-3 mr-0.5" />
        SFA
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      <p>✓ Active: Scraper updated within 48 hours</p>
      <p className="text-xs">Last scraped: {new Date(campaign.last_scraped_at).toLocaleString()}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 4. SFA Filter Enhancement

**Location:** `CampaignHistory.tsx` (lines 785-815)

Added new filter options:
- ✓ Active (green checkmark)
- ⚠ Stale (yellow warning)
- ✗ No URL (gray X)
- Connected (legacy)
- No Access (legacy)

---

## 🚀 Deployment Steps

### 1. **Deploy Frontend**

```bash
cd /root/arti-marketing-ops
git pull origin main

# Build and restart frontend
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Check logs
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 2. **Update Scraper**

```bash
cd /root/arti-marketing-ops
bash scripts/deploy-spotify-scraper.sh
```

This will:
- Pull latest code
- Install dependencies
- Set up Xvfb
- Verify cron job

### 3. **Verify Cron Job**

```bash
# Check cron is active
crontab -l

# Should show:
# 0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1
```

### 4. **Manual Test Scrape**

```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
```

Check logs:
```bash
tail -f logs/production.log
```

Look for:
```
[7343] Stored previous values: 24h=1234, 7d=8900
[7343] ✓ Raw data updated in spotify_campaigns (with trend history)
```

---

## 📈 Expected Results

### Campaign History Table

**Example Row:**

| Campaign | Status | 24h Streams | 7d Streams | Remaining | Progress |
|----------|--------|-------------|------------|-----------|----------|
| **DAUNTER x URAI**<br>ENGULFED<br>by John<br>Budget: $500 \| Goal: 25,000<br>• Updated 12h ago<br>🟢 **SFA** | Active | **1,490** 🟢↑245<br>scraped | **8,750** 🟢↑1,123<br>scraped | 21,547<br>remaining | 14%<br>████░░░░░░ |

**Badge Colors:**
- 🟢 **SFA** = Green (Active, scraped < 48h ago)
- 🟡 **SFA** = Yellow (Stale, scraped > 48h ago)
- ⚪ **No SFA** = Gray (No SFA URL)

**Trend Indicators:**
- 🟢 **↑245** = Green up arrow (increased by 245 streams)
- 🔴 **↓67** = Red down arrow (decreased by 67 streams)

---

## 🧪 Testing Checklist

### ✅ Frontend Display
- [ ] Campaign rows show SFA status badges
- [ ] Badges have correct colors (green/yellow/gray)
- [ ] Hover tooltips show last scraped time
- [ ] 24h/7d columns show scraped data
- [ ] Trend indicators appear (↑/↓ with green/red)
- [ ] "scraped" vs "estimated" labels correct
- [ ] SFA filter dropdown works
- [ ] Sorting by 24h/7d streams works

### ✅ Data Accuracy
- [ ] Campaigns with SFA URLs show "Active" badge
- [ ] Campaigns without SFA URLs show "No SFA" badge
- [ ] Last scraped timestamp is accurate
- [ ] Stream counts match Spotify for Artists
- [ ] Trends match actual change

### ✅ Scraper
- [ ] Cron job runs daily at 2 AM
- [ ] Previous values are fetched before update
- [ ] `scrape_data.previous` object is populated
- [ ] Logs show "Stored previous values"
- [ ] No errors in production.log

### ✅ CSV Export
- [ ] Export includes 24h/7d/28d streams
- [ ] Trend columns are populated
- [ ] SFA status column correct
- [ ] Last scraped timestamp included

---

## 🐛 Troubleshooting

### Issue: Trends Not Showing

**Cause:** `scrape_data.previous` is null

**Solution:**
1. Run scraper twice (first run stores current, second run calculates trend)
2. Check database:
   ```sql
   SELECT scrape_data->'previous' FROM spotify_campaigns WHERE id = 7343;
   ```
3. Should see: `{"streams_24h": 1234, "streams_7d": 8900, ...}`

### Issue: SFA Badge Not Appearing

**Cause:** `sfa_status` not calculated

**Solution:**
1. Check if campaign has `sfa` URL:
   ```sql
   SELECT id, campaign, sfa, last_scraped_at FROM spotify_campaigns WHERE sfa IS NOT NULL;
   ```
2. Verify frontend query includes all fields
3. Clear browser cache (Ctrl+Shift+R)

### Issue: "estimated" Instead of "scraped"

**Cause:** `streams_24h` is null/undefined

**Solution:**
1. Check if scraper ran successfully:
   ```bash
   tail -f /root/arti-marketing-ops/spotify_scraper/logs/production.log
   ```
2. Verify database has data:
   ```sql
   SELECT id, campaign, streams_24h, streams_7d, last_scraped_at FROM spotify_campaigns WHERE streams_24h > 0;
   ```
3. Run manual scrape:
   ```bash
   cd /root/arti-marketing-ops/spotify_scraper
   bash run_production_scraper.sh
   ```

### Issue: Tooltip Not Showing

**Cause:** TooltipProvider import or component error

**Solution:**
1. Check browser console for errors
2. Verify imports in `CampaignHistory.tsx`:
   ```tsx
   import {
     Tooltip,
     TooltipContent,
     TooltipProvider,
     TooltipTrigger,
   } from '@/components/ui/tooltip';
   ```
3. Rebuild frontend:
   ```bash
   docker-compose -f docker-compose.prod.yml build frontend
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```

---

## 📚 Related Files

### Frontend
- `apps/frontend/app/(dashboard)/spotify/stream-strategist/pages/CampaignHistory.tsx` - Main table component
- `apps/frontend/app/(dashboard)/spotify/stream-strategist/components/CampaignDetailsModal.tsx` - Campaign details modal

### Backend/Scraper
- `spotify_scraper/run_production_scraper.py` - Main scraper script
- `spotify_scraper/run_production_scraper.sh` - Production wrapper script

### Database
- `supabase/migrations/042_add_timerange_columns.sql` - Added streams_24h, streams_7d, streams_28d columns
- `supabase/migrations/043_add_campaign_playlists_timerange_columns.sql` - Added timerange columns to campaign_playlists

### Documentation
- `SPOTIFY-SCRAPER-SYSTEM-DOCS.md` - Complete scraper system documentation
- `SPOTIFY-SCRAPER-DEPLOYMENT.md` - Deployment guide
- `SPOTIFY-SCRAPER-FINAL-STATUS.md` - Final implementation status

---

## 🎉 Success Metrics

After deployment, you should see:

1. **✅ All active campaigns** show green "SFA" badges (if they have SFA URLs)
2. **✅ Stream counts** are real numbers from Spotify (not vendor estimates)
3. **✅ Trend indicators** show for campaigns scraped more than once
4. **✅ Tooltips** provide detailed scrape information
5. **✅ CSV exports** include comprehensive data
6. **✅ Filters** allow quick navigation to campaigns by SFA status

---

**Last Updated:** November 24, 2025  
**Version:** 2.0  
**Status:** ✅ Complete - Ready for Testing



