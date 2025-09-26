# Start API Container with Correct Network

## 🚀 **Use the correct network name:**

```bash
# 1. Start the API container with the correct network
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_network_arti-marketing-ops \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder

# 2. Verify the container started
docker ps | grep supabase_api

# 3. Check container logs
docker logs supabase_api_arti-marketing-ops --tail 10

# 4. Verify spotify.js exists
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 5. Test the API health endpoint
curl http://localhost:3002/healthz

# 6. Test Spotify routes (might need auth token)
curl http://localhost:3002/providers/spotify/health
```

## 🎯 **Network name was:** `supabase_network_arti-marketing-ops`

**Run the corrected command!** 🚀
