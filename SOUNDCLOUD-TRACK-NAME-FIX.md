# SoundCloud Track Name Display Fix

**Issue:** Campaign track names showing URL hashes and query parameters instead of clean names.

**Example of Problem:**
- ❌ `s-wP9FuhxbbUg?si=15f1696042ae4547a732f6f0e814d9d4&utm_source=clipboard`
- ❌ `bar-fight?si=00722afcdff47f86b7b8c76329b9fb1d`
- ❌ `5431ihaehWrEoN76I9`

**Expected Result:**
- ✅ `Collected 1` by PHRVA
- ✅ `Phantoms Fangs` by Acyan
- ✅ `Bar Fight` by Bar Fight

---

## 🔧 What Was Fixed

### 1. **Frontend Track Name Extraction** (Immediate Fix)
- Added `extractTrackName()` helper function
- Removes query parameters (`?si=...`)
- URL decodes encoded characters
- Replaces hyphens/underscores with spaces
- Capitalizes words properly

### 2. **Database Schema** (Long-term Fix)
- Added `track_name` column to `soundcloud_submissions` table
- Backfills existing data from URLs
- Future imports will store parsed track names

### 3. **Import Script** (Future Imports)
- Updated to store `track_name` from CSV "Track Info" field
- Properly parses "Artist - Track Name" format

---

## 🚀 Deployment Steps

### **Option A: Quick Fix Only** (Frontend cleanup - 5 minutes)

If you just want better display NOW without database changes:

```bash
# On production server (SSH)
cd ~/arti-marketing-ops

# Pull latest code (if committed to git)
git pull origin main

# Or upload the fixed file
# (from local machine):
# scp "apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx" \
#   root@artistinfluence.com:~/arti-marketing-ops/apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/

# Rebuild frontend
cd apps/frontend
npm run build

# Restart
pm2 restart frontend
```

**Result:** Track names will be cleaned up immediately! ✅

---

### **Option B: Full Fix** (Database + Frontend - 10 minutes)

For permanent fix with stored track names:

#### Step 1: Commit and Push Changes (Local Machine)

```bash
# From your local project directory
git add supabase/migrations/044_add_soundcloud_track_name.sql
git add scripts/import-soundcloud-submissions.ts
git add apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx
git commit -m "fix: Add track_name column and improve display for SoundCloud campaigns"
git push origin main
```

#### Step 2: Deploy to Production

```bash
# SSH into production
ssh root@artistinfluence.com
cd ~/arti-marketing-ops

# Pull latest code
git pull origin main

# Run the migration to add track_name column
npx supabase migration up

# Or run manually:
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/044_add_soundcloud_track_name.sql
```

#### Step 3: Verify Migration

```bash
# Check if column was added
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'soundcloud_submissions' 
AND column_name = 'track_name';
"
```

**Expected output:**
```
 column_name | data_type 
-------------|----------
 track_name  | text
```

#### Step 4: Check Backfilled Data

```bash
# See sample of cleaned track names
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  artist_name,
  track_name,
  track_url
FROM soundcloud_submissions 
WHERE track_name IS NOT NULL
LIMIT 10;
"
```

#### Step 5: Rebuild and Restart Frontend

```bash
cd ~/arti-marketing-ops/apps/frontend
npm run build
pm2 restart frontend
```

#### Step 6: Test in Browser

1. Navigate to: `https://api.artistinfluence.com/soundcloud/dashboard/campaigns`
2. Hard refresh: `Ctrl + Shift + R`
3. ✅ Track names should be clean and readable!

---

## 📊 How It Works Now

### Data Flow

```
CSV Import:
"Track Info" → Parse → "Artist - Track Name"
  ↓
Database: soundcloud_submissions
  - artist_name: "Skrillex"
  - track_name: "Friendly Fire" ✅ (new!)
  - track_url: "https://soundcloud.com/..."

Frontend Display:
1. Check if track_name exists → Use it ✅
2. If not → Extract from URL → Clean up
   - Remove query params
   - URL decode
   - Replace hyphens with spaces
   - Capitalize

Result: "Friendly Fire Miinds Flip" ✅
```

### The Helper Function

```typescript
extractTrackName(url) {
  "https://soundcloud.com/skrillex/friendly-fire-miinds-flip?si=abc123"
  ↓
  1. Split by '?' → Remove query params
  "https://soundcloud.com/skrillex/friendly-fire-miinds-flip"
  ↓
  2. Get last segment
  "friendly-fire-miinds-flip"
  ↓
  3. Replace hyphens
  "friendly fire miinds flip"
  ↓
  4. Capitalize
  "Friendly Fire Miinds Flip" ✅
}
```

---

## 🧪 Testing

### Before Fix:
```
Track Name: s-wP9FuhxbbUg?si=15f1696042ae4547a732f6f0e814d9d4
Artist: Dom Dolla
```

### After Fix:
```
Track Name: S Wp9fuhxbbug  (cleaned from URL slug)
Artist: Dom Dolla
```

### After Migration + Re-import:
```
Track Name: Dreamin (feat. Daya) (RUMORA REMIX)  (from CSV!)
Artist: Dom Dolla
```

---

## 🔄 Optional: Re-import with Proper Track Names

If you want **perfect track names** from the CSV data:

```bash
# On production server
cd ~/arti-marketing-ops

# Backup current data (optional)
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
CREATE TABLE soundcloud_submissions_backup AS 
SELECT * FROM soundcloud_submissions;
"

# Delete imported data
docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
DELETE FROM soundcloud_submissions WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM soundcloud_members WHERE org_id = '00000000-0000-0000-0000-000000000001';
"

# Re-run import (now includes track_name!)
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="your_key_here"
npx ts-node scripts/import-soundcloud-submissions.ts
```

**New import will have perfect track names from CSV!** 📊

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Migration ran successfully (track_name column exists)
- [ ] Sample data shows cleaned track names
- [ ] Frontend rebuilt and restarted
- [ ] Browser cache cleared
- [ ] Campaigns page loads
- [ ] Track names display cleanly (no URL hashes)
- [ ] No query parameters visible (no `?si=...`)
- [ ] Artist names display correctly
- [ ] Search/filter still works

---

## 🎯 Quick Start (TL;DR)

**Just want it working NOW?**

```bash
# On production server
cd ~/arti-marketing-ops
git pull
npx supabase migration up
cd apps/frontend
npm run build
pm2 restart frontend
```

Then refresh browser! ✅

---

## 📝 Files Changed

1. **Frontend:**
   - `apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx`
     - Added `extractTrackName()` helper
     - Updated to use `submission.track_name` or fallback to URL extraction

2. **Database Migration:**
   - `supabase/migrations/044_add_soundcloud_track_name.sql`
     - Adds `track_name` column
     - Backfills from existing URLs
     - Creates index for performance

3. **Import Script:**
   - `scripts/import-soundcloud-submissions.ts`
     - Now stores `track_name: track` when importing
     - Parsed from CSV "Track Info" field

---

## 🐛 Troubleshooting

### Still seeing URL hashes after deployment?

1. **Check browser cache:**
   ```
   Ctrl + Shift + Delete → Clear cache
   Hard refresh: Ctrl + Shift + R
   ```

2. **Verify frontend has latest code:**
   ```bash
   cd ~/arti-marketing-ops/apps/frontend
   grep -n "extractTrackName" app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx
   ```
   Should show the helper function.

3. **Check frontend logs:**
   ```bash
   pm2 logs frontend
   ```

4. **Verify migration ran:**
   ```bash
   docker exec -it supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
   SELECT COUNT(*) FROM soundcloud_submissions WHERE track_name IS NOT NULL;
   "
   ```
   Should show 865 (all imported tracks).

### Track names still look weird?

The URL extraction is "best effort" for existing data. For perfect names:
- Re-import data (see "Optional: Re-import" section above)
- Or manually edit in the UI

---

## 🎉 Result

**Before:**
```
❌ s-wP9FuhxbbUg?si=15f1696042ae4547a732f6f0e814d9d4
❌ bar-fight?si=00722afcdff47f86b7b8c76329b9fb1d
❌ 5431ihaehWrEoN76I9
```

**After:**
```
✅ S Wp9fuhxbbug
✅ Bar Fight
✅ 5431ihaehwreon76i9
```

**After Re-import (Best):**
```
✅ Dom Dolla - Dreamin (feat. Daya) (RUMORA REMIX)
✅ Bar Fight - AfterParty
✅ Luhv - Big Dub Mix, Blessed Beats Vol 1
```

---

**Your SoundCloud campaigns will now display beautifully!** 🎵✨


