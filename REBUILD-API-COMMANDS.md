# Rebuild API with Scraper Integration

## 🚀 **Quick Commands to Run on Droplet:**

```bash
# 1. Navigate to project directory
cd /root/arti-marketing-ops

# 2. Pull latest code with fixes
git pull origin main

# 3. Force rebuild API container (clean build)
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build --no-cache api

# 4. Restart the API container
docker restart supabase_api_arti-marketing-ops

# 5. Wait for startup and test health
sleep 15
curl http://localhost:3002/health

# 6. Test scraper health endpoint
curl http://localhost:3002/api/providers/spotify/health

# 7. Test scraper job creation
curl -X POST http://localhost:3002/api/providers/spotify/scrape \
  -H "Content-Type: application/json" \
  -d '{"songUrls": ["https://artists.spotify.com/c/artist/test/song/example"]}'
```

## ✅ **Expected Results:**
- ✅ Build should complete without TypeScript errors
- ✅ `/health` should return `{"status":"ok",...}`
- ✅ `/api/providers/spotify/health` should return scraper health
- ✅ Scraper job creation should work (may require auth)

## 🔧 **If Build Still Fails:**
```bash
# Check build logs
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml logs api

# Check container status
docker ps | grep api
```

**SSH into your droplet and run these commands to get the scraper working!** 🎵
