# 🔧 Quick Fix Commands for Droplet

## Copy-Paste These Commands on Your Droplet:

### 1. Pull Latest Fixes
```bash
cd /root/arti-marketing-ops
git pull origin main
```

### 2. Run Fix Script
```bash
bash scripts/fix-scraper-setup.sh
```

### 3. Test Everything
```bash
# Test scraper
./scripts/manage-scraper.sh test

# Test API
curl http://localhost:3002/api/providers/spotify/health

# Check what's running
docker ps
```

### 4. If API Still Not Working
```bash
# Restart all services
docker-compose -f docker-compose.supabase-project.yml restart

# Wait a moment
sleep 10

# Test again
curl http://localhost:3002/api/providers/spotify/health
```

## Expected Success Output:

**Scraper Test:**
```
✅ Python 3.x.x available
✅ Playwright available  
✅ JSON available
✅ Asyncio available
✅ Main scraper script found
✅ Data directory found
```

**API Test:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "activeJobs": 0,
    "completedJobs": 0,
    "failedJobs": 0
  }
}
```

## Once Working:

✅ **Frontend Access**: https://app.artistinfluence.com/admin/integrations  
✅ **Scraper Ready**: Paste Spotify URLs and start scraping!  
✅ **Phase 2A Complete**: Ready for webhook infrastructure!

---

**Need Help?** The fix script handles:
- Installing missing Python packages
- Creating proper virtual environment  
- Setting up Playwright browsers
- Configuring Docker environment variables
- Testing all integrations
