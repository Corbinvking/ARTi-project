# 🚀 Production Sync - Complete 1:1 Deployment

## Overview

This deployment will sync ALL local changes to production:
- ✅ Code updates (already pushed to GitHub)
- ✅ Database migrations
- ✅ **543 vendor playlists** from CSV
- ✅ **173 algorithmic playlists** from scraped data
- ✅ All UI improvements

---

## 📋 Production Deployment Commands

### Step 1: Pull Latest Code

```bash
cd /root/arti-marketing-ops
git pull origin main
npm install
```

### Step 2: Set Environment Variables

```bash
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
```

### Step 3: Run Data Import Scripts (In Order!)

```bash
# Import 543 vendor playlists from CSV
echo "🎵 Importing vendor playlists from CSV..."
node scripts/import-csv-playlists-enhanced.js

# Import 173 algorithmic playlists from scraped files
echo "🟢 Importing algorithmic playlists from scraped data..."
node scripts/populate-playlist-vendor-data-v2.js

# Sync to playlists table for vendor page
echo "🔄 Syncing to playlists table..."
node scripts/sync-campaign-playlists-to-playlists-v2.js
```

### Step 4: Restart Services

```bash
docker-compose restart
```

### Step 5: Verify Deployment

```bash
# Check playlist counts
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  'Campaign Playlists' as entity, COUNT(*)::text as count FROM campaign_playlists
UNION ALL
SELECT 'Algorithmic Playlists', COUNT(*)::text FROM campaign_playlists WHERE is_algorithmic = true
UNION ALL
SELECT 'Vendor Playlists', COUNT(*)::text FROM campaign_playlists WHERE is_algorithmic = false
UNION ALL
SELECT 'Playlists Table', COUNT(*)::text FROM playlists;
"
```

**Expected Output:**
```
Campaign Playlists    | 1800-1900
Algorithmic Playlists | 170-180
Vendor Playlists      | 1600-1700
Playlists Table       | 460-480
```

---

## 🎯 ONE-LINE DEPLOYMENT (Copy & Paste)

```bash
cd /root/arti-marketing-ops && git pull origin main && npm install && export SUPABASE_URL="http://127.0.0.1:54321" && export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" && node scripts/import-csv-playlists-enhanced.js && node scripts/populate-playlist-vendor-data-v2.js && node scripts/sync-campaign-playlists-to-playlists-v2.js && docker-compose restart
```

---

## 📊 Expected Results After Deployment

### Campaign Coverage
- **Before:** 208 campaigns, 1148 playlists
- **After:** 255 campaigns, ~1850 playlists
- **Improvement:** +47 campaigns with data (+62% increase in playlists)

### Campaign Structure
- **Full "Segan-DNBMF" structure:** 8 campaigns (3%)
  - ✅ Algorithmic playlists (Spotify Official - green)
  - ✅ Vendor playlists (red music icon)
  - ✅ Stream counts and metrics
  
- **Vendor-only data:** 247 campaigns (97%)
  - ✅ Vendor playlists
  - ✅ Stream counts and metrics
  - ❌ No algorithmic playlists (requires scraping)

### Playlist Breakdown by Vendor
- **Club Restricted:** ~700 playlists
- **Golden Nugget:** ~60 playlists
- **Glenn:** ~40 playlists
- **Moon:** ~30 playlists
- **House Views:** ~25 playlists
- **Majed:** ~8 playlists
- **Others:** (Alekk, Levianth, etc.)

---

## 🔍 Verification Checklist

After deployment, verify in the UI:

### ✅ Campaign Details Modal
1. Open any campaign from the list
2. Click "Playlists" tab
3. Check structure:
   - **If campaign has scraped data:** See "Spotify Algorithmic Playlists" section at top (green)
   - **All campaigns:** See "Vendor Playlists" section with data
   - See total streams, vendor breakdown, performance metrics

### ✅ Campaigns to Test

**Full Structure (Algorithmic + Vendor):**
- Segan - DNBMF ✅
- Segan ✅
- DELATO, 7KY & RYA ✅
- Reece Rosé ✅
- Her blood ✅
- Odd Language - ok fine goodbye ✅

**Vendor Only:**
- Kitt Wakeley
- All American Rejects - Easy Come, Easy Go
- PROPPAGANDA - Aerial
- Carbon Sigil
- (Test any others)

### ✅ Vendors/Playlists Page
1. Navigate to Playlists/Vendors tab
2. Should see vendors with playlist counts
3. Click on a vendor
4. Should see playlists with stream data

---

## 📈 Database Stats (Before vs After)

| Metric | Local (Before) | Local (After) | Production (After Sync) |
|--------|---------------|---------------|------------------------|
| **Total Campaigns** | 2,387 | 2,387 | 2,387 |
| **Active Campaigns** | 485 | 485 | 485 |
| **Campaigns with Playlists** | 148 (27%) | 253 (46%) | 253 (46%) ✅ |
| **Campaign Playlists** | 1,148 | ~1,850 | ~1,850 ✅ |
| **Algorithmic Playlists** | 2 | 173 | 173 ✅ |
| **Vendor Playlists** | 1,146 | ~1,677 | ~1,677 ✅ |
| **Playlists Table** | 460 | 460 | 460 ✅ |

---

## 🎉 Success Criteria

✅ **Code:** Latest commit `3bda88f` deployed  
✅ **Campaign Coverage:** 253 campaigns (46%) have playlist data  
✅ **Total Playlists:** ~1,850 playlists created  
✅ **Algorithmic Playlists:** 173 Spotify Official playlists  
✅ **Vendor Playlists:** ~1,677 vendor-managed playlists  
✅ **UI Structure:** "Segan-DNBMF" structure visible for scraped campaigns  
✅ **Vendor Data:** All CSV vendor playlists imported  
✅ **No Errors:** All services running smoothly  

---

## 🐛 Troubleshooting

### If playlist counts are lower than expected:

```bash
# Re-run import scripts
cd /root/arti-marketing-ops
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Check what's in DB currently
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campaign_playlists;"

# Re-run imports if needed (they're idempotent - safe to re-run)
node scripts/import-csv-playlists-enhanced.js
node scripts/populate-playlist-vendor-data-v2.js
```

### If a campaign doesn't show playlists:

1. Check if campaign exists in `campaign_groups`
2. Check if songs exist in `spotify_campaigns` for that campaign_group_id
3. Check if `campaign_playlists` exist for those song IDs
4. Verify RLS policies aren't blocking access

### If UI doesn't update:

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors
4. Verify Vercel deployment succeeded

---

## 📝 Post-Deployment Tasks

1. **Monitor for 24 hours** - Watch for any errors or issues
2. **User testing** - Have team test campaign details modals
3. **Document any issues** - Track what works and what doesn't
4. **Plan next scraping run** - Identify campaigns that need SFA scraping

---

## 🎯 Next Steps (Future)

1. **Scrape more campaigns** - Run scraper against campaigns with valid SFA links
2. **Automate scraping** - Set up scheduled scraper runs
3. **Add more vendors** - As new vendors are onboarded
4. **Enhanced metrics** - Add ROI calculations, performance trends
5. **Bulk operations** - Bulk status updates, bulk vendor assignments

---

**Ready to deploy! 🚀**

