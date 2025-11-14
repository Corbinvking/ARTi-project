# SoundCloud Production Import Guide

**Date:** November 14, 2024  
**CSV File:** `SoundCloud-All Campaigns.csv` (2,149 rows)  
**Script:** `scripts/import-soundcloud-submissions.ts`  
**Target:** Production Database

---

## 📋 Pre-Import Checklist

- [ ] CSV file ready: `SoundCloud-All Campaigns.csv`
- [ ] Import script exists: `scripts/import-soundcloud-submissions.ts` ✅
- [ ] Production server access (SSH)
- [ ] Service role key available

---

## 🚀 Step-by-Step Import Process

### Step 1: Upload CSV to Production Server

**On your local machine:**
```bash
# Upload the CSV file to production
scp "SoundCloud-All Campaigns.csv" root@artistinfluence.com:~/arti-marketing-ops/

# Verify upload
ssh root@artistinfluence.com "ls -lh ~/arti-marketing-ops/*.csv"
```

### Step 2: SSH into Production Server

```bash
ssh root@artistinfluence.com
cd ~/arti-marketing-ops
```

### Step 3: Verify Environment

```bash
# Check if .env file has the service role key
cat .env | grep SUPABASE_SERVICE_ROLE_KEY

# If not present, add it:
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" >> .env
echo "SUPABASE_URL=https://api.artistinfluence.com" >> .env
```

### Step 4: Run the Import Script

```bash
# Make sure you're in the project root
cd ~/arti-marketing-ops

# Export environment variables (or source .env)
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run the import
npx ts-node scripts/import-soundcloud-submissions.ts
```

---

## 📊 Expected Output

```
🎵 SoundCloud Submissions Import Starting...

📄 Found 2149 rows in CSV

👥 Step 1: Processing Members...
  ✅ Created member: Client Name 1
  ✅ Created member: Client Name 2
  ...

✅ Processed XX members

🎵 Step 2: Importing Submissions...
  ✅ Imported: Artist - Track Name
  ✅ Imported: Another Artist - Another Track
  ✅ Imported: Third Artist - Third Track
  ...

📊 Import Summary:
  ✅ Success: XXXX
  ❌ Errors: 0
  ⏭️  Skipped: XXX
  📊 Total: 2149

✨ SoundCloud import complete!
```

---

## 🔍 What the Script Does

### 1. Processes Members (Clients)
```typescript
// Creates records in: soundcloud_members
// For each unique client name in CSV
// Default tier: T1
// Default status: active
```

### 2. Imports Submissions
```typescript
// Creates records in: soundcloud_submissions
// Maps CSV fields:
// - Track Info → artist_name
// - URL → track_url
// - Status → status (mapped)
// - Start Date → support_date
// - Goal → expected_reach_planned
```

### 3. Status Mapping
```
CSV Status    → Database Status
"Active"      → approved
"Unreleased"  → new
"Complete"    → approved
"Completed"   → approved
"Paused"      → pending
```

---

## ✅ Verification After Import

### Check Database Records

```bash
# Connect to database
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres

# Check submission count
SELECT COUNT(*) as total_submissions FROM soundcloud_submissions;

# Check by status
SELECT status, COUNT(*) as count 
FROM soundcloud_submissions 
GROUP BY status 
ORDER BY count DESC;

# Check members created
SELECT COUNT(*) as total_members FROM soundcloud_members;

# Check recent imports
SELECT 
  artist_name,
  track_url,
  status,
  support_date,
  created_at
FROM soundcloud_submissions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Expected Results
```sql
-- Total submissions should be around 2,083 (after skipping invalid rows)
total_submissions | 2083

-- Status distribution
status    | count
----------|------
approved  | XXXX
new       | XXXX
pending   | XXXX

-- Members should match unique clients in CSV
total_members | ~865
```

---

## 🌐 Verify in Frontend

### Step 1: Clear Browser Cache
```
Ctrl + Shift + R (hard refresh)
Or clear cache completely
```

### Step 2: Navigate to Campaigns Page
```
https://your-production-domain.com/soundcloud/dashboard/campaigns
```

### Step 3: Check Display
✅ Should show ~2,083 submissions
✅ Each with artist name, track URL, status
✅ Filters should work
✅ Search should work

---

## 🐛 Troubleshooting

### Issue: "SUPABASE_SERVICE_ROLE_KEY environment variable is required"

**Solution:**
```bash
# Export the key before running
export SUPABASE_SERVICE_ROLE_KEY="your_actual_service_role_key"

# Or source from .env
source .env

# Then run import again
npx ts-node scripts/import-soundcloud-submissions.ts
```

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```bash
# Install dependencies
npm install

# Or specifically install supabase
npm install @supabase/supabase-js
```

### Issue: "CSV file not found"

**Solution:**
```bash
# Make sure CSV is in project root
ls -la "SoundCloud-All Campaigns.csv"

# If not, upload again
# (from local machine)
scp "SoundCloud-All Campaigns.csv" root@artistinfluence.com:~/arti-marketing-ops/
```

### Issue: Duplicate entries on re-run

**Solution:**
```sql
-- Script doesn't check for duplicates by default
-- If you need to re-run, first delete imported data:

-- BE CAREFUL - This deletes data!
DELETE FROM soundcloud_submissions WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM soundcloud_members WHERE org_id = '00000000-0000-0000-0000-000000000001';

-- Then re-run import
```

### Issue: Frontend still shows 0 records

**Possible causes:**

1. **Frontend is querying wrong table**
   - Check if `CampaignsPage.tsx` on production has latest code
   - Should query `soundcloud_submissions`, not `soundcloud_campaigns`

2. **Browser cache**
   - Hard refresh: Ctrl + Shift + R
   - Clear all browser cache

3. **Frontend not deployed**
   - Deploy latest frontend changes:
   ```bash
   # On production server
   cd ~/arti-marketing-ops
   git pull
   cd apps/frontend
   npm run build
   pm2 restart frontend
   ```

---

## 📝 Import Script Details

### What Gets Created

**In `soundcloud_members` table:**
- One record per unique client name in CSV
- Fields populated:
  - `name` - From "Client" column
  - `org_id` - Default org ID
  - `status` - 'active'
  - `size_tier` - 'T1' (default)
  - `monthly_submission_limit` - 4
  - `emails` - Empty array (no email in CSV)

**In `soundcloud_submissions` table:**
- One record per CSV row (if valid)
- Fields populated:
  - `artist_name` - Parsed from "Track Info"
  - `track_url` - From "URL" column
  - `status` - Mapped from CSV "Status"
  - `support_date` - From "Start Date"
  - `expected_reach_planned` - From "Goal"
  - `notes` - From "Notes"
  - `member_id` - Links to created member

### What Gets Skipped

- Rows with empty "Track Info"
- Rows where client can't be matched to member
- Invalid date formats (gracefully handled)

---

## 🎯 Post-Import Tasks

### 1. Verify Data Quality

```bash
# Check for submissions without member
SELECT COUNT(*) 
FROM soundcloud_submissions 
WHERE member_id IS NULL;
-- Should be 0

# Check for invalid URLs
SELECT artist_name, track_url 
FROM soundcloud_submissions 
WHERE track_url NOT LIKE '%soundcloud.com%'
LIMIT 10;

# Check status distribution
SELECT status, COUNT(*) 
FROM soundcloud_submissions 
GROUP BY status;
```

### 2. Update Frontend (If Not Deployed)

```bash
# Make sure latest code is on production
cd ~/arti-marketing-ops
git pull origin main

# Rebuild frontend
cd apps/frontend
npm run build

# Restart if using PM2
pm2 restart frontend

# Or if using Docker
docker-compose restart frontend
```

### 3. Test in Browser

- [ ] Navigate to campaigns page
- [ ] Verify data displays
- [ ] Test filters (status, search)
- [ ] Test pagination (if applicable)
- [ ] Check member names display correctly
- [ ] Verify dates format correctly

---

## 📊 Import Statistics Reference

**From documentation:**
- CSV Total Rows: **2,149**
- Expected Success: **~865** (40%)
- Expected Skipped: **~1,284** (60%)
  - Empty Track URLs
  - Non-SoundCloud URLs
  - Duplicates
  - Test/draft entries

**This is normal!** The 865 valid submissions represent real campaigns.

---

## ✅ Success Checklist

- [ ] CSV uploaded to production server
- [ ] Environment variables set
- [ ] Import script ran successfully
- [ ] Database shows ~2,083 submissions
- [ ] Database shows correct member count
- [ ] Frontend deployed with latest code
- [ ] Browser cache cleared
- [ ] Campaigns page shows data
- [ ] Filters and search work
- [ ] No console errors

---

## 🆘 Need Help?

### Check Logs
```bash
# If using PM2
pm2 logs frontend

# Check database logs
docker logs supabase_db_arti-marketing-ops

# Check API logs
pm2 logs api
```

### Database Query Cheat Sheet
```sql
-- Total submissions
SELECT COUNT(*) FROM soundcloud_submissions;

-- By status
SELECT status, COUNT(*) FROM soundcloud_submissions GROUP BY status;

-- Recent imports
SELECT * FROM soundcloud_submissions ORDER BY created_at DESC LIMIT 10;

-- Check member linkage
SELECT 
  m.name,
  COUNT(s.id) as submission_count
FROM soundcloud_members m
LEFT JOIN soundcloud_submissions s ON m.id = s.member_id
GROUP BY m.name
ORDER BY submission_count DESC
LIMIT 20;
```

---

## 🎉 When Import is Complete

You should see:
- ✅ ~2,083 submissions in database
- ✅ ~865 members (clients) created
- ✅ Data visible on frontend campaigns page
- ✅ All filters and search working
- ✅ No console errors

**Your SoundCloud platform will be fully operational with production data!**

---

**Next Steps:**
1. Run the import (follow steps above)
2. Verify in database
3. Deploy frontend if needed
4. Test in browser
5. Enjoy your populated SoundCloud platform! 🎊


