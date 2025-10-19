# ✅ Production Deployment Checklist

## Status: Ready to Deploy

All code has been committed and pushed to GitHub. Frontend will auto-deploy via Vercel. Backend needs manual deployment.

---

## Quick Start (Automated)

### Option 1: Use Deployment Script (Recommended)

```bash
# SSH into production
ssh root@your-production-server

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest code
git pull origin main

# Make script executable
chmod +x DEPLOY-TO-PRODUCTION.sh

# Run deployment script
./DEPLOY-TO-PRODUCTION.sh
```

**The script will automatically:**
- ✅ Create database backup
- ✅ Pull latest code
- ✅ Apply migrations
- ✅ Import CSV data
- ✅ Fix duplicates and link vendors
- ✅ Create playlists
- ✅ Verify everything
- ✅ Restart services

**Total time:** ~25-35 minutes

---

## Option 2: Manual Deployment (Step by Step)

If you prefer manual control or the script fails:

### Step 1: SSH and Prepare

```bash
ssh root@your-production-server
cd /root/arti-marketing-ops
```

### Step 2: Backup Database (CRITICAL!)

```bash
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Pull Latest Code

```bash
git pull origin main
npm install
```

### Step 4: Apply Migrations

```bash
# Migration 033
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/033_add_algorithmic_playlists.sql

# Migration 034
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/034_enhance_campaign_tracking.sql
```

### Step 5: Set Environment

```bash
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="$(grep SERVICE_ROLE_KEY .env | cut -d '=' -f 2)"
```

### Step 6: Import Data

```bash
# Import CSV
node scripts/import-csv-campaigns-full.js

# Fix duplicates
node scripts/fix-duplicates-batch.js

# Link vendors
node scripts/fix-duplicates-and-vendors.js

# Create playlists
node scripts/create-playlists-from-csv-data.js

# Fix statuses
node scripts/fix-csv-campaign-statuses.js

# Create missing vendors
node scripts/create-missing-vendor-and-playlists.js

# Sync playlists
node scripts/sync-campaign-playlists-to-playlists-v2.js
```

### Step 7: Restart Services

```bash
docker-compose restart
```

---

## Verification

### Check Database Counts

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  'Clients' as entity, COUNT(*)::text as count FROM clients
UNION ALL
SELECT 'Vendors', COUNT(*)::text FROM vendors
UNION ALL
SELECT 'Campaigns', COUNT(*)::text FROM spotify_campaigns
UNION ALL
SELECT 'Playlists', COUNT(*)::text FROM campaign_playlists
UNION ALL
SELECT 'Active Campaigns', COUNT(*)::text FROM spotify_campaigns WHERE LOWER(status) = 'active';
"
```

**Expected:**
- Clients: 259-270
- Vendors: 9
- Campaigns: 2300-2400
- Playlists: 1600-1800
- Active Campaigns: 470-490

### Check for Duplicates

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM (SELECT name FROM clients GROUP BY name HAVING COUNT(*) > 1) x;"
```

**Expected:** `0` (no duplicates)

### Test Frontend

1. Open your production URL
2. Navigate to **Clients** tab → Should see 259+ clients
3. Navigate to **Campaigns** tab → Should see 470+ active campaigns
4. Click a campaign → **Campaign Details Modal** should open
5. Click **"Playlists" tab** → Should show playlists with stream data
6. Check **Interactive Status Badge** → Should be clickable

---

## Frontend Deployment (Automatic)

Vercel automatically deploys when you push to GitHub main branch.

**Monitor:**
- Go to https://vercel.com/your-project/deployments
- Latest deployment should show "Building" or "Ready"
- Wait for it to complete (~3-5 minutes)

**If deployment fails:**
- Check build logs in Vercel dashboard
- Most common issue: Missing environment variables
- Redeploy previous version if needed

---

## Rollback Plan

### If Database Issues

```bash
# Restore from backup
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql
```

### If Frontend Issues

1. Go to Vercel dashboard
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### If Code Issues

```bash
cd /root/arti-marketing-ops
git reset --hard HEAD~1  # Go back one commit
docker-compose restart
```

---

## Post-Deployment

### Immediate Checks (First 10 minutes)

- [ ] Frontend loads without errors
- [ ] Clients page shows data
- [ ] Campaigns page shows data
- [ ] Campaign Details Modal opens and shows playlists
- [ ] Status badges are clickable
- [ ] No console errors in browser

### First Hour Checks

- [ ] Create a new campaign (test form submission)
- [ ] Edit a campaign status
- [ ] Search for clients
- [ ] Filter campaigns by status
- [ ] Check vendor pages show playlists

### First 24 Hours

- [ ] Monitor for user-reported issues
- [ ] Check server logs for errors
- [ ] Verify data accuracy
- [ ] Test on multiple browsers

---

## What Changed?

### Database

- **New Tables:** None (enhanced existing tables)
- **New Columns:** 15+ tracking columns in `campaign_groups` and `spotify_campaigns`
- **New Index:** `is_algorithmic` on `campaign_playlists`

### Data

- **223 new campaigns** from CSV import
- **841 new playlists** from CSV data
- **16 new campaigns** from S4A scraper
- **2,039 playlists** from S4A scraper
- **8 new clients** (artists from S4A list)
- **0 duplicates** (803 removed)

### Code

- **Frontend:** Campaign Details Modal enhancements, Interactive Status Badge
- **Backend:** CSV import scripts, S4A scraper workflow, data fix scripts
- **Migrations:** 2 new migrations (033, 034)

---

## Troubleshooting

### "Cannot find module"
```bash
cd /root/arti-marketing-ops
npm install
```

### "SUPABASE_SERVICE_ROLE_KEY not found"
```bash
cat .env | grep SERVICE_ROLE_KEY
export SUPABASE_SERVICE_ROLE_KEY="<paste-key-here>"
```

### "Relation does not exist"
**Solution:** Apply migrations first (see Step 4 above)

### "Column already exists"
**Solution:** Migration already applied, this is OK - continue

---

## Support Contacts

**If you encounter issues:**
1. Check this checklist's Troubleshooting section
2. Check `PRODUCTION-DEPLOYMENT-PLAN.md` for detailed steps
3. Review error messages carefully
4. Check Docker logs: `docker logs supabase_db_arti-marketing-ops --tail 100`

---

## Success Criteria

✅ All migrations applied  
✅ CSV data imported  
✅ No duplicate clients  
✅ Vendors linked to campaigns  
✅ Playlists showing in UI  
✅ Frontend deployed and accessible  
✅ Campaign Details Modal works  
✅ Status badges are interactive  
✅ No console errors  

---

## Timeline

| Phase | Time | Status |
|-------|------|--------|
| Code push to GitHub | Complete | ✅ |
| Vercel deployment | Auto (3-5 min) | 🔄 |
| SSH to production | Manual | ⏳ |
| Database backup | Manual (1 min) | ⏳ |
| Pull code | Manual (1 min) | ⏳ |
| Apply migrations | Manual (2 min) | ⏳ |
| Import data | Manual (20-30 min) | ⏳ |
| Verification | Manual (5 min) | ⏳ |
| **Total** | **30-45 min** | |

---

## Next Steps

1. **Now:** SSH into production and run `./DEPLOY-TO-PRODUCTION.sh`
2. **After deployment:** Test the UI thoroughly
3. **Tomorrow:** Monitor for issues
4. **This week:** Train team on new features

---

**You're ready to deploy! 🚀**

