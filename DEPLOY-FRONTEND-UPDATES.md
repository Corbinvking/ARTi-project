# Deploy Frontend Updates - Quick Guide

**Date:** November 23, 2025  
**What:** Updated Spotify UI to show 24h/7d/28d data and tag algorithmic playlists

---

## Production Deployment Commands

### SSH to Droplet
```bash
ssh root@165.227.91.129
```

### Pull Latest Code
```bash
cd /root/arti-marketing-ops
git pull origin main
```

### Rebuild Frontend
```bash
cd apps/frontend
npm install  # Only if package.json changed (it didn't)
npm run build
```

### Restart Frontend Service
```bash
# If using PM2
pm2 restart frontend

# OR if using Docker
cd /root/arti-marketing-ops
docker-compose restart frontend
```

### Verify Changes
1. Open browser to production URL
2. Navigate to any campaign with scraped data (e.g., "DAUNTER x URAI - ENGULFED")
3. Click "Playlists" tab
4. Verify:
   - Table shows 24h, 7d, 28d columns (not 12m)
   - Algorithmic playlists have green "Algorithmic" badges
   - Algorithmic section shows updated cards with all time ranges

---

## What Changed

### Visual Changes
- ✅ Vendor playlists table: 12m → 24h
- ✅ Algorithmic playlists: Green badges with Radio icon
- ✅ Algorithmic cards: Show 24h/7d/28d in grid layout
- ✅ Summary stats: Use actual 24h data

### Backend (Already Complete)
- ✅ Database migration applied (`043_add_campaign_playlists_timerange_columns.sql`)
- ✅ Scraper populating 24h/7d/28d data
- ✅ 1,766 playlists synced with new data

---

## Troubleshooting

### If changes don't appear:
1. **Hard refresh browser:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **Check build:** Ensure `npm run build` completed without errors
3. **Verify data:** Check that campaigns have `streams_24h`, `streams_7d`, `streams_28d` in database

### If build fails:
```bash
# Clear node_modules and rebuild
cd apps/frontend
rm -rf node_modules
rm -rf .next
npm install
npm run build
```

---

## Testing Campaign

**"DAUNTER x URAI - ENGULFED"** has confirmed data:
- 9 vendor playlists with streams
- Algorithmic playlists: Radio, Discover Weekly, Your DJ, Daylist, Mixes, etc.
- All time ranges populated (24h, 7d, 28d)

---

## Rollback (If Needed)

```bash
cd /root/arti-marketing-ops
git log --oneline  # Find previous commit
git reset --hard <previous-commit-hash>
cd apps/frontend
npm run build
pm2 restart frontend  # or docker-compose restart frontend
```

---

**Deployment should take < 5 minutes!** 🚀

