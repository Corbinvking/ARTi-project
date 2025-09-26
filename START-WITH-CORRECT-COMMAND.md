# Start Container with Correct Command

## 🚀 **Start with the correct startup command:**

```bash
# 1. Remove the failed container first
docker rm 526ca7a26f9c

# 2. Start with the correct command
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_network_arti-marketing-ops \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder \
  node dist/index.js

# 3. Check if it's running
docker ps | grep supabase_api

# 4. Check startup logs
docker logs supabase_api_arti-marketing-ops --tail 15

# 5. Test if it's responding
curl http://localhost:3002/healthz

# 6. Verify spotify.js exists and routes work
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 7. Test Spotify routes
curl http://localhost:3002/providers/spotify/health
```

## 🎯 **The correct startup command is:** `node dist/index.js`

**Run these commands to finally get the API working!** 🚀
