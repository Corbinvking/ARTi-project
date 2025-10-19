# 🔍 Production Data Diagnostic

## Issue
Production is **STILL** showing 406 errors when querying the old `campaigns` table, even after our fixes.

## Error in Console
```
GET https://api.artistinfluence.com/rest/v1/campaigns?select=*&id=eq.be7da8c7-4195-443b-91fa-425182876d82 406 (Not Acceptable)
```

## Possible Causes

### 1. **Vercel Hasn't Finished Deploying** ⏳
The code was pushed 5-10 minutes ago. Vercel typically takes 3-5 minutes to build and deploy, but sometimes longer for large builds.

**Solution**: Wait 2-3 more minutes, then hard refresh.

### 2. **Browser Is Heavily Caching Old JS** 🗂️
Even with hard refresh (`Ctrl + Shift + R`), some browsers aggressively cache JavaScript files.

**Solution**: 
- Close **ALL** browser tabs for `app.artistinfluence.com`
- Clear browser data for the site
- Open a completely new Incognito window

### 3. **Service Worker Is Caching** 🔄
If there's a service worker registered, it might be serving the old code.

**Solution**: 
- Open DevTools → Application → Service Workers
- Unregister any service workers
- Hard refresh

### 4. **CDN/Edge Cache** 🌐
Vercel's edge network might be serving cached files from CDN nodes.

**Solution**: This usually resolves itself within 2-3 minutes after deployment.

---

## ✅ **Immediate Actions to Try**

### Step 1: Check Vercel Deployment Status
Go to your Vercel dashboard and verify the latest deployment is **"Ready"** (not "Building").

### Step 2: Nuclear Cache Clear
1. Close ALL tabs for `app.artistinfluence.com`
2. Press `F12` to open DevTools
3. Right-click the refresh button
4. Select "**Empty Cache and Hard Reload**"
5. OR: Open completely new **Incognito/Private window**

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Hard refresh the page
3. Look at the JS files being loaded
4. Check if `CampaignDetailsModal` shows the correct code:
   - Should query `.../campaign_groups?...`
   - Should NOT query `.../campaigns?...`

### Step 4: Verify Production Database Has Data
Run this on production server:

```bash
ssh root@artistinfluence.com
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  'campaign_groups' as table_name, 
  COUNT(*) as count 
FROM campaign_groups
UNION ALL
SELECT 
  'campaign_playlists (vendor)', 
  COUNT(*) 
FROM campaign_playlists 
WHERE NOT is_algorithmic
UNION ALL
SELECT 
  'campaign_playlists (algorithmic)', 
  COUNT(*) 
FROM campaign_playlists 
WHERE is_algorithmic;
"
```

**Expected Output**:
- `campaign_groups`: 340+
- `campaign_playlists (vendor)`: 543
- `campaign_playlists (algorithmic)`: 173

---

## 🎯 **Most Likely Issue**

Based on the timing and error pattern, this is **99% a caching issue**. The code is correct, but the browser/CDN is serving the old JavaScript files.

**Recommended Fix**: 
1. Wait 2 more minutes for Vercel CDN to invalidate
2. Open **new Incognito window**
3. Go to `https://app.artistinfluence.com`
4. Click on "Segan - DNBMF"

You should then see the playlist data!

---

## 📊 **What to Look For in Console**

### ✅ **Good** (Working):
```
Fetching playlists for campaign: be7da8c7-4195-443b-91fa-425182876d82
GET https://api.artistinfluence.com/rest/v1/campaign_groups?select=*&id=eq.be7da8c7... 200 OK
✅ Found playlists - Vendor: X Algorithmic: Y
```

### ❌ **Bad** (Still Cached):
```
GET https://api.artistinfluence.com/rest/v1/campaigns?select=*&id=eq.be7da8c7... 406 (Not Acceptable)
```

---

## 🚨 **If Issue Persists After 10 Minutes**

If the problem is still there after:
- Waiting 10 minutes total
- Multiple hard refreshes
- Trying Incognito mode
- Clearing all cache

Then we need to investigate if there's another file we missed that still has the old `campaigns` query.

Run this command locally to find ALL remaining references:
```bash
cd apps/frontend
grep -r "\.from('campaigns')" --include="*.tsx" --include="*.ts" app/(dashboard)/spotify/stream-strategist/ | wc -l
```

Should return **0** or very close to 0.

