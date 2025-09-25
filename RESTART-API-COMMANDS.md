# Restart API and Test Scraper Commands

## 🔄 **Step 1: Restart API Container**
```bash
cd /root/arti-marketing-ops
docker restart supabase_api_arti-marketing-ops

# Wait for it to restart
sleep 10

# Check container status
docker ps | grep api
```

## 🧪 **Step 2: Test Scraper Endpoints**
```bash
# Test scraper health endpoint
curl http://localhost:3002/api/providers/spotify/health

# Test scraper job creation
curl -X POST http://localhost:3002/api/providers/spotify/scrape \
  -H "Content-Type: application/json" \
  -d '{"songUrls": ["https://artists.spotify.com/c/artist/test"]}'

# Test scraper job list
curl http://localhost:3002/api/providers/spotify/scrape
```

## 🔍 **Step 3: Test Manual Scraper Run**
```bash
cd /root/arti-marketing-ops/spotify_scraper

# Activate virtual environment
source venv/bin/activate

# Test scraper directly
python run_scraper.py --help

# Run a quick test
python setup_test.py
```

## 📋 **Step 4: Check API Logs**
```bash
# If endpoints still don't work, check API logs
docker logs supabase_api_arti-marketing-ops --tail 50
```

## ✅ **Expected Results:**
- `/api/providers/spotify/health` should return scraper status
- `/api/providers/spotify/scrape` (POST) should accept job requests
- Manual scraper test should work

Copy these commands and run them on your droplet!
