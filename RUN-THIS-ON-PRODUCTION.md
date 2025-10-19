# 🚀 Run This On Production - Fix Algorithmic Flags

## The Issue
All playlists have `is_algorithmic = false`, even Spotify's official algorithmic playlists like:
- Discover Weekly
- Your DJ  
- Radio
- Release Radar
- Daylist
- etc.

This causes the frontend to show them all as "Vendor Playlists" instead of separating them.

## The Fix

```bash
# 1. SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# 2. Pull the latest code
git pull origin main

# 3. Run the fix
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < FIX-ALGORITHMIC-FLAGS.sql
```

## Expected Output

You should see:
```
 status  | updated_count 
---------+---------------
 Updated |            35
(1 row)

         playlist_name         | streams_28d | is_algorithmic |       type        
-------------------------------+-------------+----------------+-------------------
 Discover Weekly               |         353 | t              | 🎵 Algorithmic
 Your DJ                       |         474 | t              | 🎵 Algorithmic
 Radio                         |          59 | t              | 🎵 Algorithmic
 Release Radar                 |          16 | t              | 🎵 Algorithmic
 ...                           |         ... | t              | 🎵 Algorithmic
 GYM - TEMAZOS MOTIVACION 2025 |        9775 | f              | 🎸 Vendor
 pink planet                   |           5 | f              | 🎸 Vendor
```

## After Running

1. **Hard refresh** the browser: `Ctrl+Shift+R`
2. Click on **"Segan - DNBMF"** campaign
3. Go to **"Playlists"** tab
4. You should now see:
   - **🎵 Spotify Algorithmic Playlists** section at the top (7-8 playlists)
   - **🎸 Vendor Playlists** section below (2-3 playlists)

## Verification

Check that the flags are correct:
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    is_algorithmic,
    COUNT(*) as count
FROM campaign_playlists
GROUP BY is_algorithmic;
"
```

Expected:
- `true` (algorithmic): ~35-50 playlists
- `false` (vendor): ~1380-1400 playlists

