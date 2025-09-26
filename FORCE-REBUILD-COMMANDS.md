# Force Fresh Build (No Cache)

## 🚀 **Commands to force rebuild without cache:**

```bash
# 1. Force rebuild without using Docker cache
docker build --no-cache -t arti-marketing-ops-api apps/api/

# 2. Restart the container
docker restart supabase_api_arti-marketing-ops

# 3. Verify spotify.js was created
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 4. Check all routes in the container
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/
```

## 🎯 **Why this is needed:**
The previous build used cached layers from before `spotify.ts` existed. The `--no-cache` flag forces Docker to rebuild everything fresh, including copying the new `spotify.ts` file and recompiling it.

**Run the `--no-cache` build command!** 🚀
