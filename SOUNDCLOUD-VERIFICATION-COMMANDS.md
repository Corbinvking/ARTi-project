# SoundCloud Production Data Verification

## ✅ Your Import Was Successful!

**Import Results:**
- ✅ Success: **865 submissions**
- ❌ Errors: **0**
- ⏭️ Skipped: **29** (invalid rows)
- 📊 Total Processed: **894**

---

## 🔍 Verification Commands (Run on Production Server)

### 1. Check Data Counts

```bash
# On production server (you're already there!)
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  'soundcloud_submissions' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'new') as new,
  COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM soundcloud_submissions
UNION ALL
SELECT 
  'soundcloud_members' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  NULL as new,
  NULL as pending
FROM soundcloud_members
ORDER BY table_name;
"
```

**Expected Output:**
```
       table_name        | total_count | approved | new | pending
-------------------------|-------------|----------|-----|--------
soundcloud_members       |     ~80     |   ~80    |     |
soundcloud_submissions   |     865     |  ~XXX    | XXX | XXX
```

### 2. View Sample Data

```bash
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  id,
  artist_name,
  status,
  support_date,
  expected_reach_planned,
  created_at
FROM soundcloud_submissions
ORDER BY created_at DESC
LIMIT 10;
"
```

### 3. Check Member Data

```bash
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  m.name as member_name,
  COUNT(s.id) as submission_count
FROM soundcloud_members m
LEFT JOIN soundcloud_submissions s ON m.id = s.member_id
GROUP BY m.name
ORDER BY submission_count DESC
LIMIT 20;
"
```

---

## 🌐 Frontend Verification

### **IMPORTANT:** Make Sure Frontend Has Latest Code!

The frontend code I fixed earlier needs to be deployed to production. The changes were:

**Files that need to be on production:**
1. `apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx`
   - Now queries `soundcloud_submissions` instead of `soundcloud_campaigns`

2. `apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/MembersPage.tsx`
   - Now uses correct table names (`soundcloud_members`)

### Deploy Latest Code to Production

```bash
# On production server
cd ~/arti-marketing-ops

# Pull latest code (if you've committed/pushed the fixes)
git pull origin main

# Or manually copy the fixed files from your local machine
# (from local Windows PowerShell):
# scp "apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx" \
#   root@artistinfluence.com:~/arti-marketing-ops/apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/

# Rebuild frontend
cd apps/frontend
npm run build

# Restart frontend service
pm2 restart frontend
# OR if using Docker:
# docker-compose restart frontend
```

### Check Frontend in Browser

1. **Navigate to:**
   ```
   https://api.artistinfluence.com/soundcloud/dashboard/campaigns
   ```

2. **Hard refresh browser:**
   ```
   Ctrl + Shift + R (Windows)
   Cmd + Shift + R (Mac)
   ```

3. **Expected Result:**
   - ✅ See **865 campaigns** in the "All Campaigns" tab
   - ✅ Each campaign shows: Artist Name, Track URL, Status
   - ✅ Filters work (Active, New, Pending, Complete)
   - ✅ No console errors

---

## 🐛 If Frontend Shows 0 Records

### Issue 1: Frontend Not Deployed

**Solution:** Deploy the latest code (see above)

### Issue 2: Browser Cache

**Solution:**
```
1. Open browser DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"
3. Or clear all browser data for the site
```

### Issue 3: Check Frontend Logs

```bash
# On production server
pm2 logs frontend

# Look for errors related to Supabase queries
```

### Issue 4: Check if Frontend Code is Updated

```bash
# On production server
cd ~/arti-marketing-ops/apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard

# Check if CampaignsPage.tsx has the fix
grep -n "soundcloud_submissions" CampaignsPage.tsx

# Should show lines that query soundcloud_submissions
```

---

## 📊 Data Breakdown

Based on your import:

**Submissions by Status:**
```
Status     | Expected Count | Description
-----------|----------------|---------------------------
approved   | ~600-700      | Active + Complete campaigns
new        | ~100-150      | Unreleased campaigns
pending    | ~50-100       | Paused campaigns
```

**Members Created:**
```
Total: ~80 unique clients
Each linked to 1+ submissions
```

**Track Info Parsed:**
```
865 submissions with:
- Artist Name (parsed from "Track Info")
- Track URL (from CSV "URL" column)
- Support Date (from CSV "Start Date")
- Expected Reach (from CSV "Goal")
- Notes (from CSV "Notes")
```

---

## ✅ Success Checklist

- [x] Import script completed (865 success, 0 errors)
- [ ] Database verification (run command above)
- [ ] Frontend code deployed to production
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Frontend service restarted
- [ ] Browser cache cleared
- [ ] Campaigns page shows 865 records
- [ ] Members page shows ~80 members
- [ ] No console errors

---

## 🎯 Next Steps

### 1. **Right Now:** Verify Database
```bash
# Run this on production server
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as total FROM soundcloud_submissions;
"
```

Should show: **865**

### 2. **Deploy Frontend** (if not already done)
```bash
cd ~/arti-marketing-ops
git pull origin main  # if changes are committed
cd apps/frontend
npm run build
pm2 restart frontend
```

### 3. **Test in Browser**
- Open: `https://api.artistinfluence.com/soundcloud`
- Navigate to Campaigns
- Verify data displays

### 4. **Celebrate!** 🎉
Your SoundCloud platform is now fully populated with production data!

---

## 🆘 Still Not Working?

### Quick Debug Checklist

```bash
# 1. Verify data exists
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM soundcloud_submissions;"

# 2. Check frontend is running
pm2 status frontend

# 3. Check frontend logs for errors
pm2 logs frontend --lines 50

# 4. Verify CampaignsPage.tsx has the fix
cd ~/arti-marketing-ops/apps/frontend
grep -A 5 "soundcloud_submissions" app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx

# 5. Test Supabase connection
curl -X GET "https://api.artistinfluence.com/rest/v1/soundcloud_submissions?select=count" \
  -H "apikey: your_anon_key" \
  -H "Authorization: Bearer your_anon_key"
```

---

**Your import was successful! Now just make sure the frontend code is deployed.** 🚀


