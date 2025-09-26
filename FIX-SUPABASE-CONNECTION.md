# Fix Supabase Connection Issues

## 🔧 **The API can't connect to Kong because some services are still starting:**

```bash
# 1. Wait for all services to be healthy (give it 2-3 minutes)
watch docker ps

# 2. Check which services are unhealthy
docker ps --filter "status=restarting"

# 3. Check Kong logs specifically (it's the gateway the API connects to)
docker logs arti-kong-prod --tail 20

# 4. Check if Kong needs the auth service to be ready first
docker logs arti-auth-prod --tail 10

# 5. If services keep restarting, restart in dependency order:
docker compose -f docker-compose.production.yml restart postgres
sleep 10
docker compose -f docker-compose.production.yml restart auth
sleep 10  
docker compose -f docker-compose.production.yml restart rest
sleep 10
docker compose -f docker-compose.production.yml restart kong
sleep 10
docker compose -f docker-compose.production.yml restart api

# 6. Check API logs after restart
docker logs arti-api-prod --tail 10

# 7. Test connection once Kong is healthy
curl http://localhost:3001/healthz
```

## 🎯 **The issue:** API is trying to connect to Kong before Kong is ready.

**Wait for services to stabilize, then test!** ⏰
