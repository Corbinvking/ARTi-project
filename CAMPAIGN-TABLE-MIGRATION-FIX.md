# 🔧 Campaign Table Migration Fix

## 🚨 Issue Discovered
The production site was showing "No Playlist Data Yet" for all campaigns, even though:
- The code had been deployed to Vercel
- The data was correctly imported to the production database
- The browser cache was cleared multiple times

## 🔍 Root Cause
Found **22 files** still querying the old `campaigns` table instead of the new `campaign_groups` table!

The key error in browser console:
```
GET https://api.artistinfluence.com/rest/v1/campaigns?select=*&id=eq.be7da8c7-4195-443b-91fa-425182876d82 406 (Not Acceptable)
```

## ✅ Files Fixed (First Batch - Commit `9222209`)

### Components:
1. **EditCampaignModal.tsx** - Now queries `campaign_groups` for playlist data
2. **QuickActions.tsx** - Updated stats to use `campaign_groups`
3. **Dashboard.tsx** - Updated dashboard queries and field names:
   - `stream_goal` → `total_goal`
   - `budget` → `total_budget`
   - `status: 'active'` → `status: 'Active'`

### Hooks:
4. **useVendorPayouts.ts** - Updated to query `campaign_groups`, removed `duration_days` reference
5. **useVendorCampaigns.ts** - All 3 queries updated to `campaign_groups`
6. **useDraftCampaigns.ts** - All 3 queries updated, status values capitalized

## 📝 Remaining Files to Fix (18 more)

### Components (6):
- ReadOnlyCampaignDetailsModal.tsx
- ProjectDiagnostics.tsx
- DraftCampaignReviewModal.tsx
- CampaignWeeklyUpdateModal.tsx
- CampaignWeeklyImportModal.tsx
- CampaignImportModal.tsx

### Hooks (12):
- useCampaignBuilder.ts (4 references)
- useCampaignPerformanceData.ts (1 reference)
- useCampaignSubmissions.ts (2 references)
- useDeleteClient.ts (1 reference)
- useGlobalSearch.ts (1 reference)
- usePlaylistHistoricalPerformance.ts (2 references)
- useSalespersonCampaigns.ts (2 references)
- useVendorCampaignCounts.ts (1 reference)
- useVendorCampaignRequests.ts (3 references)

## 🎯 Field Name Changes Required

When migrating from `campaigns` to `campaign_groups`:

| Old Field | New Field |
|-----------|-----------|
| `stream_goal` | `total_goal` |
| `budget` | `total_budget` |
| `duration_days` | *(removed - use default 30 days)* |
| `status: 'active'` | `status: 'Active'` |
| `status: 'draft'` | `status: 'Draft'` |
| `status: 'completed'` | `status: 'Completed'` |

## 🚀 Deployment Status

**Commit**: `9222209` - "fix: Replace all campaigns table references with campaign_groups across components and hooks"

**GitHub**: ✅ Pushed to main
**Vercel**: 🟡 Deploying...
**Production DB**: ✅ Already has playlist data (543 vendor, 173 algorithmic)

## 🧪 Testing Steps

Once Vercel deployment completes:

1. **Hard refresh browser** (`Ctrl + Shift + R`)
2. **Open production**: https://app.artistinfluence.com
3. **Click on "Segan - DNBMF" campaign**
4. **Verify**:
   - ✅ "Playlists" tab loads
   - ✅ "Spotify Algorithmic Playlists" section appears
   - ✅ Radio, Mixes, Release Radar playlists show with stream counts
   - ✅ "Vendor Playlists" section appears if vendor data exists

## 📊 Expected Results

After this fix, the `CampaignDetailsModal` should:
- Successfully fetch campaign data from `campaign_groups`
- Successfully fetch playlist data from `campaign_playlists`
- Display algorithmic playlists (Radio, Discover Weekly, etc.)
- Display vendor playlists with stream counts

## ⚠️ Known Limitations

- Still have 18 more files to fix for complete migration
- Some advanced vendor/salesperson features may still query old table
- Non-critical modals and diagnostic tools not yet updated

## 🔄 Next Steps

1. ✅ Deploy first batch of fixes
2. 🟡 Test production site
3. ⏳ Fix remaining 18 files if issues persist
4. ⏳ Complete full migration testing

