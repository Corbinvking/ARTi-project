# Pull Changes and Rebuild Container

## 🚀 **Commands to run on the droplet:**

```bash
# 1. Navigate to project directory
cd ~/arti-marketing-ops

# 2. Pull the latest changes from git
git pull origin main

# 3. Verify spotify.ts is now present
ls -la apps/api/src/routes/spotify.ts

# 4. Rebuild the API container
docker build -t arti-marketing-ops-api apps/api/

# 5. Restart the container
docker restart supabase_api_arti-marketing-ops

# 6. Verify spotify.js was created
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/spotify.js

# 7. Check if the routes are working
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/ | grep spotify
```

## 🎯 **Expected Result:**
After these commands, you should see:
- `spotify.ts` exists in source
- `spotify.js` exists in compiled output
- Container restarts successfully

**Run these commands in order on your droplet!** 🚀
