# Direct Restart Commands

## 🚀 **Direct commands to restart services:**

```bash
# Make sure you're in the project directory
cd ~/arti-marketing-ops

# 1. Stop the current container
docker stop supabase_api_arti-marketing-ops

# 2. Remove the old container
docker rm supabase_api_arti-marketing-ops

# 3. Rebuild with fresh image (use our debug-builder or rebuild)
docker tag debug-builder arti-marketing-ops-api

# 4. Start Supabase services
docker compose -f docker-compose.yml up -d

# 5. Verify spotify.js exists in the new container
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 6. Check container logs
docker logs supabase_api_arti-marketing-ops --tail 20

# 7. Test health endpoint
curl http://localhost:3002/healthz
```

## 🎯 **Alternative if docker-compose issues:**

```bash
# If docker-compose doesn't work, manually restart just the API:
docker run -d --name supabase_api_arti-marketing-ops \
  --network supabase_default \
  -p 3002:3001 \
  -e NODE_ENV=production \
  arti-marketing-ops-api

# Then check if it works
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js
```

**Run these direct commands!** 🚀
