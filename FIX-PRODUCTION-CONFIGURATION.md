# Fix Production Configuration

## 🚀 **Commands to fix the production setup permanently:**

```bash
# 1. Stop all current containers
cd ~/arti-marketing-ops
docker stop $(docker ps -q)
docker rm supabase_api_arti-marketing-ops 7f003ddec502

# 2. Create the missing .env file for the API
cat > apps/api/.env << 'EOF'
# ARTi API Production Environment Configuration

# Basic Configuration
PORT=3001
NODE_ENV=production

# Domain Configuration
FRONTEND_URL=https://app.artistinfluence.com
PRODUCTION_DOMAIN=https://api.artistinfluence.com
CORS_ORIGIN=https://app.artistinfluence.com

# Self-Hosted Supabase Configuration (using Docker network names)
SUPABASE_URL=http://arti-kong-prod:8000
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Database Configuration (direct connection)
DATABASE_URL=postgresql://postgres:MySecurePass123!@arti-postgres-prod:5432/postgres

# Redis Configuration
REDIS_URL=redis://arti-redis-prod:6379

# Security
JWT_SECRET=@+pq>3NccTdu2%{d0JnQQTOd)12g_Gw

# API Keys (optional for now)
SPOTIFY_CLIENT_ID=your-spotify-client-id-when-ready
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret-when-ready
SPOTIFY_REDIRECT_URI=https://app.artistinfluence.com/auth/callback
OPENAI_API_KEY=sk-your-openai-api-key-when-ready

# n8n Integration
N8N_WEBHOOK_URL=https://link.artistinfluence.com/webhook
EOF

# 3. Start everything with the production docker-compose
docker compose -f docker-compose.production.yml up -d --build

# 4. Check that all services are running
docker ps

# 5. Verify the API container has spotify.js
docker exec arti-api-prod ls -la /app/dist/routes/spotify.js

# 6. Test the API endpoints
curl http://localhost:3001/healthz
curl http://localhost:3001/providers/spotify/health

# 7. Check logs if anything fails
docker logs arti-api-prod --tail 20
```

## 🎯 **This will:**
1. ✅ Create proper `.env` file with all required variables
2. ✅ Use production docker-compose with correct service names  
3. ✅ Build fresh API image with spotify.js
4. ✅ Start everything on the proper network
5. ✅ Test that Spotify routes work

**Run these commands to fix the production configuration permanently!** 🚀
