# 🚨 Production Data Sync Required

## Current Status

### Issue Discovered
- **Production**: 342 campaigns
- **Local**: 500+ campaigns (with some duplicates)
- **Root Cause**: Production database missing CSV-imported campaigns and playlist data

### Code Fix Applied ✅
- **Fixed**: `CampaignDetailsModal.tsx` now queries `campaign_groups` instead of `campaigns`
- **Commit**: `b81b8ce` - "fix: Update CampaignDetailsModal to query campaign_groups instead of campaigns table"
- **Status**: Pushed to GitHub, Vercel will auto-deploy

---

## 🔥 Critical Actions Required on Production

### Step 1: Clean Local Duplicates First

Before syncing to production, we need to clean up the local database duplicates.

**Run locally:**
```powershell
# Check for duplicates
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY); supabase.from('campaign_groups').select('name').then(({ data }) => { const counts = {}; data.forEach(c => counts[c.name] = (counts[c.name] || 0) + 1); const dupes = Object.entries(counts).filter(([_, count]) => count > 1); console.log('Duplicates:', dupes.length, dupes.slice(0, 10)); });"
```

If duplicates exist, create a cleanup script:

```javascript
// scripts/clean-local-duplicates.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanDuplicates() {
  // Get all campaign_groups
  const { data: groups } = await supabase
    .from('campaign_groups')
    .select('*')
    .order('created_at', { ascending: true });
  
  const seen = new Map();
  const toDelete = [];
  
  for (const group of groups) {
    const key = group.name;
    if (seen.has(key)) {
      // Keep the oldest, delete the newer one
      toDelete.push(group.id);
    } else {
      seen.set(key, group);
    }
  }
  
  console.log(`Found ${toDelete.length} duplicate campaign_groups to delete`);
  
  if (toDelete.length > 0) {
    // Delete in batches
    for (let i = 0; i < toDelete.length; i += 50) {
      const batch = toDelete.slice(i, i + 50);
      await supabase
        .from('campaign_groups')
        .delete()
        .in('id', batch);
      console.log(`Deleted batch ${i / 50 + 1}`);
    }
  }
  
  console.log('✅ Cleanup complete!');
}

cleanDuplicates();
```

**Run:**
```powershell
node scripts/clean-local-duplicates.js
```

---

### Step 2: Export Clean Local Data

**Run locally:**
```powershell
# Set environment
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_LOCAL_SERVICE_KEY"

# Export campaign_groups
node scripts/export-campaign-groups.js > data/campaign_groups_export.json

# Export spotify_campaigns
node scripts/export-spotify-campaigns.js > data/spotify_campaigns_export.json

# Export campaign_playlists
node scripts/export-campaign-playlists.js > data/campaign_playlists_export.json
```

Create export scripts if needed:

```javascript
// scripts/export-campaign-groups.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportData() {
  const { data, error } = await supabase
    .from('campaign_groups')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(JSON.stringify(data, null, 2));
}

exportData();
```

---

### Step 3: Import to Production

**SSH to production:**
```bash
ssh root@artistinfluence.com
cd /root/arti-marketing-ops
```

**Set environment:**
```bash
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_PRODUCTION_SERVICE_KEY"
```

**Upload and import data:**
```bash
# Upload the export files from local to production
# (Use scp from local machine)

# Import campaign_groups
node scripts/import-campaign-groups.js < data/campaign_groups_export.json

# Import spotify_campaigns
node scripts/import-spotify-campaigns.js < data/spotify_campaigns_export.json

# Import campaign_playlists
node scripts/import-campaign-playlists.js < data/campaign_playlists_export.json
```

---

### Step 4: Verify Production

**On production:**
```bash
# Count campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres <<EOF
SELECT COUNT(*) as campaign_groups FROM campaign_groups;
SELECT COUNT(*) as spotify_campaigns FROM spotify_campaigns;
SELECT COUNT(*) as campaign_playlists FROM campaign_playlists;
SELECT COUNT(*) as algorithmic FROM campaign_playlists WHERE is_algorithmic = TRUE;
EOF

# Verify "Segan - DNBMF" has playlist data
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres <<EOF
SELECT 
  cg.name,
  COUNT(cp.id) as total_playlists,
  COUNT(cp.id) FILTER (WHERE cp.is_algorithmic = TRUE) as algorithmic,
  COUNT(cp.id) FILTER (WHERE cp.is_algorithmic = FALSE) as vendor
FROM campaign_groups cg
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE cg.name LIKE '%Segan%DNBMF%'
GROUP BY cg.name;
EOF
```

**Expected output:**
```
 campaign_groups 
-----------------
             500+

 spotify_campaigns 
-------------------
              600+

 campaign_playlists 
--------------------
               700+

 algorithmic 
-------------
         173

         name          | total_playlists | algorithmic | vendor 
-----------------------+-----------------+-------------+--------
 Segan - DNBMF        |              15 |           5 |     10
```

---

### Step 5: Restart Production Services

```bash
# Restart with correct command
docker compose restart

# OR restart individual containers
docker restart $(docker ps -q)
```

---

## 🎯 Alternative: Direct Database Copy

If the manual export/import is too complex, you can do a direct database dump:

### Local Export
```powershell
docker exec -i supabase_db_arti-marketing-ops pg_dump -U postgres -d postgres --data-only --table=campaign_groups --table=spotify_campaigns --table=campaign_playlists > production_data.sql
```

### Production Import
```bash
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Upload production_data.sql via scp first

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < production_data.sql
```

---

## ✅ Verification Checklist

After sync is complete:

- [ ] Production shows 500+ campaigns
- [ ] Clicking "Segan - DNBMF" shows playlist data
- [ ] Algorithmic playlists (Discover Weekly, Radio) appear at top
- [ ] Vendor playlists appear below
- [ ] No 406 errors in browser console
- [ ] Campaign details modal loads correctly

---

## 📊 Expected Final State

**Production Database:**
- **campaign_groups**: ~500-550 (after duplicate cleanup)
- **spotify_campaigns**: ~650-700
- **campaign_playlists**: ~716 (543 vendor + 173 algorithmic)
- **clients**: ~50-60
- **vendors**: ~10

**Frontend:**
- All campaigns clickable
- Campaign details modal shows full playlist data
- Algorithmic playlists displayed separately
- Vendor performance metrics calculated

---

## 🚀 Next Steps After Sync

1. Monitor Vercel deployment at https://vercel.com/your-project
2. Test production site: https://artistinfluence.com
3. Verify "Segan - DNBMF" campaign shows all playlist data
4. Check other campaigns for playlist data
5. Run scraper for campaigns missing data

---

## 🔗 Related Documents

- `PRODUCTION-SYNC-COMPLETE.md` - Full sync guide
- `DEPLOYMENT-STATUS.md` - Current deployment status
- `FINAL-PLAYLIST-STATUS.md` - Playlist data status

