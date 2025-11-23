# Update Existing Playlists in Database

**Date:** November 23, 2025  
**Purpose:** Tag algorithmic playlists and ensure all existing data is properly categorized

---

## Overview

The scraper has already populated the `campaign_playlists` table with stream data (24h, 7d, 28d), but we need to:

1. **Tag algorithmic playlists** with `is_algorithmic: true`
2. **Ensure vendor playlists** have `is_algorithmic: false`
3. **Verify all data** is correctly categorized

---

## Option 1: Automatic Tagging (Recommended)

### Run on Production Server

```bash
# SSH to droplet
ssh root@165.227.91.129

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest code
git pull origin main

# Make script executable
chmod +x scripts/tag-algorithmic-playlists.sh

# Run the tagging script
bash scripts/tag-algorithmic-playlists.sh
```

### What It Does

The script automatically identifies algorithmic playlists by:

1. **Name Matching:**
   - Radio
   - Discover Weekly
   - Your DJ
   - Daylist
   - Mixes
   - Release Radar
   - Daily Mix 1-6
   - On Repeat
   - Repeat Rewind

2. **Curator Matching:**
   - Curator is "Spotify"
   - Curator is "Spotify Official"

3. **Vendor Check:**
   - No `vendor_id` assigned (NULL)

Then it:
- Sets `is_algorithmic = true` for matching playlists
- Sets `is_algorithmic = false` for vendor playlists
- Reports results and verification counts

---

## Option 2: Manual SQL Update

### If you prefer to run SQL directly:

```sql
-- Tag algorithmic playlists
UPDATE campaign_playlists
SET is_algorithmic = true
WHERE 
  vendor_id IS NULL
  AND (
    LOWER(playlist_name) LIKE '%radio%'
    OR LOWER(playlist_name) LIKE '%discover weekly%'
    OR LOWER(playlist_name) LIKE '%your dj%'
    OR LOWER(playlist_name) LIKE '%daylist%'
    OR LOWER(playlist_name) LIKE '%mixes%'
    OR LOWER(playlist_name) LIKE '%release radar%'
    OR LOWER(playlist_name) LIKE '%daily mix%'
    OR LOWER(playlist_name) LIKE '%on repeat%'
    OR LOWER(playlist_name) LIKE '%repeat rewind%'
    OR LOWER(playlist_curator) LIKE '%spotify%'
  );

-- Ensure vendor playlists are NOT algorithmic
UPDATE campaign_playlists
SET is_algorithmic = false
WHERE vendor_id IS NOT NULL;

-- Verify results
SELECT 
  is_algorithmic,
  COUNT(*) as count,
  COUNT(DISTINCT playlist_name) as unique_names
FROM campaign_playlists
GROUP BY is_algorithmic;
```

### Run on Server:

```bash
ssh root@165.227.91.129

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOF'
-- Paste SQL here
EOF
```

---

## Option 3: Check Current State First

### See what needs to be updated:

```bash
ssh root@165.227.91.129

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  playlist_name,
  playlist_curator,
  vendor_id,
  is_algorithmic,
  COUNT(*) as occurrences
FROM campaign_playlists
WHERE 
  vendor_id IS NULL
  AND (
    LOWER(playlist_name) LIKE '%radio%'
    OR LOWER(playlist_name) LIKE '%discover%'
    OR LOWER(playlist_name) LIKE '%dj%'
    OR LOWER(playlist_name) LIKE '%daylist%'
    OR LOWER(playlist_name) LIKE '%mix%'
  )
GROUP BY playlist_name, playlist_curator, vendor_id, is_algorithmic
ORDER BY occurrences DESC;
"
```

This will show you all playlists that should be tagged as algorithmic.

---

## Verification After Update

### 1. Check Database Counts

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  CASE 
    WHEN is_algorithmic THEN 'Algorithmic'
    ELSE 'Vendor'
  END as type,
  COUNT(*) as total_entries,
  COUNT(DISTINCT playlist_name) as unique_playlists
FROM campaign_playlists
GROUP BY is_algorithmic;
"
```

Expected output:
```
     type      | total_entries | unique_playlists
---------------+---------------+------------------
 Vendor        |      1400     |        140
 Algorithmic   |       366     |         9
```

### 2. List Algorithmic Playlists

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  playlist_name,
  COUNT(*) as appearances
FROM campaign_playlists
WHERE is_algorithmic = true
GROUP BY playlist_name
ORDER BY appearances DESC;
"
```

Expected output:
```
   playlist_name    | appearances
--------------------+-------------
 Radio              |     131
 Discover Weekly    |     131
 Your DJ            |      35
 Daylist            |      31
 Mixes              |      20
 Release Radar      |      12
 Daily Mix 1        |       3
 Daily Mix 2        |       2
 On Repeat          |       1
```

### 3. Test on Frontend

1. Open production URL
2. Open a campaign (e.g., "DAUNTER x URAI - ENGULFED")
3. Go to Playlists tab
4. Verify:
   - ✅ Algorithmic playlists show green "Algorithmic" badge
   - ✅ Vendor column shows "Spotify" for algorithmic
   - ✅ Vendor playlists don't have algorithmic badges
   - ✅ Algorithmic section shows correct playlists

---

## Expected Results

### Before Update:
```
campaign_playlists table:
- 1,766 total entries
- is_algorithmic is NULL or false for all
- Some "Unknown" vendors (should be "Spotify")
```

### After Update:
```
campaign_playlists table:
- 1,766 total entries
- ~366 entries marked as algorithmic
- ~1,400 entries as vendor playlists
- ~9 unique algorithmic playlist types
```

### Frontend Display:
- Algorithmic playlists have green badges
- Separated into "Vendor Playlists" and "Algorithmic Streaming Data" sections
- Correct vendor attribution (Spotify vs actual vendors)

---

## Troubleshooting

### Script doesn't find environment variables:
```bash
# Manually set them
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..." # From production.env
node scripts/tag-algorithmic-playlists.js
```

### Need to re-run tagging:
The script is **idempotent** - safe to run multiple times. It will:
- Skip already-tagged playlists
- Fix any incorrectly tagged playlists
- Report what changed

### Frontend still shows incorrect data:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check database to confirm updates were applied
3. Verify frontend build includes latest changes
4. Check browser console for errors

---

## Quick Commands Reference

```bash
# Full automated process
ssh root@165.227.91.129
cd /root/arti-marketing-ops
git pull origin main
bash scripts/tag-algorithmic-playlists.sh

# Verify counts
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c \
  "SELECT is_algorithmic, COUNT(*) FROM campaign_playlists GROUP BY is_algorithmic;"

# List algorithmic playlists
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c \
  "SELECT DISTINCT playlist_name FROM campaign_playlists WHERE is_algorithmic = true;"
```

---

## Future Updates

The **cron job** will automatically tag new playlists going forward because:

1. `run_production_scraper.py` sets `is_algorithmic` when syncing to `campaign_playlists`
2. It checks playlist name and curator during sync
3. New campaigns will have correct tags from day 1

So this tagging script is a **one-time fix** for existing data!

---

**Ready to run!** Choose Option 1 (automatic script) for the easiest approach. 🚀

