# Rebuild Container and Test

## 🚀 **Next commands to run on the droplet:**

```bash
# 1. Rebuild the API container with spotify.ts
docker build -t arti-marketing-ops-api apps/api/

# 2. Restart the container
docker restart supabase_api_arti-marketing-ops

# 3. Verify spotify.js was created
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 4. Check all compiled routes
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/ | grep -E "(spotify|providers)"

# 5. Test the API routes
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3002/providers/spotify/health

# 6. Check container logs for any startup errors
docker logs supabase_api_arti-marketing-ops --tail 20
```

**Run these commands to complete the Spotify scraper integration!** 🎯
