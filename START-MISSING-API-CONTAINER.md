# Start Missing API Container

## 🎯 **The API container isn't running! Let's start it:**

```bash
# 1. Check what network Supabase is using
docker network ls | grep supabase

# 2. Start the API container with our working debug-builder image
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_default \
  -p 3002:3001 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=http://supabase_kong_arti-marketing-ops:8000 \
  -e SUPABASE_ANON_KEY=your_anon_key \
  debug-builder

# 3. Verify the container started
docker ps | grep supabase_api

# 4. Check container logs
docker logs supabase_api_arti-marketing-ops --tail 10

# 5. Verify spotify.js exists
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 6. Test the API
curl http://localhost:3002/healthz

# 7. Test Spotify routes
curl http://localhost:3002/providers/spotify/health
```

## 🚨 **Root Cause Found:**
The API container was never running! That's why we couldn't find the spotify routes - the entire custom API was down.

**Run these commands to start the missing API container!** 🚀
