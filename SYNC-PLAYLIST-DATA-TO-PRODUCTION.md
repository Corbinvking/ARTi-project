# Sync Playlist Data to Production

## 🔍 **Problem**
- ✅ Code is fixed (no more 406 errors)
- ❌ Production database is missing playlist data
- ✅ Local database HAS playlist data (543 vendor + 173 algorithmic)

## 🎯 **Solution**
Run the data import scripts on the **production server** to populate `campaign_playlists`.

---

## 📋 **Step-by-Step Instructions**

### 1️⃣ **SSH into Production Server**
```bash
ssh root@165.227.106.179
```

### 2️⃣ **Navigate to Project Directory**
```bash
cd /root/arti-marketing-ops
```

### 3️⃣ **Check Current Playlist Data**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total, SUM(CASE WHEN is_algorithmic THEN 1 ELSE 0 END) as algorithmic, SUM(CASE WHEN NOT is_algorithmic THEN 1 ELSE 0 END) as vendor FROM campaign_playlists;"
```

**Expected Output (if empty):**
```
 total | algorithmic | vendor 
-------+-------------+--------
     0 |           0 |      0
```

### 4️⃣ **Set Environment Variable for Scripts**
```bash
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
```

### 5️⃣ **Run Playlist Data Population Script**
```bash
cd scripts
node populate-playlist-vendor-data-v2.js
```

**Expected Output:**
```
🎵 Populating playlist data from scraped files...
Processing spotify_scraper/data...
✅ Processed X playlists
✅ Created Y algorithmic playlists
✅ Created Z vendor playlists
```

### 6️⃣ **Verify Data Was Imported**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total, SUM(CASE WHEN is_algorithmic THEN 1 ELSE 0 END) as algorithmic, SUM(CASE WHEN NOT is_algorithmic THEN 1 ELSE 0 END) as vendor FROM campaign_playlists;"
```

**Expected Output (after import):**
```
 total | algorithmic | vendor 
-------+-------------+--------
   716 |         173 |    543
```

### 7️⃣ **Check Specific Campaign Has Data**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  cp.playlist_name,
  cp.streams_28d,
  cp.is_algorithmic,
  v.name as vendor_name
FROM campaign_playlists cp
LEFT JOIN vendors v ON cp.vendor_id = v.id
WHERE cp.campaign_id IN (
  SELECT id 
  FROM spotify_campaigns 
  WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82'
)
ORDER BY cp.is_algorithmic DESC, cp.streams_28d DESC
LIMIT 10;
"
```

**Expected Output:**
```
       playlist_name        | streams_28d | is_algorithmic |  vendor_name   
----------------------------+-------------+----------------+----------------
 Discover Weekly           |       45234 | t              | NULL
 Radio                     |       12453 | t              | NULL
 Some Vendor Playlist      |        8934 | f              | Club Restricted
 ...
```

### 8️⃣ **Test in Browser**
1. Open production: `https://app.artistinfluence.com`
2. Go to Campaigns
3. Click "Segan - DNBMF"
4. **Should see playlist data!**

---

## 🚨 **If Scripts Don't Exist on Production**

If the scripts aren't on the production server, you need to:

### Option A: Git Pull Latest Code
```bash
cd /root/arti-marketing-ops
git pull origin main
```

### Option B: Copy Scripts from Local
From your local machine:
```bash
scp -r spotify_scraper/data root@165.227.106.179:/root/arti-marketing-ops/spotify_scraper/
scp scripts/populate-playlist-vendor-data-v2.js root@165.227.106.179:/root/arti-marketing-ops/scripts/
```

---

## 📊 **Quick Verification Query**

Run this to see which campaigns have playlist data:
```sql
SELECT 
  cg.name as campaign_name,
  COUNT(cp.id) as playlist_count,
  SUM(CASE WHEN cp.is_algorithmic THEN 1 ELSE 0 END) as algorithmic,
  SUM(CASE WHEN NOT cp.is_algorithmic THEN 1 ELSE 0 END) as vendor,
  SUM(cp.streams_28d) as total_streams
FROM campaign_groups cg
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE cg.status = 'Active'
GROUP BY cg.id, cg.name
ORDER BY playlist_count DESC;
```

---

## ✅ **Success Criteria**

After running these steps, you should see:
- ✅ 716 total playlist records in production
- ✅ 173 algorithmic playlists
- ✅ 543 vendor playlists
- ✅ "Segan - DNBMF" campaign shows playlist data in UI
- ✅ No 406 errors in console

