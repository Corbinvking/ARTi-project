# Fix Container Startup

## 🔍 **The issue: debug-builder doesn't have the right startup command**

```bash
# 1. Check what the Dockerfile CMD should be
cat apps/api/Dockerfile | grep -A 3 -B 3 CMD

# 2. Check package.json for the start script
docker run --rm debug-builder cat /app/package.json | grep -A 5 -B 5 "scripts"

# 3. Start the container with the correct command
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_network_arti-marketing-ops \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder \
  npm start

# 4. Alternative: start with node directly
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_network_arti-marketing-ops \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder \
  node dist/index.js

# 5. Check if it's running now
docker ps | grep supabase_api

# 6. Check logs
docker logs supabase_api_arti-marketing-ops --tail 10
```

## 🎯 **Need to specify the startup command explicitly!**

**Run these commands to start with the right command!** 🚀
