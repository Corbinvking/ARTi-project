# Executive Dashboard - Real Data Integration Plan

## 🎯 Objective
Connect the Executive Dashboard to real campaign data from the database, replacing mock/zero data with actual metrics.

## 📊 Current Issues
1. **Querying old `campaigns` table** instead of `campaign_groups`
2. **Using old `campaign_submissions` join** (doesn't exist in new schema)
3. **No real stream data** from `campaign_playlists`
4. **Mock vendor performance** instead of real data
5. **Missing ROI calculations** based on actual costs

## 🔧 Required Changes

### 1. Update Data Hook (`useExecutiveDashboardData.ts`)
**Query the correct tables:**
- ✅ `campaign_groups` - Main campaigns table
- ✅ `spotify_campaigns` - Individual songs/tracks
- ✅ `campaign_playlists` - Actual playlist placements and streams
- ✅ `vendors` - Vendor information
- ✅ `clients` - Client data

**Calculate Real Metrics:**
- **Total Campaigns**: Count of `campaign_groups`
- **Active Campaigns**: `campaign_groups` where `status = 'Active'`
- **Total Streams (30 days)**: Sum of `streams_28d` from `campaign_playlists`
- **Campaigns Added (30 days)**: `campaign_groups.created_at >= 30 days ago`
- **Campaign Efficiency**: % of campaigns with status='Completed' that met goals
- **Avg Cost per 1K Streams**: `total_budget / (total_streams / 1000)`
- **Top Vendors**: From `vendors` joined with `campaign_playlists`
- **Campaign Growth MoM**: Compare current month vs last month campaign counts

### 2. Update KPI Cards Component
Map real data to the KPI cards:
- Total Campaigns
- Streams Past 30 Days
- Campaigns Added (30d)
- Campaign Growth MoM
- Campaign Efficiency
- Avg Cost per 1K Streams

### 3. Vendor Performance
Calculate from `campaign_playlists`:
- **Efficiency**: Actual streams vs predicted
- **Avg Performance**: Stream delivery rate
- **Total Campaigns**: Count of campaigns per vendor

### 4. Campaign Status Distribution
From `campaign_groups.status`:
- Active
- Completed
- Paused
- Draft

## 📋 Implementation Steps

### Phase 1: Update Data Hook ✅
1. Replace `campaigns` query with `campaign_groups`
2. Add `spotify_campaigns` query for song-level data
3. Add `campaign_playlists` query for stream data
4. Calculate real metrics from actual data
5. Remove mock/placeholder data

### Phase 2: Test Locally ✅
1. Run on local development
2. Verify all metrics show real data
3. Check that charts/graphs update correctly
4. Test performance with real data volume

### Phase 3: Update Related Components ✅
1. Update `ExecutiveKPICards` if needed
2. Ensure vendor performance shows real data
3. Update campaign distribution charts

### Phase 4: Deploy to Production 🎯
1. Test on local
2. Commit changes
3. Deploy to production
4. Verify production data matches local

## 🎯 Success Criteria
- ✅ Dashboard shows actual campaign counts (not 0 or 902)
- ✅ Stream data reflects real `campaign_playlists` data
- ✅ Vendor rankings based on actual performance
- ✅ All growth metrics calculate correctly
- ✅ No errors or missing data
- ✅ Fast query performance (<2 seconds)

## 📝 Notes
- The new schema uses `campaign_groups` as the parent table
- Each `campaign_group` can have multiple `spotify_campaigns` (songs)
- Each song can have multiple `campaign_playlists` entries
- Stream data comes from `campaign_playlists.streams_28d`
- Budget data is in `campaign_groups.total_budget`
- Goals are in `campaign_groups.total_goal`

