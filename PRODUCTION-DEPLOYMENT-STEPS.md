# Production Deployment Steps

## ✅ Local Steps (COMPLETED)
- [x] Commit changes
- [x] Push to GitHub

---

## 🚀 Production Server Deployment

### Step 1: SSH into Production Server
```bash
ssh root@164.90.129.146
```

### Step 2: Navigate to Project Directory
```bash
cd /root/arti-marketing-ops
```

### Step 3: Check Current Status
```bash
# Check current branch and commit
git status
git log --oneline -3

# Check running processes
pm2 list
```

### Step 4: Pull Latest Code
```bash
# Pull latest code from GitHub
git pull origin main

# You should see:
# - apps/frontend/app/(dashboard)/spotify/stream-strategist/components/CreateCampaignWizard.tsx (NEW)
# - apps/frontend/app/(dashboard)/spotify/stream-strategist/components/ui/interactive-status-badge.tsx (NEW)
# - apps/frontend/app/(dashboard)/spotify/stream-strategist/hooks/useCampaigns.ts (MODIFIED)
# - apps/frontend/app/(dashboard)/spotify/stream-strategist/pages/CampaignHistory.tsx (MODIFIED)
# - apps/frontend/app/(dashboard)/spotify/stream-strategist/components/EditCampaignModal.tsx (MODIFIED)
# - And documentation files
```

### Step 5: Install Dependencies (if needed)
```bash
# Check if new dependencies were added
cd apps/frontend
npm install
cd ../..
```

### Step 6: Build Frontend
```bash
cd apps/frontend
npm run build
cd ../..
```

### Step 7: Restart Services
```bash
# Since frontend is deployed on Vercel, it auto-updates from Git
# Just need to restart backend API if needed
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart api

# Or restart all services if major changes
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart

# Check status
docker ps
```

### Step 8: Verify Deployment
```bash
# Check Docker containers
docker ps

# Check API logs
docker logs arti-marketing-ops-api-1 --tail 50

# Check Supabase status
supabase status

# Test API health
curl https://api.artistinfluence.com/healthz
```

---

## 🔍 Verification Checklist

After deployment, verify these features work:

### 1. Campaign Creation Wizard
- [ ] Go to Campaigns page
- [ ] Click "Create Campaign" button
- [ ] Complete 4-step wizard:
  - [ ] Step 1: Select client, enter campaign name, artist name, start date
  - [ ] Step 2: Add at least one song with either Spotify URL or SFA link
  - [ ] Step 3: Enter total budget
  - [ ] Step 4: Review and submit
- [ ] Campaign should appear in the table

### 2. SFA Link Support
- [ ] Create campaign with only SFA link (no Spotify URL)
- [ ] Should accept format: `https://artists.spotify.com/c/artist/.../song/.../stats`
- [ ] Should save successfully

### 3. Interactive Status Badge
- [ ] Find any campaign in the table
- [ ] Click on the status badge (Active, Draft, Paused, or Completed)
- [ ] Dropdown should appear with all 4 status options
- [ ] Change status
- [ ] Should update immediately with toast notification

### 4. Campaign Editing
- [ ] Click "Edit Campaign" from dropdown
- [ ] Change campaign details
- [ ] Change status in dropdown
- [ ] Save changes
- [ ] Should update successfully

### 5. Campaign Deletion
- [ ] Delete a test campaign
- [ ] Should remove from list
- [ ] Should update database

---

## 🔧 Troubleshooting

### If frontend won't start:
```bash
cd apps/frontend
npm run build
cd ../..
pm2 restart frontend
pm2 logs frontend
```

### If you see "Module not found" errors:
```bash
cd apps/frontend
rm -rf node_modules
rm -rf .next
npm install
npm run build
cd ../..
pm2 restart frontend
```

### If database connection fails:
```bash
# Check Supabase connection
docker ps | grep supabase
# Restart if needed
```

### To view real-time logs:
```bash
pm2 logs frontend
# Press Ctrl+C to exit
```

### To check PM2 process details:
```bash
pm2 describe frontend
```

---

## 📊 What Was Deployed

### New Features:
1. **CreateCampaignWizard** - 4-step campaign creation process
2. **InteractiveStatusBadge** - Click-to-change status functionality
3. **SFA Link Support** - Accept Spotify for Artists URLs
4. **Campaign Group Support** - All CRUD operations now use campaign_groups table

### Bug Fixes:
1. Fixed database schema mismatches (artist_name, price → sale_price)
2. Fixed Select empty string value error
3. Fixed vendor assignment dropdown
4. Updated all mutations to use correct table

### Files Changed:
- `CreateCampaignWizard.tsx` (NEW)
- `InteractiveStatusBadge.tsx` (NEW)
- `useCampaigns.ts` (MODIFIED - added useCreateCampaign)
- `CampaignHistory.tsx` (MODIFIED - updated mutations)
- `EditCampaignModal.tsx` (MODIFIED - fixed save to campaign_groups)
- Documentation files (CRUD verification, architecture)

---

## 🎯 Expected Results

After deployment:
- ✅ Users can create campaigns through beautiful 4-step wizard
- ✅ Users can add SFA links instead of/in addition to Spotify URLs
- ✅ Users can click status badges to change campaign status
- ✅ All CRUD operations work correctly with new database structure
- ✅ Edit/delete operations update campaign_groups table
- ✅ No console errors
- ✅ Real-time UI updates

---

## 📝 Rollback Plan (if needed)

If something goes wrong:

```bash
# Check previous commit
git log --oneline -5

# Rollback to previous version
git reset --hard 2c6d94a

# Rebuild and restart
cd apps/frontend
npm run build
cd ../..
pm2 restart all
```

---

## ✅ Post-Deployment

After successful deployment:
1. Test all features listed in verification checklist
2. Monitor PM2 logs for any errors
3. Check browser console for client-side errors
4. Test with real user account
5. Create a test campaign end-to-end

---

## 🚨 Emergency Contacts

If you encounter issues:
- Check PM2 logs: `pm2 logs frontend`
- Check PM2 status: `pm2 status`
- Restart services: `pm2 restart all`
- View this guide: `cat PRODUCTION-DEPLOYMENT-STEPS.md`

---

**Deployment prepared by:** AI Assistant
**Date:** 2025-01-17
**Commit:** ec3cda1

