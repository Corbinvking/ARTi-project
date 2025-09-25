# Quick Diagnostic Commands

## 🔍 **Run these on the droplet to diagnose:**

```bash
# 1. Check if the basic provider route works
curl http://localhost:3002/api/providers/health

# 2. Check API startup logs for any import errors
docker logs supabase_api_arti-marketing-ops --tail 100 | grep -A5 -B5 -i error

# 3. Check if the spotify module compiled correctly  
docker exec supabase_api_arti-marketing-ops ls -la /app/dist/routes/providers/
docker exec supabase_api_arti-marketing-ops cat /app/dist/routes/providers/spotify.js | head -20

# 4. Check if the main providers.js imports spotify correctly
docker exec supabase_api_arti-marketing-ops cat /app/dist/routes/providers.js | head -10

# 5. Test if we can manually check fastify routes
docker exec supabase_api_arti-marketing-ops node -e "console.log('Testing module import...'); try { require('/app/dist/routes/providers/spotify.js'); console.log('Spotify module imported successfully'); } catch(e) { console.error('Import failed:', e.message); }"
```

## 🎯 **What These Will Tell Us:**
- If basic provider routes work (import issue vs registration issue)
- If there are startup errors we missed
- If the spotify module compiled and exists
- If the import statement in providers.js is correct
- If the spotify module can be imported manually

**Run these to narrow down where the problem is!** 🔧
