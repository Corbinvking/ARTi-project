# Campaign Details Data Routing Fix

## 🎯 **Problem**
Campaign details modal was not displaying accurate data. Fields like Client, Budget, Stream Goal, Remaining Streams, Genre, Duration, Daily/Weekly streams, and External Streaming Sources (Radio, Discover Weekly) were empty or showing incorrect values.

## ✅ **Solution Implemented**

### **Comprehensive Data Fetching**

Updated `CampaignDetailsModal.tsx` `fetchCampaignDetails()` function to:

1. **Fetch Campaign Group Data** (from `campaign_groups` table)
   - Campaign name, status, start_date, end_date
   - Total budget, total goal
   - Salesperson, notes (genre)
   - Client relationship

2. **Fetch Client Data** (via relationship)
   - Client name
   - Client emails

3. **Fetch All Songs** (from `spotify_campaigns` table)
   - All songs belonging to this campaign group
   - Individual song goals, remaining, daily, weekly streams
   - Track URLs

4. **Fetch Algorithmic Playlists** (from `campaign_playlists` table)
   - Filter by `is_algorithmic = true`
   - Separate Radio streams vs Discover Weekly streams
   - Calculate totals for "External Streaming Sources"

### **Calculated Fields**

#### **Duration**
```typescript
if (campaignGroup.start_date && campaignGroup.end_date) {
  // Calculate days between start and end
  durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
} else if (campaignGroup.start_date) {
  // Calculate days from start to now
  durationDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
```

#### **Daily/Weekly Streams**
```typescript
const totalDaily = songs?.reduce((sum, song) => 
  sum + (parseInt(song.daily) || song.daily_streams || 0), 0
) || 0;

const totalWeekly = songs?.reduce((sum, song) => 
  sum + (parseInt(song.weekly) || song.weekly_streams || 0), 0
) || 0;
```

#### **Remaining Streams**
```typescript
const totalRemaining = songs?.reduce((sum, song) => 
  sum + (parseInt(song.remaining) || 0), 0
) || 0;
```

#### **External Streaming Sources**
```typescript
// Radio Streams
radioStreams = algorithmicPlaylists
  .filter(p => p.playlist_name?.toLowerCase().includes('radio'))
  .reduce((sum, p) => sum + (p.streams_28d || 0), 0);

// Discover Weekly Streams
discoverWeeklyStreams = algorithmicPlaylists
  .filter(p => p.playlist_name?.toLowerCase().includes('discover weekly'))
  .reduce((sum, p) => sum + (p.streams_28d || 0), 0);
```

### **Enriched Data Structure**

The modal now receives a comprehensive `campaignData` object:

```typescript
const enrichedData = {
  ...campaignGroup,                      // Base campaign group data
  client_name: campaignGroup.clients?.name,
  budget: parseFloat(campaignGroup.total_budget),
  stream_goal: campaignGroup.total_goal,
  remaining_streams: totalRemaining,
  sub_genre: campaignGroup.notes,        // Genre stored in notes
  duration_days: durationDays,
  daily_streams: totalDaily,
  weekly_streams: totalWeekly,
  radio_streams: radioStreams,           // ✅ NEW
  discover_weekly_streams: discoverWeeklyStreams, // ✅ NEW
  track_url: songs?.[0]?.url,
  songs: songs,
};
```

## 📊 **Data Sources**

| Field | Source Table | Column/Calculation |
|-------|--------------|-------------------|
| **Client** | `clients` | `name` (via relationship) |
| **Budget** | `campaign_groups` | `total_budget` |
| **Stream Goal** | `campaign_groups` | `total_goal` |
| **Remaining Streams** | `spotify_campaigns` | SUM of `remaining` for all songs |
| **Genre** | `campaign_groups` | `notes` field |
| **Duration** | `campaign_groups` | Calculated from `start_date` to `end_date` or now |
| **Daily Streams** | `spotify_campaigns` | SUM of `daily` or `daily_streams` for all songs |
| **Weekly Streams** | `spotify_campaigns` | SUM of `weekly` or `weekly_streams` for all songs |
| **Radio Streams** | `campaign_playlists` | SUM of `streams_28d` where `is_algorithmic=true` AND `playlist_name` contains 'radio' |
| **Discover Weekly** | `campaign_playlists` | SUM of `streams_28d` where `is_algorithmic=true` AND `playlist_name` contains 'discover weekly' |
| **Salesperson** | `campaign_groups` | `salesperson` |

## 🎨 **UI Display**

### **Campaign Details Tab**

Shows in a 2-column grid:
- ✅ Client (from `clients.name`)
- ✅ Budget (from `campaign_groups.total_budget`)
- ✅ Stream Goal (from `campaign_groups.total_goal`)
- ✅ Remaining Streams (calculated from songs)
- ✅ Genre (from `campaign_groups.notes`)
- ✅ Duration (calculated in days)
- ✅ Salesperson (from `campaign_groups.salesperson`)

### **External Streaming Sources Section**

Shows in a 3-column grid:
- ✅ **Radio Streams** - Sum of all Radio algorithmic playlists
- ✅ **Discover Weekly** - Sum of all Discover Weekly algorithmic playlists
- ✅ **Total External** - Sum of both

Last updated timestamp from `campaign_groups.updated_at`

## 🚀 **Deployment**

Changes deployed to production via Vercel.

### **Verification Steps**

1. Navigate to: `https://app.artistinfluence.com/spotify/campaigns`
2. Click on any campaign (e.g., "Lani Daye", "Conrad Taylor", "Segan - DNBMF")
3. Verify **Campaign Details** tab shows:
   - ✅ Client name
   - ✅ Budget amount
   - ✅ Stream goal
   - ✅ Remaining streams
   - ✅ Genre
   - ✅ Duration in days
   - ✅ Salesperson
4. Verify **External Streaming Sources** section shows:
   - ✅ Radio Streams count
   - ✅ Discover Weekly count
   - ✅ Total External count
   - ✅ Last updated date

## 📝 **Notes**

- All data is now sourced from real database tables
- Calculations are performed server-side for accuracy
- External streaming sources use actual scraped Spotify algorithmic playlist data
- Campaign groups can have multiple songs, all aggregated properly
- Duration handles both active campaigns (start to end) and ongoing campaigns (start to now)

## 🔄 **Version**

- **Version**: v1.0.2
- **Deployed**: 2025-01-21
- **Files Changed**: 
  - `apps/frontend/app/(dashboard)/spotify/stream-strategist/components/CampaignDetailsModal.tsx`

