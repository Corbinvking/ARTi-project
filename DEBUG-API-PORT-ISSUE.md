# Debug API Port Issue

## 🔍 **API container started but not responding on port 3001:**

```bash
# 1. Check if API container is actually running and healthy
docker ps | grep arti-api-prod

# 2. Check API container logs for startup errors
docker logs arti-api-prod --tail 20

# 3. Check what port the API is actually running on inside container
docker exec arti-api-prod netstat -tlnp | grep LISTEN

# 4. Check if the port mapping is correct
docker port arti-api-prod

# 5. Test health endpoint inside the container (bypass port mapping)
docker exec arti-api-prod curl http://localhost:3001/healthz

# 6. Check environment variables in the container
docker exec arti-api-prod env | grep -E "(PORT|NODE_ENV|SUPABASE)"

# 7. If API is running on different port, test that
curl http://localhost:3002/healthz  # In case it's on 3002 via Caddy

# 8. Check if .env file was created properly
docker exec arti-api-prod cat /app/.env | head -10
```

## 🎯 **Possible issues:**
- ❌ API failed to start due to missing env vars
- ❌ API running on wrong port
- ❌ Port mapping issue in docker-compose
- ❌ .env file not created properly

**Run these debug commands!** 🔍
