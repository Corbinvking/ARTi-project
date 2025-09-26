# Simple API Container Restart

## 🚀 **Simplified approach - just restart the API container:**

```bash
# 1. Check what's currently running
docker ps | grep supabase

# 2. Stop and remove the API container
docker stop supabase_api_arti-marketing-ops
docker rm supabase_api_arti-marketing-ops

# 3. Find the network that Supabase is using
docker network ls | grep supabase

# 4. Start the API container with fresh image (use the debug-builder we know works)
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_default \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder

# 5. Verify spotify.js exists
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 6. Check if container is healthy
docker logs supabase_api_arti-marketing-ops --tail 10

# 7. Test the API
curl http://localhost:3002/healthz
```

## 🎯 **We're using `debug-builder` image because we KNOW it has spotify.js!**

**Run these commands!** 🚀
