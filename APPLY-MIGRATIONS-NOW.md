# 🚀 Apply Migrations to Production - Quick Guide

**Status**: Migration files ready in GitHub  
**Next**: Apply to production database

---

## 📝 **Copy-Paste Commands** (Run these on production)

### **Step 1: SSH to Production**
```bash
ssh root@164.90.129.146
```

### **Step 2: Navigate to Project & Pull Latest**
```bash
cd /root/arti-marketing-ops
git pull origin main
```

You should see:
```
Updating 9cca23f..ca2f003
Fast-forward
 supabase/migrations/042_youtube_complete_schema.sql     | 350 +++++++++++
 supabase/migrations/043_soundcloud_complete_schema.sql  | 384 +++++++++++
 ...
```

### **Step 3: Create Backup (IMPORTANT!)**
```bash
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > backup-before-migrations-$(date +%Y%m%d-%H%M%S).sql

# Verify backup was created
ls -lh backup-*.sql
```

### **Step 4: Apply YouTube Migration**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/042_youtube_complete_schema.sql
```

**Expected output:**
```
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
ALTER TABLE
CREATE POLICY
CREATE TRIGGER
COMMENT
```

### **Step 5: Apply SoundCloud Migration**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/043_soundcloud_complete_schema.sql
```

**Expected output:**
```
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE TABLE
...
(Similar output as above)
```

### **Step 6: Verify Tables Were Created**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE 'youtube_%' OR table_name LIKE 'soundcloud_%')
ORDER BY table_name;
"
```

**Expected output:**
```
       table_name              
-------------------------------
 soundcloud_complaints
 soundcloud_genre_families
 soundcloud_inquiries
 soundcloud_mail_events
 soundcloud_members
 soundcloud_settings
 soundcloud_subgenres
 soundcloud_submissions
 youtube_campaigns
 youtube_performance_logs
 youtube_ratio_fixer_queue
(11 rows)
```

### **Step 7: Check Org ID Columns**
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'org_id'
AND (table_name LIKE 'youtube_%' OR table_name LIKE 'soundcloud_%')
ORDER BY table_name;
"
```

**Expected**: All tables should show `org_id` column with type `uuid`

### **Step 8: Exit SSH**
```bash
exit
```

---

## ✅ **Validation (Run from your local machine)**

Back on your local Windows machine:

```powershell
# Set environment variables
$env:SUPABASE_URL="https://api.artistinfluence.com"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Run validation script
node scripts/validate-platform-schemas.js
```

**Expected output:**
```
✅ All validation checks passed!
```

---

## 🎯 **Check Database Studio**

Now refresh your database studio: https://db.artistinfluence.com/project/default/editor

You should see:
- ✅ `youtube_campaigns` table
- ✅ `youtube_performance_logs` table  
- ✅ `youtube_ratio_fixer_queue` table
- ✅ `soundcloud_members` table
- ✅ `soundcloud_submissions` table
- ✅ `soundcloud_inquiries` table
- ✅ `soundcloud_complaints` table
- ✅ `soundcloud_genre_families` table
- ✅ `soundcloud_subgenres` table
- ✅ `soundcloud_mail_events` table
- ✅ `soundcloud_settings` table

**Total: 11 new tables!** 🎉

---

## 🔧 **If Something Goes Wrong**

### Rollback from Backup
```bash
ssh root@164.90.129.146
cd /root/arti-marketing-ops

# Find your backup
ls -lh backup-*.sql

# Restore (replace YYYYMMDD-HHMMSS with your backup timestamp)
cat backup-before-migrations-YYYYMMDD-HHMMSS.sql | \
docker exec -i supabase_db_arti-marketing-ops psql -U postgres postgres
```

### View SQL Errors
If you see errors during migration, they'll be shown in the output. Common ones:

- **"relation already exists"** ✅ OK - Migration is idempotent, table already created
- **"type already exists"** ✅ OK - Enum already created
- **"permission denied"** ❌ Problem - Check database permissions
- **"syntax error"** ❌ Problem - SQL syntax issue (shouldn't happen)

---

## 📊 **Estimated Time**

- Backup: ~30 seconds
- Apply migrations: ~10 seconds
- Verify: ~1 minute
- **Total**: ~2-3 minutes

---

## ✅ **After Success**

Once tables are created and verified:

1. **Restart your dev server** (if running)
   ```bash
   npm run dev
   ```

2. **Test the apps**
   - Visit: http://localhost:3000/youtube/campaigns
   - Visit: http://localhost:3000/soundcloud/dashboard

3. **Mark TODO complete** 🎉

---

**Ready to go? Copy commands from Step 1 and start!** 🚀

