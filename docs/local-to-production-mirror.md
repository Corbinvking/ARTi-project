# Local to Production Development Workflow

**Complete documentation of our unified local-to-production development workflow where local development uses production data directly for a seamless, single-source-of-truth approach.**

---

## 📌 **Quick Start (TL;DR)**

### **The New Way (Current)**
```bash
# 1. Ensure .env.local points to production
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com

# 2. Start development
npm run dev

# 3. Login with production credentials
# That's it! All 653 campaigns available instantly.
```

### **⚠️ CRITICAL: You're Working on LIVE Production Data!**
```
Local Dev → Production Database (IMMEDIATELY)
          ↓
   Any change you make = Production change
   
   ✅ Frontend code → git push → Vercel deploys
   ⚠️ Database changes → INSTANT production impact
   ❌ NO staging environment
   ❌ NO "deploy to production" for data
```

**Safety Guidelines:**
- 🔒 Use SQL transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) for risky changes
- 💾 Create backups before major database modifications
- 🧪 Test with temporary tables when possible
- 🚨 Be extra careful with `UPDATE`, `DELETE`, `DROP` commands

### **What Changed?**
- ❌ **OLD**: Local Supabase → Export → Upload → Import → Production
- ✅ **NEW**: One production database for everything

### **Key Benefits**
- 🚀 **Zero setup time** - No data import needed
- 💾 **One database** - Production is the single source of truth  
- ⚡ **Instant access** - All 653 campaigns available immediately
- 🔄 **Real-time sync** - Changes visible everywhere instantly
- 🎯 **No data drift** - Impossible by design
- ⚡ **Simple deployment** - Just `git push` for frontend changes

---

## 🏗️ **Architecture Overview**

### **NEW: Unified Database Architecture (Current)**
Our current workflow uses **ONE database** - the production database - for both local development and production:

```
Local Frontend (localhost:3000)
    ↓ HTTPS API calls
Production Supabase (api.artistinfluence.com)
    ↓ PostgreSQL
Production Database (Single Source of Truth)
    ↑ HTTPS API calls
Production Frontend (app.artistinfluence.com)
```

**Benefits:**
- ✅ No data synchronization needed
- ✅ Instant access to all 653 campaigns
- ✅ Real-time collaboration (changes visible immediately)
- ✅ Same users, same data, everywhere
- ✅ Simplified workflow (no export/import steps)

### **Local Development Environment (Windows)**
- **Frontend**: Next.js development server (`localhost:3000`)
- **Database**: Production Supabase (`https://api.artistinfluence.com`)
- **Data**: Live production data (653 campaigns, 228 clients)
- **Auth**: Production users (admin, vendors, salespersons)
- **Hot Reload**: Instant code changes with production data

### **Production Environment (DigitalOcean + Vercel)**
- **Frontend**: Vercel deployment (`https://app.artistinfluence.com`)
- **Backend**: DigitalOcean droplet (`https://api.artistinfluence.com`)
- **Database**: Self-hosted Supabase stack (Single source of truth)
- **Domain Routing**: Caddy reverse proxy with SSL

### **Legacy: Local Supabase (Optional, Not Currently Used)**
- **Status**: Running but not actively used
- **Database**: Empty or outdated
- **Purpose**: Available for isolated testing if needed
- **Services**: Auth, Storage, Realtime, Studio (`localhost:54323`)

---

## 🔄 **The New Simplified Workflow**

### **Phase 1: Local Development (NEW)**

#### **1.1 Configure Environment**
Your `.env.local` and `apps/frontend/.env.local` should point to **production**:

```env
# Production Supabase Configuration (Single Source of Truth)
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

#### **1.2 Start Development Server**
```bash
# From project root
npm run dev

# Available at http://localhost:3000
# Connected to production database at https://api.artistinfluence.com
```

**That's it!** No separate Supabase start, no data import, no synchronization.

#### **1.3 Login with Production Credentials**
- Use your production admin credentials
- All users (admin, vendors, salespersons) are available
- Example: `admin@yourdomain.com` (your actual production email)

#### **1.4 Develop with Live Data**
- All 653 campaigns instantly available
- All 228 clients accessible
- Vendor portal with real vendor data
- Changes you make are immediately reflected in production (be careful!)

**Result**: Full development environment with instant production data access and hot-reload.

---

### **Phase 2: Code Synchronization**

#### **2.1 Git-Based Deployment Pipeline**

**Local → Git → Production:**
```bash
# 1. Commit local changes
git add .
git commit -m "Feature: Add new functionality"
git push origin main

# 2. Automatic deployments triggered:
#    - Vercel: Rebuilds frontend automatically
#    - DigitalOcean: Manual pull required (can be automated)
```

#### **2.2 Frontend Deployment (Automatic)**
- **Trigger**: Git push to `main` branch
- **Platform**: Vercel
- **Build**: `apps/frontend` directory
- **Result**: Live at `https://app.artistinfluence.com`
- **Configuration**: 
  - Root Directory: `apps/frontend`
  - Build Command: `npm run build`
  - Install Command: `npm install`

#### **2.3 Backend Deployment (Manual Pull)**
```bash
# SSH to production droplet
ssh root@164.90.129.146

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest changes
git pull origin main

# Restart services if needed
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart
```

---

### **Phase 3: Data Management (NEW)**

#### **3.1 No Data Synchronization Required! 🎉**

Since we use **one production database** for everything, there's no need for:
- ❌ Export scripts
- ❌ CSV file generation
- ❌ SCP uploads
- ❌ Import processes
- ❌ Data synchronization

**All changes are instant and automatic!**

#### **3.2 Data Backup (Recommended)**

For safety, create regular backups of production data:

```bash
# On production droplet
ssh root@164.90.129.146

# Backup PostgreSQL database
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql

# Or use Supabase backup tools
supabase db dump --db-url "$DATABASE_URL" -f backup.sql
```

#### **3.3 Testing Workflow**

**For Safe Testing of Risky Changes:**

If you need to test something potentially destructive:

1. **Option A: Use a staging table**
   ```sql
   -- Create test table
   CREATE TABLE test_campaigns AS SELECT * FROM spotify_campaigns LIMIT 10;
   ```

2. **Option B: Use transaction rollback**
   ```sql
   BEGIN;
   -- Make changes
   UPDATE spotify_campaigns SET status = 'test' WHERE id = 123;
   -- Test it
   -- If something goes wrong:
   ROLLBACK;
   -- If everything works:
   COMMIT;
   ```

3. **Option C: Create a full backup first**
   ```bash
   # Backup before major changes
   docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > pre-change-backup.sql
   ```

---

## 🛠️ **Technical Implementation Details**

### **Frontend Configuration**

#### **Local Environment (apps/frontend/.env.local) - NEW**
```env
# Points to PRODUCTION Supabase (Single Source of Truth)
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**Key Change:** Local dev now uses the SAME configuration as production!

#### **Production Environment (Vercel) - SAME AS LOCAL**
```env
# Same exact configuration
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

#### **Legacy Local Supabase (Not Used)**
```env
# Old configuration (now obsolete)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_[local_key]
```

#### **Vercel Configuration (vercel.json)**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd apps/frontend && npm run build",
  "outputDirectory": "apps/frontend/.next",
  "installCommand": "cd apps/frontend && npm install"
}
```

### **Backend Configuration**

#### **Production Environment (production.env)**
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://app.artistinfluence.com
PRODUCTION_DOMAIN=https://api.artistinfluence.com
CORS_ORIGIN=https://app.artistinfluence.com
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
POSTGRES_PASSWORD=your-secure-postgres-password
POSTGRES_DB=postgres
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret-key
```

#### **Docker Services (docker-compose.supabase-project.yml)**
```yaml
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_HOST=link.artistinfluence.com
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://link.artistinfluence.com
      
  api:
    build: ./apps/api
    environment:
      - NODE_ENV=production
    ports:
      - "3002:3001"
      
  caddy:
    image: caddy:2.7.6-alpine
    network_mode: host
    volumes:
      - ./caddy/Caddyfile.production:/etc/caddy/Caddyfile
```

### **Domain Routing (Caddy)**

#### **Production Routing (caddy/Caddyfile.production)**
```caddyfile
{
    admin off
    auto_https on
}

# Frontend - Vercel hosted
app.artistinfluence.com {
    # Handled by Vercel DNS
}

# Backend API
api.artistinfluence.com {
    reverse_proxy localhost:3002
    
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
}

# Supabase Studio
db.artistinfluence.com {
    reverse_proxy localhost:54323
}

# n8n Automation
link.artistinfluence.com {
    reverse_proxy localhost:5678
}
```

---

## 📊 **Data Flow Architecture (NEW)**

### **Unified Data Flow (Current)**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Local Development (localhost:3000)                    │
│  ↓ HTTPS API calls                                     │
│                                                         │
│  Production Supabase (api.artistinfluence.com)         │
│  ↓ PostgreSQL                                          │
│                                                         │
│  Production Database (Single Source of Truth)          │
│  • 653 Spotify campaigns                               │
│  • 228 clients                                         │
│  • All vendor users                                    │
│  • Real production data                                │
│  ↑ HTTPS API calls                                     │
│                                                         │
│  Production Frontend (app.artistinfluence.com)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**
- ✅ **One database** serves both environments
- ✅ **Same API endpoint** for local and production
- ✅ **Real-time sync** (changes are instant everywhere)
- ✅ **No data drift** between environments

### **Legacy: Old Data Flow (Deprecated)**
```
❌ Local Database 
    ↓ export-local-data.js
❌ CSV Files (data-exports/)
    ↓ SCP upload
❌ Production Droplet
    ↓ import-csv-data.js
✅ Production Database (Now the ONLY database)
```

**Why we changed:** The old workflow required constant synchronization and led to data inconsistencies. The new unified approach is simpler, faster, and more reliable.

---

## 🚀 **Key Scripts and Automation**

### **Data Export Script (scripts/export-local-data.js)**
- **Purpose**: Export all local Supabase data to CSV/JSON
- **Output**: Individual CSV files + complete JSON backup
- **Features**: Handles auth users, campaign data, permissions
- **Usage**: `node scripts/export-local-data.js`

### **Data Import Script (scripts/import-csv-data.js)**
- **Purpose**: Import CSV data into production Supabase
- **Features**: Batch processing, error handling, progress reporting
- **Safety**: Creates backups, handles duplicates gracefully
- **Usage**: `node scripts/import-csv-data.js`

### **Migration Scripts**
- **direct-db-migration.js**: Create test users and sample data
- **complete-production-migration.js**: Full local → production migration
- **assess-local-data.js**: Analyze local data before migration

### **Deployment Scripts**
- **start-platform-production.sh**: Start production Supabase + Docker services
- **stop-platform-production.sh**: Gracefully stop all services
- **quick-deploy.sh**: Automated deployment script

---

## 🔐 **Security and Access Control**

### **Authentication Flow**
1. **Local Development**: Uses local Supabase auth
2. **Production**: Uses production Supabase auth with real user accounts
3. **Data Sync**: Preserves user roles and permissions during migration

### **API Security**
- **CORS**: Configured for specific domains
- **Headers**: Security headers via Caddy
- **SSL**: Automatic Let's Encrypt certificates
- **Environment Variables**: Separated local/production configs

### **Database Security**
- **Service Role Keys**: Different for local/production
- **Network Isolation**: Docker networking + host networking for Caddy
- **Backups**: Automated via export scripts

---

## 📋 **Operational Procedures**

### **Daily Development Workflow (NEW - Simplified)**

1. **Start Local Development**
   ```bash
   # That's it! Just one command:
   npm run dev
   
   # Opens at http://localhost:3000
   # Already connected to production database
   ```

2. **Login with Production Credentials**
   - Use your actual production email/password
   - All production users available (admin, vendors, salespersons)
   - See all 653 campaigns immediately

3. **Develop Features**
   - Frontend changes in `apps/frontend/`
   - Hot-reload shows changes instantly
   - Test with real production data
   - ⚠️ **IMPORTANT:** Database changes are IMMEDIATE in production!

4. **Test Your Changes**
   - Full-stack testing with real data
   - Role-based access testing (vendor portal, admin, etc.)
   - All 653 campaigns, 228 clients available
   - **Tip:** Use transactions for safe testing (see Phase 3.3)

5. **Deploy to Production**

   ### **For Frontend Changes (99% of your work):**
   ```bash
   git add .
   git commit -m "Feature: Your description"
   git push origin main
   
   # ✅ Frontend deploys automatically via Vercel
   # ✅ Database is already updated (you were working on production!)
   # ✅ NO backend pull needed
   ```
   
   ### **For Backend API Changes (Rare):**
   ```bash
   # 1. Push your changes
   git push origin main
   
   # 2. SSH to production droplet
   ssh root@164.90.129.146
   
   # 3. Pull and restart
   cd /root/arti-marketing-ops
   git pull origin main
   docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart api
   ```

### **Understanding Database Changes ⚠️**

**CRITICAL: Your local environment makes LIVE PRODUCTION changes!**

Since your local dev connects directly to the production database:

✅ **What happens automatically:**
- Any database query you run → affects production immediately
- Supabase Studio changes → affect production immediately  
- Migration scripts → affect production immediately
- Data imports/updates → affect production immediately

❌ **What does NOT happen:**
- There is NO staging database
- There is NO "push to production" step for data
- Changes are NOT reversible without backups

**Best Practices for Database Changes:**

1. **Use Transactions for Safety**
   ```sql
   BEGIN;
   -- Make your changes
   UPDATE spotify_campaigns SET status = 'test' WHERE id = 123;
   -- Verify the change
   SELECT * FROM spotify_campaigns WHERE id = 123;
   -- If everything looks good:
   COMMIT;
   -- If something is wrong:
   ROLLBACK;
   ```

2. **Create Backups Before Major Changes**
   ```bash
   # On production droplet
   ssh root@164.90.129.146
   docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > pre-change-backup.sql
   ```

3. **Test with Temporary Tables**
   ```sql
   -- Create test table
   CREATE TABLE test_campaigns AS SELECT * FROM spotify_campaigns LIMIT 10;
   -- Test your changes on test_campaigns first
   -- Then apply to real table when confident
   ```

### **Quick Reference: What Requires Backend Pull?**

| Change Type | Git Push | Backend Pull | Notes |
|------------|----------|--------------|-------|
| Frontend code (React/Next.js) | ✅ Yes | ❌ No | Vercel auto-deploys |
| Database schema/data | ❌ N/A | ❌ No | Changes are immediate in production |
| Backend API code (`apps/api/`) | ✅ Yes | ✅ Yes | Requires SSH + restart |
| Docker configs | ✅ Yes | ✅ Yes | Requires SSH + restart |
| Supabase migrations | ✅ Yes | ⚠️ Maybe | Run on droplet if file-based |
| Environment variables | ❌ No | ✅ Yes | Update directly on Vercel/Droplet |

### **Data Migration Workflow (NEW - Not Needed!)**

**You don't need data migration anymore!** 🎉

Since local and production use the same database:
- ❌ No export needed
- ❌ No upload needed  
- ❌ No import needed
- ❌ No verification needed
- ✅ Everything is always in sync!

### **When You Still Need Backups**
```bash
# Regular backups (recommended weekly)
ssh root@164.90.129.146
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql

# Download backup to local
scp root@164.90.129.146:~/backup-*.sql ./backups/
```

### **Production Maintenance**
1. **Monitor Services**
   ```bash
   docker ps  # Check service health
   supabase status  # Check Supabase components
   ```

2. **Update Code**
   ```bash
   git pull origin main
   docker-compose restart  # If needed
   ```

3. **Backup Data**
   ```bash
   node scripts/export-local-data.js  # Regular exports
   ```

---

## 🎯 **Success Metrics (NEW)**

### **Development Efficiency - MASSIVELY IMPROVED**
- ✅ **Instant access to all 653 campaigns** - No import wait
- ✅ **Real-time collaboration** - Changes visible immediately
- ✅ **Single source of truth** - No data inconsistencies
- ✅ **Zero sync overhead** - No export/import/upload steps
- ✅ **Hot-reload testing** with real production data
- ✅ **Complete feature testing** in actual production environment

### **Deployment Reliability - SIMPLIFIED**
- ✅ **Automated frontend deployment** via Vercel
- ✅ **Git-based version control** for code changes
- ✅ **Database already updated** during development
- ✅ **Rollback capability** via Git history + database backups
- ✅ **No data migration failures** (there's no migration!)

### **Data Synchronization - ELIMINATED**
- ✅ **No synchronization needed** - Same database everywhere
- ✅ **Zero data drift** - Impossible by design
- ✅ **All 653 campaigns instantly available** locally
- ✅ **All 228 clients immediately accessible**
- ✅ **Real-time updates** across all environments
- ✅ **Vendor users fully functional** in local dev

### **Production Stability - MAINTAINED**
- ✅ **Self-hosted infrastructure** on DigitalOcean
- ✅ **SSL-secured endpoints** with custom domains
- ✅ **Single database** reduces complexity
- ✅ **Automatic consistency** between dev and prod
- ✅ **Health monitoring** and logging

---

## 🔧 **Troubleshooting Guide**

### **Common Issues and Solutions**

#### **Frontend Build Failures**
```bash
# Clear Vercel cache
# In Vercel dashboard: Deployments → [Failed Build] → Redeploy

# Local debugging
cd apps/frontend
npm run build
```

#### **Backend API Issues**
```bash
# Check service status on droplet
docker ps
curl -I https://api.artistinfluence.com/healthz

# Restart services
docker-compose -p arti-marketing-ops restart
```

#### **Database Connection Issues**
```bash
# Check Supabase status
supabase status

# Restart Supabase
supabase stop && supabase start
```

#### **Data Import Failures**
- **Duplicate keys**: Normal for existing data, import continues
- **Foreign key violations**: Expected for relationship data
- **Network issues**: Retry import script

### **Rollback Procedures**

#### **Frontend Rollback**
1. Go to Vercel dashboard
2. Navigate to Deployments
3. Select previous working deployment
4. Click "Promote to Production"

#### **Backend Rollback**
```bash
# On droplet
git log --oneline -10  # Find previous commit
git checkout [commit-hash]
docker-compose restart
```

#### **Database Rollback**
```bash
# Restore from backup
node scripts/import-csv-data.js  # Re-import from backup files
```

---

## 📈 **Future Enhancements**

### **Automation Opportunities**
1. **Auto-deploy backend** via GitHub Actions
2. **Scheduled data backups** via cron jobs
3. **Health monitoring** with alerts
4. **Database migrations** automation

### **Scaling Considerations**
1. **Load balancing** for increased traffic
2. **Database sharding** for large datasets
3. **CDN integration** for global performance
4. **Monitoring and logging** enhancement

### **Development Improvements**
1. **Hot reloading** for backend changes
2. **Staging environment** for testing
3. **A/B testing** infrastructure
4. **Feature flags** implementation

---

## 📚 **Documentation References**

- **Deployment Guide**: `docs/deployment-plan.md`
- **Production Setup**: `DEPLOY-COMMANDS.md`
- **Environment Setup**: `docs/vercel-environment-setup.md`
- **Data Migration**: `docs/production-data-migration.md`
- **Progress Tracking**: `AA-docs/progress.md`

---

## ✅ **Validation Checklist**

### **Local Environment Setup**
- [ ] Supabase running (`localhost:54321`)
- [ ] Frontend accessible (`localhost:3000`)
- [ ] Backend API responding (`localhost:3001`)
- [ ] Database populated with real data

### **Production Environment**
- [ ] Frontend live (`https://app.artistinfluence.com`)
- [ ] Backend API responding (`https://api.artistinfluence.com`)
- [ ] Database accessible (`https://db.artistinfluence.com`)
- [ ] All services healthy

### **Data Synchronization**
- [ ] Export script working
- [ ] Upload to droplet successful
- [ ] Import script completing
- [ ] Data verified in production

### **End-to-End Testing**
- [ ] User login working
- [ ] Campaign data visible
- [ ] Admin functions operational
- [ ] All CRUD operations functional

---

**This workflow provides a robust, scalable foundation for rapid development with production-grade reliability. The combination of local development flexibility and production stability creates an optimal environment for continuous delivery.**
