# 🚀 Quick Commands for Upgraded Droplet

## Copy-Paste These Commands:

### 1. Fix Git Merge Conflict
```bash
cd /root/arti-marketing-ops
git stash
git pull origin main
```

### 2. Check Platform Status
```bash
chmod +x scripts/check-platform-status.sh
./scripts/check-platform-status.sh
```

### 3. Start Platform
```bash
chmod +x start-platform-production.sh
./start-platform-production.sh
```

### 4. Set Up Spotify Scraper v2
```bash
chmod +x scripts/setup-spotify-scraper-v2.sh
bash scripts/setup-spotify-scraper-v2.sh
```

### 5. Test Everything
```bash
./scripts/manage-scraper.sh status
./scripts/manage-scraper.sh test
curl http://localhost:3002/api/providers/spotify/health
```

## Expected Results:

**Platform Status:**
- ✅ Docker: Running
- ✅ Supabase: Running  
- ✅ Containers: 5+ running
- ✅ API: Healthy

**Scraper Setup:**
- ✅ Python 3.11 installed
- ✅ Playwright available
- ✅ API integration working
- ✅ Ready for scraping!

---
**Frontend:** https://app.artistinfluence.com/admin/integrations
