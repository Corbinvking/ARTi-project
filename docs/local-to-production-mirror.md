# Local to Production Mirror Workflow

**Complete documentation of our hybrid local-cloud development workflow that enables seamless data and code synchronization between local development and production environments.**

## 🏗️ **Architecture Overview**

### **Local Development Environment (Windows)**
- **Frontend**: Next.js development server (`localhost:3000`)
- **Backend**: Dockerized Supabase stack (`localhost:54321`)
- **Database**: PostgreSQL with full schema and real data
- **Services**: Auth, Storage, Realtime, Studio (`localhost:54323`)

### **Production Environment (DigitalOcean)**
- **Frontend**: Vercel deployment (`https://app.artistinfluence.com`)
- **Backend**: DigitalOcean droplet (`https://api.artistinfluence.com`)
- **Database**: Self-hosted Supabase stack
- **Domain Routing**: Caddy reverse proxy with SSL

---

## 🔄 **The Complete Workflow**

### **Phase 1: Local Development**

#### **1.1 Start Local Environment**
```bash
# Start complete local stack
npx supabase start

# Verify all services running
supabase status
```

**Services Available:**
- API: `http://localhost:54321`
- Studio: `http://localhost:54323`
- Database: `postgresql://postgres:postgres@localhost:54322/postgres`

#### **1.2 Frontend Development**
```bash
# Run Next.js frontend
cd apps/frontend
npm run dev
# Available at http://localhost:3000
```

#### **1.3 Backend API Development**
```bash
# Run custom API server
cd apps/api
npm run dev
# Available at http://localhost:3001
```

**Result**: Full-stack development environment with real data, auth, and all services.

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

### **Phase 3: Data Synchronization**

#### **3.1 Export Local Data**
```bash
# On local machine
cd apps/api
node ../../scripts/export-local-data.js
```

**Creates:**
```
data-exports/
├── complete-export-[timestamp].json    # Full backup
├── orgs.csv                           # Organizations
├── memberships.csv                    # User memberships
├── user_permissions.csv               # Role permissions
├── spotify_campaigns.csv              # Spotify campaigns
├── soundcloud_campaigns.csv           # SoundCloud campaigns
├── youtube_campaigns.csv              # YouTube campaigns
├── instagram_campaigns.csv            # Instagram campaigns
├── insights.csv                       # Analytics insights
├── documents.csv                      # Document storage
├── chunks.csv                         # Document chunks
└── auth-users.json                    # User accounts
```

#### **3.2 Upload Data to Production**
```bash
# Upload CSV files to droplet
scp -r data-exports root@164.90.129.146:~/

# Verify upload
ssh root@164.90.129.146 "ls -la data-exports/"
```

#### **3.3 Import to Production Database**
```bash
# On production droplet
cd /root/arti-marketing-ops

# Run bulk import script
node scripts/import-csv-data.js
```

**Import Process:**
1. ✅ Creates auth users with roles
2. ✅ Imports all campaign data (2,887+ records)
3. ✅ Imports organizations and permissions
4. ✅ Processes in batches for reliability
5. ✅ Provides detailed progress reporting

---

## 🛠️ **Technical Implementation Details**

### **Frontend Configuration**

#### **Local Environment (apps/frontend/.env.local)**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_[local_key]
```

#### **Production Environment (Vercel)**
```env
NEXT_PUBLIC_API_BASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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

## 📊 **Data Flow Architecture**

### **Development Data Flow**
```
Local Frontend (Next.js) 
    ↓ API calls
Local Backend (Node.js API)
    ↓ Database queries  
Local Supabase (Docker)
    ↓ PostgreSQL
Local Database (Real data)
```

### **Production Data Flow**
```
Production Frontend (Vercel)
    ↓ API calls via HTTPS
Production Backend (DigitalOcean)
    ↓ Database queries
Production Supabase (Self-hosted)
    ↓ PostgreSQL
Production Database (Mirrored data)
```

### **Data Synchronization Flow**
```
Local Database 
    ↓ export-local-data.js
CSV Files (data-exports/)
    ↓ SCP upload
Production Droplet
    ↓ import-csv-data.js
Production Database
```

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

### **Daily Development Workflow**
1. **Start Local Environment**
   ```bash
   npx supabase start
   cd apps/frontend && npm run dev
   cd apps/api && npm run dev
   ```

2. **Develop Features**
   - Frontend changes in `apps/frontend/`
   - Backend changes in `apps/api/`
   - Database changes via Supabase Studio

3. **Test Locally**
   - Full-stack testing with real data
   - Role-based access testing
   - API endpoint testing

4. **Deploy to Production**
   ```bash
   git add .
   git commit -m "Feature description"
   git push origin main
   # Frontend deploys automatically via Vercel
   # Backend requires manual pull on droplet
   ```

### **Data Migration Workflow**
1. **Export Local Data**
   ```bash
   cd apps/api
   node ../../scripts/export-local-data.js
   ```

2. **Upload to Production**
   ```bash
   scp -r data-exports root@164.90.129.146:~/
   ```

3. **Import to Production**
   ```bash
   ssh root@164.90.129.146
   cd /root/arti-marketing-ops
   node scripts/import-csv-data.js
   ```

4. **Verify Migration**
   - Test login at `https://app.artistinfluence.com`
   - Verify data in admin panel
   - Check all functionality

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

## 🎯 **Success Metrics**

### **Development Efficiency**
- ✅ **Instant local testing** with full production data
- ✅ **Real-time feedback** during development
- ✅ **Complete feature testing** before deployment

### **Deployment Reliability**
- ✅ **Automated frontend deployment** via Vercel
- ✅ **Git-based version control** for all changes
- ✅ **Rollback capability** via Git history

### **Data Synchronization**
- ✅ **Complete data mirroring** (3,000+ records)
- ✅ **User account preservation** with roles
- ✅ **Incremental updates** capability

### **Production Stability**
- ✅ **Self-hosted infrastructure** on DigitalOcean
- ✅ **SSL-secured endpoints** with custom domains
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
