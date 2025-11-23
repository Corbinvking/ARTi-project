# Spotify Scraper - Frontend UI Updates

**Date:** November 23, 2025  
**Status:** COMPLETE

## Overview

Updated the Spotify Stream Strategist frontend to properly display the new 24h/7d/28d time range data from the scraper and to correctly identify and tag algorithmic playlists.

---

## Changes Made

### 1. Replaced 12m Column with 24h Data

#### Vendor Playlists Table
- **Before:** Table showed 7d, 28d, 12m columns
- **After:** Table now shows 24h, 7d, 28d columns
- Displays actual `streams_24h` data from the database
- All three time ranges now align with what Spotify for Artists provides

#### Summary Cards
- Updated "Total Streams" card to show "Streams (24h)"
- Updated "Streams (28d)" card label for clarity
- Fixed "Unique Vendors" count to exclude algorithmic playlists

#### Vendor Performance Breakdown
- **Before:** Showed Last 7 Days, Last 28 Days, Last 12 Months
- **After:** Shows Last 24 Hours, Last 7 Days, Last 28 Days
- Calculates totals from `streams_24h`, `streams_7d`, `streams_28d`

---

### 2. Algorithmic Playlist Tagging & Display

#### Visual Identification
- **Badge in Table:** Algorithmic playlists now show a green "Algorithmic" badge with radio icon
- **Vendor Column:** Shows "Spotify" instead of "Unknown" for algorithmic playlists
- **Curator Column:** Displays playlist curator name

#### Algorithmic Playlists Section
Enhanced the algorithmic playlists section with:

**Summary Stats:**
- Last 24 Hours
- Last 7 Days
- Last 28 Days

**Individual Playlist Cards:**
- Larger, more readable layout (3 columns on desktop)
- Green themed cards with Radio icon
- "Spotify Official" badge
- Shows all three time ranges (24h, 7d, 28d) in a grid

**Known Algorithmic Playlists:**
- Radio
- Discover Weekly
- Your DJ
- Daylist
- Mixes
- Any playlist with `is_algorithmic: true` flag

---

## Technical Details

### Data Structure
```typescript
interface CampaignPlaylist {
  id: string;
  playlist_name: string;
  playlist_curator: string;
  is_algorithmic: boolean;
  vendor_id?: string;
  streams_24h: number;  // NEW
  streams_7d: number;
  streams_28d: number;
  // streams_12m removed
}
```

### Algorithmic Detection Logic
```typescript
const algorithmicPlaylists = data.filter((p: any) => 
  p.is_algorithmic === true && 
  !p.vendor_id && 
  (p.playlist_curator?.toLowerCase() === 'spotify' || !p.playlist_curator)
);
```

### Vendor Grouping Logic
Updated to properly categorize algorithmic playlists:
```typescript
const vendorName = playlist.vendors?.name || 
  (playlist.is_algorithmic ? 'Spotify (Algorithmic)' : 'Unknown');
```

---

## Files Modified

### Frontend Components
1. `apps/frontend/app/(dashboard)/spotify/stream-strategist/components/CampaignDetailsModal.tsx`
   - Updated vendor playlists table headers (24h, 7d, 28d)
   - Updated table cells to display `streams_24h`, `streams_7d`, `streams_28d`
   - Added algorithmic badge in playlist name cell
   - Updated summary cards to use 24h data
   - Updated vendor performance breakdown to show 24h, 7d, 28d
   - Enhanced algorithmic playlists section with better UI
   - Updated algorithmic stats to calculate from actual playlist data

---

## Database Schema (Already Applied)

### Migration: `043_add_campaign_playlists_timerange_columns.sql`
```sql
ALTER TABLE campaign_playlists 
  ADD COLUMN IF NOT EXISTS streams_24h INTEGER DEFAULT 0;

ALTER TABLE campaign_playlists 
  ADD COLUMN IF NOT EXISTS streams_7d INTEGER DEFAULT 0;

ALTER TABLE campaign_playlists 
  ADD COLUMN IF NOT EXISTS streams_28d INTEGER DEFAULT 0;
```

---

## How It Works

### Data Flow
1. **Scraper** (`run_production_scraper.py`):
   - Logs into Spotify for Artists
   - Scrapes 24h, 7d, 28d data for each campaign
   - Stores in `spotify_campaigns.scrape_data` JSON
   - Syncs to `campaign_playlists` table with individual playlist entries

2. **Frontend** (`CampaignDetailsModal.tsx`):
   - Fetches all `campaign_playlists` for the campaign
   - Separates vendor playlists from algorithmic playlists
   - Displays both sections with proper time-range data
   - Shows algorithmic playlists with green theme and badges

### Algorithmic Playlist Detection
The `is_algorithmic` flag is set by the scraper when it detects:
- Playlist curator is "Spotify"
- Playlist name matches known algorithmic patterns (Radio, Discover Weekly, Your DJ, Daylist, Mixes)
- No vendor assignment (`vendor_id` is NULL)

---

## Testing Checklist

- [x] 24h column displays correct data
- [x] 7d column displays correct data
- [x] 28d column displays correct data
- [x] 12m column removed
- [x] Algorithmic playlists show green badge
- [x] Algorithmic playlists show "Spotify" as vendor
- [x] Algorithmic section shows correct summary stats
- [x] Individual algorithmic cards show all time ranges
- [x] No TypeScript/linter errors
- [ ] Verify on production frontend with real data

---

## Example Output

### Vendor Playlists Table
```
Playlist Name                  | Vendor         | Curator      | 24h  | 7d    | 28d
DUBSTEP BRUTAL DROPS          | Unknown        | —            | 268  | 1,490 | —
Radio 🔵 Algorithmic          | Spotify        | Spotify      | 16   | 38    | —
```

### Algorithmic Playlists Section
```
┌─────────────────────────────────────┐
│ 🔘 Algorithmic Streaming Data    9 │
├─────────────────────────────────────┤
│  24h: 1,234  │  7d: 8,567  │ 28d: 34,567 │
├─────────────────────────────────────┤
│ ┌──────────────────┐                │
│ │ Radio            │                │
│ │ Spotify Official │                │
│ │ 24h  7d   28d    │                │
│ │ 16   38   —      │                │
│ └──────────────────┘                │
│ ┌──────────────────┐                │
│ │ Discover Weekly  │                │
│ │ Spotify Official │                │
│ │ 24h  7d   28d    │                │
│ │ 0    23   —      │                │
│ └──────────────────┘                │
└─────────────────────────────────────┘
```

---

## Deployment

### Local Testing
```bash
cd apps/frontend
npm run dev
# Open http://localhost:3000
# Navigate to a campaign with scraped data
# Verify playlists tab shows 24h/7d/28d data
```

### Production Deployment
```bash
# Build and deploy frontend
cd apps/frontend
npm run build

# Or use existing deployment pipeline
```

---

## Notes

- The 12-month data was never populated by the scraper, so removing it causes no data loss
- Spotify for Artists only provides 24h, 7d, and 28d time ranges
- Algorithmic playlists (Radio, Discover Weekly, etc.) appear on every campaign but are not vendor-managed
- The green theme for algorithmic playlists helps distinguish them from vendor playlists at a glance

---

## Next Steps

1. Test on production frontend
2. Verify data accuracy with actual campaigns
3. Monitor for any UI/UX feedback from users
4. Consider adding tooltips explaining algorithmic vs vendor playlists

---

**All frontend changes complete!** 🎉

