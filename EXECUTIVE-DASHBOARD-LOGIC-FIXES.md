# 🔧 Executive Dashboard Logic Fixes Needed

## Issues Identified

### 1. **Streams Past 30 Days** ❌
**Current Logic:**
```typescript
playlistData.filter(p => new Date(p.created_at) >= past30Days)
```

**Problem:** This counts streams from playlists CREATED in last 30 days, not actual stream activity in last 30 days.

**Fix:** Should sum ALL `streams_28d` (which is already "past 28 days" data from Spotify)

### 2. **Campaigns Added (30d)** ❌
**Current Logic:**
```typescript
campaigns.filter(c => new Date(c.created_at) >= past30Days).length
```

**Problem:** If all your campaigns were imported recently, this shows ALL campaigns, not NEW campaigns this month.

**Fix:** This logic is actually correct IF creation dates are accurate. The issue might be that CSV import set all `created_at` to the import date.

### 3. **Avg Cost per 1K Streams** ❌
**Current Logic:**
```typescript
averageCostPerStream * 1000
// Where: averageCostPerStream = totalRevenue / totalActualStreams
```

**Problem:** 
- `totalRevenue` = sum of ALL campaign budgets (even if not spent)
- `totalActualStreams` = sum of `streams_28d` (only 28 days, not campaign lifetime)

**Result:** $5,268 per 1K streams is WRONG!

**Fix:** Should be: `(total_budget / total_goal) * 1000` OR track actual spending vs streams delivered

### 4. **Campaign Efficiency** ⚠️
**Current Logic:**
```typescript
(completedCampaigns.length / totalCampaigns) * 100
```

**Problem:** Most campaigns are probably "Active", not "Completed", so this shows 0%.

**Better Metric:** Calculate goal achievement: `(totalActualStreams / totalStreamGoals) * 100`

### 5. **Total Streams** ⚠️
**Current Logic:**
```typescript
playlistData.reduce((sum, playlist) => sum + (playlist.streams_28d || 0), 0)
```

**Problem:** 
- Counts ALL playlists (including duplicates if same playlist appears for multiple songs)
- `streams_28d` is for 28 days, but campaigns might be months old

**Better:** This is actually reasonable for "current 28-day performance"

## Recommended Fixes

### Fix 1: Streams Past 30 Days
**Should be:** Total streams from ALL active campaign playlists (last 28 days)

```typescript
// Use ALL playlists, not just recently created ones
const totalStreamsPast30Days = Array.isArray(playlistData)
  ? playlistData.reduce((sum, p) => sum + (p.streams_28d || 0), 0)
  : 0;
```

### Fix 2: Avg Cost per 1K Streams
**Should be:** Cost effectiveness based on goals

```typescript
// Option A: Based on goal achievement
const averageCostPer1kStreams = totalStreamGoals > 0
  ? (totalRevenue / totalStreamGoals) * 1000
  : 0;

// Option B: Based on actual delivered streams
const averageCostPer1kStreams = totalActualStreams > 0
  ? (totalRevenue / totalActualStreams) * 1000
  : 0;

// Option C: Market rate (if you track actual costs)
// This requires tracking: actual_spent per campaign
```

### Fix 3: Campaign Efficiency
**Should be:** Goal achievement rate

```typescript
// Better metric: How close are we to hitting goals?
const campaignEfficiency = totalStreamGoals > 0
  ? (totalActualStreams / totalStreamGoals) * 100
  : 0;
```

### Fix 4: Campaign Growth MoM
**Current might be fine**, but verify creation dates aren't all the same (from CSV import)

### Fix 5: Vendor Efficiency Calculation
**Current:**
```typescript
efficiency: Math.min(efficiency / 1000, 100)
```

**Problem:** Dividing by 1000 makes no sense for efficiency. Should be a percentage.

**Fix:**
```typescript
// Efficiency = actual streams / expected streams * 100
// Or: streams per dollar spent
```

## Quick Wins

### Priority 1: Fix "Streams Past 30 Days"
Remove the date filter - use ALL playlist streams:
```typescript
const totalStreamsPast30Days = totalActualStreams; // Already calculating this!
```

### Priority 2: Fix "Avg Cost per 1K Streams"
Use goal-based calculation:
```typescript
const averageCostPer1kStreams = totalStreamGoals > 0
  ? (totalRevenue / (totalStreamGoals / 1000))
  : 0;
```

### Priority 3: Fix "Campaign Efficiency"
Change to goal achievement:
```typescript
const campaignEfficiency = totalStreamGoals > 0
  ? Math.min((totalActualStreams / totalStreamGoals) * 100, 100)
  : 0;
```

## Data Quality Issues

1. **CSV Import Dates**: All campaigns show same `created_at` date
2. **Budget vs Actual Spending**: We don't track actual spending, only budgets
3. **Stream Goals**: Need to verify `total_goal` is populated correctly
4. **Campaign Status**: Verify statuses are set correctly (Active, Completed, etc.)

## Verification Queries

Run these on production to verify data:

```sql
-- Check campaign date distribution
SELECT 
  DATE(created_at) as date,
  COUNT(*) as campaigns
FROM campaign_groups
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 10;

-- Check stream goals
SELECT 
  COUNT(*) as total_campaigns,
  SUM(CAST(total_goal AS NUMERIC)) as total_goals,
  SUM(CAST(total_budget AS NUMERIC)) as total_budget,
  AVG(CAST(total_goal AS NUMERIC)) as avg_goal
FROM campaign_groups;

-- Check actual streams
SELECT 
  SUM(streams_28d) as total_streams,
  COUNT(*) as total_playlists,
  AVG(streams_28d) as avg_streams_per_playlist
FROM campaign_playlists;

-- Check campaign status distribution
SELECT 
  status,
  COUNT(*) as count
FROM campaign_groups
GROUP BY status;
```

