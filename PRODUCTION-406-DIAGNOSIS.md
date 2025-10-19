# Production 406 Error - Root Cause Analysis

## 🔍 **Confirmed Facts**

### ✅ **What We Know Works**
1. **New code IS deployed** - Console shows: `🔄 [v1.0.1] Fetching campaign details from campaign_groups table`
2. **Local environment works perfectly** - All playlist data shows correctly
3. **CampaignDetailsModal.tsx is fixed** - Queries `campaign_groups` correctly

### ❌ **What's Still Broken**
- Production still shows: `GET .../campaigns?select=*&id=eq.be7da8c7... 406`
- This happens AFTER the new code runs
- The old `campaigns` table doesn't exist in production

## 🎯 **Root Cause**

There are **TWO SEPARATE queries** happening when you click a campaign:

1. **Query 1** (Fixed): `fetchCampaignDetails()` → Queries `campaign_groups` ✅
2. **Query 2** (Still Broken): Something else → Queries `campaigns` ❌

## 🔎 **Likely Culprits**

### Theory 1: React Query Auto-Refetch
React Query might be trying to refetch a stale query that used the old table name.

### Theory 2: Hidden useQuery Hook
There might be a `useQuery` with `queryKey: ['campaign', id]` that's automatically enabled when the modal opens.

### Theory 3: Supabase Realtime Subscription
A realtime channel might be subscribed to the old `campaigns` table.

### Theory 4: Derived Query Key
React Query might be generating a query key based on the campaign object itself.

## 🛠️ **Next Steps**

1. Add more detailed logging to identify EXACTLY where the second query comes from
2. Check if React Query cache has stale entries
3. Verify if there's a hidden subscription or observer
4. Clear React Query cache on production

