# Add Missing Environment Variables

## 🔧 **The app needs Supabase connection details:**

```bash
# 1. Stop and remove the current container
docker stop supabase_api_arti-marketing-ops
docker rm supabase_api_arti-marketing-ops

# 2. Start with all required environment variables
docker run -d \
  --name supabase_api_arti-marketing-ops \
  --network supabase_network_arti-marketing-ops \
  -p 3002:3001 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=http://supabase_kong_arti-marketing-ops:8000 \
  -e SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0 \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
  -e DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@supabase_db_arti-marketing-ops:5432/postgres \
  -e REDIS_URL=redis://supabase_redis_arti-marketing-ops:6379 \
  debug-builder \
  node dist/index.js

# 3. Check if it starts properly now
docker ps | grep supabase_api

# 4. Check logs
docker logs supabase_api_arti-marketing-ops --tail 10

# 5. Test health endpoint
curl http://localhost:3002/healthz

# 6. Test Spotify routes
curl http://localhost:3002/providers/spotify/health
```

## 🎯 **Added all required environment variables!**

**Run these commands to start with proper config!** 🚀
