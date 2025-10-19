# Fix Segan Campaign Routing Issue

## Problem Identified
✅ **Diagnosis complete!** The issue is:

1. **Campaign groups exist but are EMPTY**:
   - "Segan - DNBMF" group exists but has NO songs
   - "Segan - Tempo" group exists but has NO songs

2. **All songs are under ONE generic group**:
   - Generic "Segan" group contains:
     - Song 4594: "Segan - DNBMF" (20 playlists) ← Should be in "Segan - DNBMF" group!
     - Song 4321: "Segan - Tempo" (2 playlists) ← Should be in "Segan - Tempo" group!
     - Song 6458: "Segan - The Same" (0 playlists)

3. **Result**: When you click "Segan - DNBMF" in the UI, it opens the empty group, not the one with 20 playlists!

## The Fix

Run this on **PRODUCTION**:

```bash
# SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Pull latest fix
git pull origin main

# Apply the fix
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < FIX-SEGAN-CAMPAIGN-ROUTING.sql
```

## What This Does

1. **Moves "Segan - DNBMF" song** (ID 4594) to the "Segan - DNBMF" campaign group
2. **Moves "Segan - Tempo" song** (ID 4321) to the "Segan - Tempo" campaign group
3. Leaves "Segan - The Same" in the generic "Segan" group (or we can rename it)
4. Verifies the fix by showing the new distribution

## Expected Result

After running the fix:
- ✅ "Segan - DNBMF" campaign will show **20 playlists** (14 algorithmic + 6 vendor)
- ✅ "Segan - Tempo" campaign will show **2 playlists**
- ✅ No more duplicate/empty campaign groups

## Also Check Local

Run this on your **LOCAL** database to see if it has the same issue:

```bash
# From project root
docker exec -i arti-project-db-1 psql -U postgres -d postgres < CHECK-LOCAL-SEGAN.sql
```

If local has the same issue, run the same fix:
```bash
docker exec -i arti-project-db-1 psql -U postgres -d postgres < FIX-SEGAN-CAMPAIGN-ROUTING.sql
```

## After Fix

1. Hard refresh browser: `Ctrl+Shift+R`
2. Click "Segan - DNBMF"
3. Go to "Playlists" tab
4. You should now see all 20 playlists properly separated!

---

## About "Duplicate UI Elements"

The duplicate cards you're seeing might be caused by:
1. **React Query re-rendering** - The modal component is rendering multiple times
2. **Stale data** - Cache needs to be invalidated after the fix

After running the fix, the duplicate rendering should resolve itself once the data is correctly structured.

