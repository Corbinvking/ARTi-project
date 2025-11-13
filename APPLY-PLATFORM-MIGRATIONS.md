# 🚀 Platform Schema Migrations - Application Guide

**Created**: November 13, 2025  
**Status**: Ready for Review  
**Target**: Production Database (via local connection)

---

## ⚠️ **CRITICAL: Read Before Applying**

### **Your Setup**
- ✅ Local dev connects to **PRODUCTION** database
- ✅ Changes apply **IMMEDIATELY** to production
- ❌ **NO** staging environment
- ❌ **NO** rollback without backups

### **What These Migrations Do**
1. **042_youtube_complete_schema.sql** - Creates YouTube campaign tables with org_id
2. **043_soundcloud_complete_schema.sql** - Creates SoundCloud member/submission tables with org_id
3. **Instagram** - Already done ✅ (migration 035)

### **Safety Level**
🟢 **LOW RISK** - These migrations:
- Only CREATE new tables (don't modify existing ones)
- Are idempotent (safe to run multiple times)
- Don't touch existing data
- Don't delete anything

---

## 📋 **Pre-Flight Checklist**

Before applying migrations, ensure:

- [ ] You have SSH access to production droplet (164.90.129.146)
- [ ] Database backup exists (or create one now)
- [ ] You've reviewed the migration SQL files
- [ ] You're in the project root directory
- [ ] Your `.env.local` points to production

---

## 🛡️ **Option 1: Safe Testing (Recommended)**

Test migrations on a local Supabase instance first:

### Step 1: Start Local Supabase
```bash
# Stop any running instance
supabase stop

# Start fresh local instance
supabase start

# This will output local credentials
```

### Step 2: Update Environment for Testing
```bash
# Temporarily update .env.local to point to local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local_anon_key_from_start>
```

### Step 3: Apply Migrations Locally
```bash
# Run migrations on local instance
npx supabase migration up

# Check for errors
# If successful, proceed to production
```

### Step 4: Validate Local
```bash
# Run validation script against local
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<local_service_role_key> \
node scripts/validate-platform-schemas.js
```

### Step 5: Restore Production Connection
```bash
# Update .env.local back to production
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
```

---

## 🚀 **Option 2: Direct Production (Confident)**

Apply directly to production (USE WITH CAUTION):

### Step 1: Backup Database
```bash
# SSH to production droplet
ssh root@164.90.129.146

# Navigate to project
cd /root/arti-marketing-ops

# Create backup
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > backup-before-platform-migrations-$(date +%Y%m%d-%H%M%S).sql

# Verify backup was created
ls -lh backup-*.sql

# Download backup to local (from local machine)
scp root@164.90.129.146:/root/arti-marketing-ops/backup-before-platform-migrations-*.sql ./backups/
```

### Step 2: Ensure Correct Environment
```bash
# Verify your .env.local points to production
cat apps/frontend/.env.local | grep SUPABASE_URL

# Should show: NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
```

### Step 3: Review Migrations
```bash
# Read each migration file carefully
cat supabase/migrations/042_youtube_complete_schema.sql
cat supabase/migrations/043_soundcloud_complete_schema.sql

# Look for any DROP or ALTER statements (there shouldn't be any!)
```

### Step 4: Apply Migrations
```bash
# From project root on your local machine
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Run migrations (this will apply to PRODUCTION!)
npx supabase migration up

# Expected output:
# Applying migration 042_youtube_complete_schema.sql...
# Applying migration 043_soundcloud_complete_schema.sql...
# Migrations applied successfully
```

### Step 5: Validate
```bash
# Run validation script against production
$env:SUPABASE_URL="https://api.artistinfluence.com"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
node scripts/validate-platform-schemas.js

# Should output: ✅ All validation checks passed!
```

---

## 🔍 **What Each Migration Creates**

### **YouTube (042_youtube_complete_schema.sql)**

**Enums Created:**
- `youtube_campaign_status` ('pending', 'active', 'paused', 'complete')
- `youtube_service_type` (worldwide, usa, uk, canada, australia, organic_push, playlist_push)
- `youtube_invoice_status` ('tbd', 'sent', 'paid')
- `youtube_priority_level` ('low', 'medium', 'high')
- `youtube_queue_status` ('waiting', 'processing', 'completed', 'failed')

**Tables Created:**
1. `youtube_campaigns` - Campaign tracking with performance metrics
2. `youtube_performance_logs` - Daily performance snapshots
3. `youtube_ratio_fixer_queue` - Queue for fixing engagement ratios

**Indexes:** 14 indexes for performance  
**RLS Policies:** Org-based isolation  
**Triggers:** Auto-update `updated_at` columns

### **SoundCloud (043_soundcloud_complete_schema.sql)**

**Enums Created:**
- `soundcloud_member_status` ('active', 'needs_reconnect')
- `soundcloud_size_tier` ('T1', 'T2', 'T3', 'T4')
- `soundcloud_submission_status` ('new', 'approved', 'rejected')
- `soundcloud_inquiry_status` ('undecided', 'admitted', 'rejected')
- `soundcloud_complaint_status` ('todo', 'in_progress', 'done')
- `soundcloud_target_band_mode` ('balance', 'size')

**Tables Created:**
1. `soundcloud_members` - Reposting artists with T1-T4 tier system
2. `soundcloud_submissions` - Track submissions from artists
3. `soundcloud_inquiries` - Membership applications
4. `soundcloud_complaints` - Issue tracking
5. `soundcloud_genre_families` - Top-level genre taxonomy
6. `soundcloud_subgenres` - Nested subgenres with patterns
7. `soundcloud_mail_events` - Email delivery tracking
8. `soundcloud_settings` - Platform configuration

**Indexes:** 18 indexes for performance  
**RLS Policies:** Org-based isolation  
**Triggers:** Auto-update `updated_at` columns  
**Helper Functions:** `soundcloud_get_member_id_for_user()`

---

## ✅ **Post-Migration Verification**

### 1. Check Tables Exist
```sql
-- Via Supabase Studio (https://db.artistinfluence.com)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'youtube_%'
ORDER BY table_name;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'soundcloud_%'
ORDER BY table_name;
```

Expected:
- **YouTube**: 3 tables
- **SoundCloud**: 8 tables

### 2. Check org_id Columns
```sql
-- All tables should have org_id
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'org_id'
AND (
  table_name LIKE 'youtube_%' OR 
  table_name LIKE 'soundcloud_%'
)
ORDER BY table_name;
```

### 3. Check RLS Enabled
```sql
-- All tables should have RLS enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND (
  tablename LIKE 'youtube_%' OR 
  tablename LIKE 'soundcloud_%'
)
ORDER BY tablename;
```

All should show `rowsecurity = true`

### 4. Test Frontend Integration
```bash
# Restart your dev server
npm run dev

# Navigate to:
# - /youtube/campaigns
# - /soundcloud/dashboard/members
# - /soundcloud/dashboard/submissions

# No errors should appear in console
```

---

## 🔄 **Rollback Procedure** (If Needed)

### If Something Goes Wrong

1. **Stop immediately** - Don't make more changes
2. **Assess damage** - What broke?
3. **Restore from backup** (if critical):

```bash
# SSH to production
ssh root@164.90.129.146
cd /root/arti-marketing-ops

# Restore database from backup
cat backup-before-platform-migrations-YYYYMMDD-HHMMSS.sql | \
docker exec -i supabase_db_arti-marketing-ops psql -U postgres postgres
```

4. **Remove migration entries** (if partial):

```sql
-- Delete migration records so they can be re-run
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('042', '043');
```

5. **Fix issues** and re-apply

---

## 📊 **Expected Results**

After successful migration:

| Platform | Tables Added | Enums Added | Indexes Added | Total Table Count |
|----------|--------------|-------------|---------------|-------------------|
| YouTube | 3 | 5 | 14 | ~50 total |
| SoundCloud | 8 | 6 | 18 | ~58 total |
| **Total** | **11** | **11** | **32** | **~108 total** |

---

## 🐛 **Troubleshooting**

### Error: "relation already exists"
**Solution**: Migration is idempotent - this is OK. It means the table was already created.

### Error: "type already exists"
**Solution**: Migration is idempotent - enum was already created. This is OK.

### Error: "permission denied"
**Solution**: Ensure you're using SERVICE_ROLE_KEY, not ANON_KEY.

### Error: "could not connect to server"
**Solution**: Check that SUPABASE_URL is correct and server is running.

### Frontend errors after migration
**Solution**: 
1. Clear browser cache
2. Restart dev server
3. Check that table names match what frontend expects

---

## 📞 **Need Help?**

If migrations fail:
1. **Don't panic** - Database is backed up
2. **Read error message carefully**
3. **Check validation script output**
4. **Restore from backup if needed**
5. **Document the issue** for future reference

---

## ✅ **Success Criteria**

Migration is complete when:

- [ ] All 11 new tables exist
- [ ] All tables have `org_id` column
- [ ] All tables have RLS enabled
- [ ] Validation script passes
- [ ] Frontend loads without errors
- [ ] YouTube app can create campaigns
- [ ] SoundCloud app can manage members

---

**Generated by Database Schema Integration Agent**  
**Next Step**: Review migrations → Create backup → Apply to production

