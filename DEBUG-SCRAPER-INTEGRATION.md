# Debug Scraper Integration Commands

## 🔍 **Step 1: Check API Logs**
```bash
cd /root/arti-marketing-ops
docker logs supabase_api_arti-marketing-ops --tail 30
```

## 🔍 **Step 2: Check if Scraper Routes are in Code**
```bash
# Check if the scraper routes exist in the backend
cd /root/arti-marketing-ops
grep -r "spotify/health" apps/api/src/
grep -r "SpotifyScraperService" apps/api/src/
```

## 🔍 **Step 3: Check Environment Variables**
```bash
# Check if scraper environment variables are set
docker exec supabase_api_arti-marketing-ops env | grep -i spotify
docker exec supabase_api_arti-marketing-ops env | grep -i scraper
```

## 🔧 **Step 4: Pull Latest Code**
```bash
cd /root/arti-marketing-ops

# Check git status
git status

# Pull latest changes if needed
git pull origin main

# Rebuild and restart if code was updated
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build api
docker restart supabase_api_arti-marketing-ops
```

## 🧪 **Step 5: Test Available Routes**
```bash
# Check what routes are actually available
curl http://localhost:3002/api/providers/
curl http://localhost:3002/api/providers
```

## 📋 **What to Look For:**
- **API logs**: Should show scraper routes being registered
- **Code search**: Should find scraper files in the backend
- **Environment**: Should have scraper path variables
- **Git status**: Should be up to date with latest code

Run these commands and let me know what you find!
