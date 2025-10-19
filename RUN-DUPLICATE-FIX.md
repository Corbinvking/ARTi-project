# Fix Duplicate Playlists in UI

## ✅ Diagnosis Complete!

Found **7 duplicate playlists** causing duplicate UI cards:

| Playlist | Streams (Keep) | Streams (Delete) | Reason |
|----------|----------------|------------------|--------|
| Your DJ | **474** ✅ | 35 ❌ | Keep higher count |
| Discover Weekly | **353** ✅ | 50 ❌ | Keep higher count |
| Radio | **59** ✅ | 18 ❌ | Keep higher count |
| Mixes | **9** ✅ | 4 ❌ | Keep higher count |
| Daylist | **9** ✅ | 9 (newer) ❌ | Keep older record |
| Release Radar | **16** ✅ | 16 (newer) ❌ | Keep older record |
| Smart Shuffle | **5** ✅ | 5 (newer) ❌ | Keep older record |

## The Issue

- **Oct 15 scrape**: Created good records with high stream counts and `date_added` values
- **Oct 19 scrape**: Created duplicate records with lower/same stream counts and missing `date_added`

Result: **20 total records** but only **13 unique playlists** → Duplicate UI cards!

## The Fix

Run this on **PRODUCTION**:

```bash
# SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Pull the fix
git pull origin main

# Apply it
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < FIX-DUPLICATE-PLAYLISTS.sql
```

## What This Does

1. **Deletes 7 duplicate records** (the lower-quality ones from Oct 19)
2. **Keeps 13 unique playlists** with the highest stream counts
3. Shows verification output with the clean data

## Expected Result

After fix:
- ✅ **13 total playlists** (no duplicates)
- ✅ **7 algorithmic** (Your DJ, Discover Weekly, Radio, etc.)
- ✅ **6 vendor** (GYM, Drum and Bass, etc.)
- ✅ **No duplicate UI cards**

## After Running

1. **Hard refresh**: `Ctrl+Shift+R`
2. Click "Segan - DNBMF"
3. Go to "Playlists" tab
4. You should see **13 unique playlist cards** with no duplicates!

---

## Prevent Future Duplicates

The `populate-playlist-vendor-data-v2.js` script needs to be fixed to properly update existing records instead of creating duplicates. This is a separate task for later.

