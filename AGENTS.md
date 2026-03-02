# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ARTi Marketing Ops is a Spotify playlist campaign management platform. It's a monorepo with:
- **Frontend** (`apps/frontend/`): Next.js 14 dashboard (port 3000)
- **Backend API** (`apps/api/`): Fastify server (port 3001)
- **Database**: Self-hosted Supabase (PostgreSQL + Auth + Studio)
- **Redis**: BullMQ job queues (port 6379)

### Starting services

All services require Docker to be running first:

```bash
# 1. Start Docker daemon (if not already running)
sudo dockerd &>/tmp/dockerd.log &

# 2. Start Supabase (Postgres, Auth, Studio, Kong, etc.)
cd /workspace && npx supabase start

# 3. Start Redis with host port mapping
docker run -d --name supabase_redis_arti-marketing-ops \
  --network supabase_network_arti-marketing-ops \
  -p 6379:6379 redis:7-alpine redis-server --appendonly yes

# 4. Start API (dev mode)
cd /workspace/apps/api && npm run dev

# 5. Start Frontend (dev mode)
cd /workspace/apps/frontend && pnpm dev
```

### Important caveats

- **Do NOT run `pnpm build` while the dev server is running.** It corrupts the `.next` directory and causes 404s for all static assets (CSS/JS). If this happens, stop the dev server, run `rm -rf .next`, then restart.
- The API package manager is **npm** (`apps/api/package-lock.json`). The frontend uses **pnpm** (`apps/frontend/pnpm-lock.yaml`).
- Redis is optional for the API to start (it logs a warning and continues without it), but required for BullMQ background jobs.
- The API requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars or it will crash on startup. Dev `.env` files with local Supabase keys must exist at `apps/api/.env` and `apps/frontend/.env.local`.
- Local Supabase keys (anon/service_role) are the standard demo keys hardcoded in `docker-compose.supabase-project.yml`.
- Several Supabase migrations have known bugs (duplicate version prefixes, type mismatches, missing table references). They have been renamed with unique sequential prefixes (0001-0104) and 16 broken migrations are disabled (`.sql.disabled`).
- The `@tailwindcss/oxide` package requires build scripts to run. The frontend `package.json` includes `pnpm.onlyBuiltDependencies` to allow this non-interactively.

### Lint and test commands

- **Frontend lint**: `cd apps/frontend && pnpm lint` (uses `next lint` with ESLint 8)
- **API lint**: `cd apps/api && npm run lint`
- **API tests**: `cd apps/api && npm test` (vitest; no test files exist yet)
- **API build**: `cd apps/api && npm run build` (TypeScript compilation; has non-blocking type errors)
- **Frontend build**: `cd apps/frontend && pnpm build`

### Test user for local development

Create via Supabase Admin API after `npx supabase start`:
```bash
curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@arti-demo.com","password":"ArtistInfluence2025!","email_confirm":true,"user_metadata":{"role":"admin","name":"Demo Admin","org_id":"00000000-0000-0000-0000-000000000001"}}'
```

### Service URLs (local dev)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| API Health | http://localhost:3001/health |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Redis | redis://127.0.0.1:6379 |
| Mailpit (email) | http://127.0.0.1:54324 |
