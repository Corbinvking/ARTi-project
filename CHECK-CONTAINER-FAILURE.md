# Check Why Container Failed

## 🔍 **Debug why the container stopped:**

```bash
# 1. Check all containers (including stopped ones)
docker ps -a | grep supabase_api

# 2. Check the logs to see why it failed
docker logs 526ca7a26f9c

# 3. Check if there are environment variable issues
docker inspect 526ca7a26f9c | grep -A 20 "Env"

# 4. Try running it interactively to see the error
docker run --rm -it \
  --network supabase_network_arti-marketing-ops \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder

# 5. If that fails, try without network restrictions
docker run --rm -it \
  -p 3002:3001 \
  -e NODE_ENV=production \
  debug-builder
```

## 🎯 **The container started but immediately crashed.**

**Run these debug commands to see what's failing!** 🔍
