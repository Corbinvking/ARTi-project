# Troubleshoot Scraper Routes

The scraper routes exist in the code but aren't responding. Let's debug this:

## 🔍 **Step 1: Check API Logs for Errors**
```bash
cd /root/arti-marketing-ops
docker logs supabase_api_arti-marketing-ops --tail 50 | grep -i error
docker logs supabase_api_arti-marketing-ops --tail 50 | grep -i scraper
docker logs supabase_api_arti-marketing-ops --tail 50 | grep -i spotify
```

## 🔧 **Step 2: Check if Routes are Registered**
```bash
# Check if API is loading the provider routes
docker logs supabase_api_arti-marketing-ops --tail 100 | grep -i route
```

## 🎯 **Step 3: Test Scraper Path**
```bash
# Check if the scraper path is correct in the container
docker exec supabase_api_arti-marketing-ops ls -la /app
docker exec supabase_api_arti-marketing-ops ls -la /app/../../spotify_scraper
docker exec supabase_api_arti-marketing-ops find /app -name "scraper.ts" -o -name "scraper.js"
```

## 🔍 **Step 4: Check if Code is Latest**
```bash
cd /root/arti-marketing-ops
git log --oneline -5
git status

# Check if the scraper files are in the container
docker exec supabase_api_arti-marketing-ops cat /app/src/providers/spotify/scraper.js 2>/dev/null || echo "Scraper file not found in container"
```

## 🚀 **Step 5: Force Rebuild and Restart**
```bash
# Pull latest code and rebuild
cd /root/arti-marketing-ops
git pull origin main

# Force rebuild the API container
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build --no-cache api

# Restart with new build
docker restart supabase_api_arti-marketing-ops

# Wait and test
sleep 15
curl http://localhost:3002/api/providers/spotify/health
```

## 🎵 **Step 6: Test Direct Scraper**
```bash
# Test if the Python scraper works directly
cd /root/arti-marketing-ops/spotify_scraper
source venv/bin/activate
python -c "import playwright; print('Playwright OK')"
python setup_test.py
```

## 📋 **What to Look For:**
- **API logs**: Should show routes being registered or errors loading scraper
- **Container paths**: Should find scraper.js file in the container
- **Git status**: Should be up to date
- **Build errors**: Should complete without errors
- **Direct scraper**: Should work without issues

Run these commands step by step and let me know what you find!
