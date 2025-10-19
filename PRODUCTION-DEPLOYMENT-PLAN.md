# 🚀 Production Deployment Plan

## Overview

This deployment includes:
- New database migrations (algorithmic playlists, enhanced campaign tracking)
- CSV data import (223 campaigns, 841 playlists)
- S4A scraper data (16 new campaigns, 2,039 playlists)
- Frontend updates (campaign details modal, status badges, etc.)
- Bug fixes (duplicates, vendor linkage, playlist parsing)

## ⚠️ Important Notes

- **Estimated Time**: 30-45 minutes
- **Downtime**: Minimal (frontend only during deployment)
- **Database**: No downtime, migrations run live
- **Backup**: CRITICAL - Backup database before starting

---

## Pre-Deployment Checklist

### 1. Verify Local Changes

```bash
# Check git status
git status

# View changed files
git diff --name-only origin/main
```

### 2. Create Database Backup (CRITICAL!)

```bash
# SSH into production
ssh root@your-production-server

# Create backup
cd /root/arti-marketing-ops
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### 3. Document Current State

```bash
# Document current migration state
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"

# Document current data counts
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM vendors) as vendors,
  (SELECT COUNT(*) FROM spotify_campaigns) as campaigns,
  (SELECT COUNT(*) FROM campaign_playlists) as playlists;
"
```

---

## Deployment Steps

### Phase 1: Code Deployment (5 min)

#### Step 1.1: Commit and Push Code

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: CSV import, S4A scraper, enhanced campaign tracking, bug fixes

- Add migration 033_add_algorithmic_playlists.sql
- Add migration 034_enhance_campaign_tracking.sql
- Implement CSV full import with all 23 columns
- Add S4A scraper workflow with 60s login window
- Fix duplicate clients (803 removed)
- Fix vendor linkage (761 campaigns linked)
- Enhanced Campaign Details Modal with playlist tabs
- Add InteractiveStatusBadge component
- Add SFA link field to campaign creation
- Separate algorithmic playlists (Discover Weekly, Radio)
- Add comprehensive data import scripts
- Fix playlist parsing from scraped JSON"

# Push to main
git push origin main
```

#### Step 1.2: Deploy Frontend (Vercel - Automatic)

Vercel will automatically deploy when you push to main.

**Monitor deployment:**
- Go to https://vercel.com/your-project
- Watch build logs
- Verify deployment succeeds

**Expected time:** 3-5 minutes

---

### Phase 2: Database Migrations (5 min)

#### Step 2.1: SSH into Production

```bash
ssh root@your-production-server
cd /root/arti-marketing-ops
```

#### Step 2.2: Apply Migration 033 (Algorithmic Playlists)

```bash
# Apply migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/033_add_algorithmic_playlists.sql

# Verify
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_playlists" | grep is_algorithmic
```

**Expected output:**
```
is_algorithmic          | boolean                     |           | not null | false
```

#### Step 2.3: Apply Migration 034 (Enhanced Campaign Tracking)

**⚠️ IMPORTANT:** This migration adds many columns. Review before running!

```bash
# Apply migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/034_enhance_campaign_tracking.sql

# Verify campaign_groups columns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_groups" | grep total_

# Verify spotify_campaigns columns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d spotify_campaigns" | grep daily_streams
```

**Expected output:**
```
total_goal              | text
total_remaining         | text
total_daily             | text
total_weekly            | text
...
daily_streams           | integer
weekly_streams          | integer
```

---

### Phase 3: Data Import (20-30 min)

#### Step 3.1: Set Environment Variables

```bash
# Set Supabase credentials
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"
```

**Get service role key from:**
```bash
cat /root/arti-marketing-ops/.env | grep SERVICE_ROLE_KEY
```

#### Step 3.2: Import CSV Data

```bash
# Run full CSV import
node scripts/import-csv-campaigns-full.js
```

**Expected output:**
```
✅ Clients created: ~50-100
✅ Campaign groups created: ~200
✅ Spotify campaigns created: ~223
✅ Campaigns skipped: ~0-5
```

**If errors occur:**
- Check error messages
- Most likely: Duplicate entries (safe to ignore if script says "already exists")
- Re-run script (it's idempotent - safe to run multiple times)

#### Step 3.3: Fix Duplicates and Link Vendors

```bash
# Remove duplicate clients
node scripts/fix-duplicates-batch.js

# Link vendors to campaigns
node scripts/fix-duplicates-and-vendors.js
```

**Expected output:**
```
✅ Duplicates deleted: 0-50 (if any)
✅ Campaigns linked to vendors: 761
```

#### Step 3.4: Create Playlists from CSV Data

```bash
# Create playlist records from CSV campaigns
node scripts/create-playlists-from-csv-data.js
```

**Expected output:**
```
✅ Created 809 playlists
```

#### Step 3.5: Fix Campaign Statuses

```bash
# Update CSV campaigns to Active status
node scripts/fix-csv-campaign-statuses.js
```

**Expected output:**
```
✅ Updated 223 spotify_campaigns to status = 'Active'
```

#### Step 3.6: Create Missing Vendor (Majed)

```bash
# Create vendor Majed and link campaigns
node scripts/create-missing-vendor-and-playlists.js
```

**Expected output:**
```
✅ Created vendor "Majed"
✅ Updated 3 campaigns with vendor_id
```

#### Step 3.7: Sync to Playlists Table

```bash
# Sync campaign_playlists to playlists table
node scripts/sync-campaign-playlists-to-playlists-v2.js
```

**Expected output:**
```
✅ 458 new playlists added to playlists table
```

---

### Phase 4: Verification (5-10 min)

#### Step 4.1: Verify Database Counts

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  'Clients' as entity, COUNT(*)::text as count FROM clients
UNION ALL
SELECT 'Vendors', COUNT(*)::text FROM vendors
UNION ALL
SELECT 'Campaign Groups', COUNT(*)::text FROM campaign_groups
UNION ALL
SELECT 'Spotify Campaigns', COUNT(*)::text FROM spotify_campaigns
UNION ALL
SELECT 'Campaign Playlists', COUNT(*)::text FROM campaign_playlists
UNION ALL
SELECT 'Playlists', COUNT(*)::text FROM playlists
UNION ALL
SELECT 'Active Campaigns', COUNT(*)::text FROM spotify_campaigns WHERE LOWER(status) = 'active'
UNION ALL
SELECT 'Campaigns with Playlists', COUNT(DISTINCT sc.id)::text FROM spotify_campaigns sc INNER JOIN campaign_playlists cp ON sc.id = cp.campaign_id WHERE LOWER(sc.status) = 'active';
"
```

**Expected output:**
```
Clients                  | 259-270
Vendors                  | 9
Campaign Groups          | 200-220
Spotify Campaigns        | 2300-2400
Campaign Playlists       | 1600-1800
Playlists               | 460-480
Active Campaigns        | 470-490
Campaigns with Playlists | 210-230
```

#### Step 4.2: Check for Duplicates

```bash
# Verify no duplicate clients
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, COUNT(*) FROM clients GROUP BY name HAVING COUNT(*) > 1;"
```

**Expected output:**
```
(0 rows)
```

#### Step 4.3: Verify Vendor Linkage

```bash
# Check vendor distribution
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT v.name, COUNT(cp.id) as playlist_count FROM vendors v LEFT JOIN campaign_playlists cp ON v.id = cp.vendor_id GROUP BY v.name ORDER BY playlist_count DESC;"
```

**Expected output:**
```
Club Restricted | 700+
Glenn          | 60+
Golden Nugget  | 35+
Majed         | 3+
...
```

#### Step 4.4: Test Frontend

1. **Open production URL** in browser
2. **Navigate to Clients tab** → Should see 259-270 clients
3. **Navigate to Campaigns tab** → Should see 470+ active campaigns
4. **Click a campaign** → Campaign Details Modal should open
5. **Check Playlists tab** → Should show playlists with stream data
6. **Navigate to Playlists/Vendors tab** → Should show vendors with playlists
7. **Test creating a new campaign** → Should have SFA link field
8. **Test status badge** → Should be clickable with dropdown

---

## Rollback Plan (If Something Goes Wrong)

### If Migrations Fail

```bash
# Restore from backup
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql

# Verify restoration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM clients;"
```

### If Frontend Fails

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous successful deployment
4. Click "..." → "Promote to Production"

### If Data Import Fails

**Safe to re-run all scripts** - they are idempotent:
- Won't create duplicates (checks for existing records)
- Will update existing records
- Will skip errors and continue

---

## Post-Deployment

### 1. Monitor for Issues

**First 24 hours:**
- Check frontend for errors (browser console)
- Monitor database performance
- Watch for user reports

### 2. Update Documentation

- Mark migrations as applied in tracking doc
- Update CHANGELOG.md with deployment details
- Document any issues encountered

### 3. Create Git Tag

```bash
# Create release tag
git tag -a v1.2.0 -m "Release: CSV import, S4A scraper, enhanced tracking"
git push origin v1.2.0
```

---

## Quick Command Reference

### SSH and Navigate
```bash
ssh root@your-production-server
cd /root/arti-marketing-ops
```

### Check Docker Status
```bash
docker ps | grep supabase
docker logs supabase_db_arti-marketing-ops --tail 50
```

### Database Access
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres
```

### View Recent Logs
```bash
docker logs supabase_kong_arti-marketing-ops --tail 100
docker logs supabase_db_arti-marketing-ops --tail 100
```

### Restart Services (if needed)
```bash
cd /root/arti-marketing-ops
docker-compose restart
```

---

## Troubleshooting

### Issue: "Cannot find module"
**Solution:** Install dependencies
```bash
npm install
```

### Issue: "SUPABASE_SERVICE_ROLE_KEY not found"
**Solution:** Export the key
```bash
export SUPABASE_SERVICE_ROLE_KEY="$(cat .env | grep SERVICE_ROLE_KEY | cut -d '=' -f 2)"
```

### Issue: "Relation does not exist"
**Solution:** Apply migrations first
```bash
# Check which migrations are applied
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT * FROM supabase_migrations.schema_migrations;"

# Apply missing migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/XXX_migration_name.sql
```

### Issue: "Column already exists"
**Solution:** Migration already applied, safe to skip
```bash
# Verify column exists
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d table_name"
```

---

## Success Criteria

✅ All migrations applied successfully  
✅ No database errors  
✅ Frontend deployed and accessible  
✅ CSV data imported (223 campaigns)  
✅ Playlists created (800+ records)  
✅ No duplicate clients  
✅ Vendors linked to campaigns  
✅ Active campaigns show playlists in UI  
✅ Campaign Details Modal displays correctly  
✅ New campaign creation works with SFA link  
✅ Status badges are interactive  

---

## Timeline Summary

| Phase | Duration | Critical |
|-------|----------|----------|
| Pre-deployment checks | 5 min | ✅ YES |
| Code deployment | 5 min | Medium |
| Database migrations | 5 min | ✅ YES |
| Data import | 20-30 min | Medium |
| Verification | 5-10 min | ✅ YES |
| **Total** | **40-55 min** | |

---

## Contact / Support

If issues arise during deployment:
1. Check this deployment plan
2. Review error messages carefully
3. Check Troubleshooting section
4. Rollback if necessary (see Rollback Plan)

