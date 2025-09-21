# ARTi Marketing Ops SaaS Platform

A comprehensive multi-tenant marketing operations platform with AI-powered insights and automated workflows.

## Architecture

- **Frontend**: Next.js 14 (Vercel) - Multi-tenant UI with role-based access
- **Backend API**: Node.js + Fastify (DigitalOcean) - JWT validation & data processing  
- **Database**: Supabase Postgres with RLS - Org-scoped data isolation
- **Queue/Jobs**: Redis + BullMQ - Background processing & cron jobs
- **Automation**: n8n - Event-driven Slack/email notifications
- **Infrastructure**: Caddy - TLS termination & reverse proxy

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Supabase CLI
- GitHub CLI (for deployment)

### Development Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/[username]/arti-marketing-ops.git
cd arti-marketing-ops
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env.local
# Fill in your Supabase, Redis, and API keys
```

3. **Start development servers:**
```bash
# Frontend (localhost:3000)
cd apps/frontend && npm run dev

# API (localhost:3001) 
cd apps/api && npm run dev

# Infrastructure (Redis, n8n)
docker-compose up -d
```

## Deployment

### Production Infrastructure
- **Frontend**: Vercel (automatic deployments from main branch)
- **Backend**: DigitalOcean Droplet with Docker Compose
- **DNS**: Managed via DigitalOcean (api.domain.com, n8n.domain.com)

### Deploy to Production
```bash
# Build and push API image
npm run build:api
npm run deploy:api

# Frontend auto-deploys via Vercel on git push
git push origin main
```

## Security & Compliance

- **Multi-tenant isolation**: Row Level Security (RLS) enforced on every table
- **Authentication**: Supabase Auth with org-scoped JWT claims
- **API Security**: JWT validation, CORS restrictions, rate limiting
- **Data Encryption**: Provider tokens encrypted at rest
- **HTTPS**: Enforced everywhere with HSTS headers

## Project Status

**Day 1**: ✅ Foundation - Auth, RLS, basic API, infrastructure  
**Day 2**: 🔄 Airtable ETL + Spotify integration  
**Day 3**: ⏳ AI insights + automation workflows  
**Day 4**: ⏳ Hardening + production cutover  

---

## Development

### Repository Structure
```
arti-marketing-ops/
├── apps/
│   ├── frontend/          # Next.js app (Vercel)
│   └── api/              # Node.js API (DigitalOcean)
├── packages/
│   └── shared/           # Shared types/utilities
├── .github/
│   └── workflows/        # CI/CD pipelines
└── docker-compose.yml    # Infrastructure services
```

### Available Scripts
- `npm run dev` - Start all development servers
- `npm run build` - Build all applications
- `npm run test` - Run test suites
- `npm run lint` - Code quality checks
- `npm run deploy` - Deploy to production

### Health Checks
- API: `curl https://api.domain.com/healthz`
- Frontend: `curl https://app.domain.com`
- n8n: `curl https://n8n.domain.com/healthz`

---

For detailed setup instructions, see individual app README files.
