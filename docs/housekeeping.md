# ARTi Platform - Deployment Housekeeping Plan

## 🔍 **AUDIT FINDINGS**

### ✅ **What's Already Good:**
- ✅ Proper monorepo structure with `apps/frontend` and `apps/api`
- ✅ GitHub Actions workflows exist (CI + DigitalOcean deployment)
- ✅ Docker containerization for backend API
- ✅ Environment templates created
- ✅ TypeScript build configurations
- ✅ Package.json scripts properly configured

### ⚠️ **Critical Issues Found:**

#### **1. Vercel Deployment Configuration Missing**
- **Issue**: No `vercel.json` configuration file
- **Impact**: Vercel won't know where to find the frontend app in the monorepo
- **Risk**: Frontend deployment will fail

#### **2. Conflicting Package.json Files**
- **Issue**: Root `package.json` has same name as `apps/frontend/package.json`
- **Impact**: Dependency confusion, build conflicts
- **Risk**: Vercel build failures

#### **3. Frontend Build Path Issues**
- **Issue**: Next.js config doesn't specify correct build output for monorepo
- **Impact**: Vercel may not find built assets
- **Risk**: Deployment failures

#### **4. GitHub Secrets Not Documented**
- **Issue**: CI/CD workflows reference secrets that aren't documented
- **Impact**: Deployments will fail without proper secrets
- **Risk**: Can't deploy to production

#### **5. Docker Build Context Issues**
- **Issue**: API Dockerfile assumes root context but workflows use `./apps/api`
- **Impact**: Docker builds may fail in CI/CD
- **Risk**: Backend deployment failures

---

## 🔧 **HOUSEKEEPING TASKS**

### **Phase 1: Vercel Frontend Setup**

#### **Task 1.1: Create Vercel Configuration**
- Create `vercel.json` in project root
- Configure build settings for monorepo frontend
- Set correct build output directory

#### **Task 1.2: Fix Package.json Conflicts**
- Remove root `package.json` (legacy from initial setup)
- Ensure `apps/frontend/package.json` is the source of truth
- Update any scripts that reference root package.json

#### **Task 1.3: Optimize Next.js Build**
- Update `apps/frontend/next.config.mjs` for production deployment
- Add build output optimization
- Configure static asset handling

### **Phase 2: Backend Docker Optimization**

#### **Task 2.1: Fix Docker Build Context**
- Update `apps/api/Dockerfile` to work with monorepo structure
- Ensure GitHub Actions can build Docker images correctly
- Test build process locally

#### **Task 2.2: Update GitHub Actions**
- Fix Docker build context paths in workflows
- Ensure API deployment workflow points to correct Dockerfile
- Add frontend build and deploy workflow for Vercel

### **Phase 3: CI/CD Secrets & Configuration**

#### **Task 3.1: Document Required GitHub Secrets**
- List all secrets needed for DigitalOcean deployment
- Add Vercel deployment token requirements
- Create secret setup guide

#### **Task 3.2: Create Vercel GitHub Integration**
- Add Vercel deployment workflow
- Configure automatic deployments on main branch
- Set up preview deployments for PRs

### **Phase 4: Environment & Security**

#### **Task 4.1: Production Environment Variables**
- Create production environment templates
- Set up secret management for both platforms
- Document environment variable mapping

#### **Task 4.2: CORS & Domain Configuration**
- Update backend CORS for production domains
- Configure Vercel domain settings
- Set up DigitalOcean domain routing

---

## 📋 **DETAILED IMPLEMENTATION PLAN**

### **🎯 Task 1.1: Create Vercel Configuration**

**Files to Create:**
```json
// vercel.json
{
  "builds": [
    {
      "src": "apps/frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/frontend/$1"
    }
  ],
  "installCommand": "cd apps/frontend && npm install",
  "buildCommand": "cd apps/frontend && npm run build",
  "outputDirectory": "apps/frontend/.next"
}
```

### **🎯 Task 1.2: Fix Package.json Structure**

**Root package.json (DELETE):**
- Remove the existing root `package.json`
- It's conflicting with the frontend app

**Frontend package.json (KEEP & UPDATE):**
- Update name to be unique: `"name": "@arti/frontend"`
- Ensure all build scripts work correctly

### **🎯 Task 1.3: Next.js Production Config**

**Update `apps/frontend/next.config.mjs`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false, // Enable for production
  },
  images: {
    domains: ['your-domain.com'], // Add your domains
    unoptimized: false, // Enable optimization for production
  },
  output: 'standalone', // Better for Vercel deployment
  experimental: {
    outputFileTracingRoot: '../../', // Handle monorepo correctly
  },
}
```

### **🎯 Task 2.1: Fix Docker Build Context**

**Update `apps/api/Dockerfile`:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (handle monorepo context)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S api -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built application
COPY --from=builder --chown=api:nodejs /app/dist ./dist

# Switch to app user
USER api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/healthz || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

### **🎯 Task 3.1: Required GitHub Secrets**

**For DigitalOcean Backend Deployment:**
```
DO_HOST=your-droplet-ip
DO_USERNAME=root
DO_SSH_KEY=your-private-ssh-key
DO_PORT=22
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
REDIS_URL=redis://localhost:6379
```

**For Vercel Frontend Deployment:**
```
VERCEL_TOKEN=your-vercel-token
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### **🎯 Task 3.2: Create Vercel Workflow**

**New file: `.github/workflows/deploy-frontend.yml`**
```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main ]
    paths: 
      - 'apps/frontend/**'
      - 'vercel.json'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v4

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./
        vercel-args: '--prod'
```

---

## 🚀 **DEPLOYMENT READINESS CHECKLIST**

### **Before First Deployment:**

#### **GitHub Repository:**
- [ ] Remove root `package.json`
- [ ] Add `vercel.json` configuration
- [ ] Update Next.js config for production
- [ ] Fix Docker build context
- [ ] Add Vercel deployment workflow

#### **Vercel Setup:**
- [ ] Create Vercel project linked to GitHub repo
- [ ] Configure build settings to use `apps/frontend`
- [ ] Add environment variables
- [ ] Set up custom domain (optional)

#### **DigitalOcean Setup:**
- [ ] Create droplet with Docker installed
- [ ] Set up SSH key access
- [ ] Clone repository to `/root/arti-marketing-ops`
- [ ] Configure environment variables
- [ ] Set up reverse proxy (Caddy/Nginx)

#### **GitHub Secrets:**
- [ ] Add all DigitalOcean secrets
- [ ] Add Vercel deployment token
- [ ] Add Supabase credentials
- [ ] Test secret access in workflows

---

## 🎯 **SUCCESS CRITERIA**

### **Frontend (Vercel) Working When:**
- [ ] Next.js app builds successfully in monorepo
- [ ] Vercel deployment completes without errors
- [ ] Frontend can connect to backend API
- [ ] Authentication flow works end-to-end
- [ ] All environment variables are properly injected

### **Backend (DigitalOcean) Working When:**
- [ ] Docker image builds and pushes to registry
- [ ] SSH deployment to droplet succeeds
- [ ] API health checks pass after deployment
- [ ] Database connections work
- [ ] CORS allows frontend connections

### **CI/CD Working When:**
- [ ] Push to main triggers both deployments
- [ ] Build failures prevent deployment
- [ ] Health checks validate deployments
- [ ] Rollback works on failure
- [ ] Zero-downtime deployments succeed

---

## ⚡ **QUICK START: Implementation Order**

### **Day 1: Core Fixes**
1. Delete root `package.json`
2. Create `vercel.json`
3. Update Next.js config
4. Test frontend build locally

### **Day 2: Docker & CI/CD**
1. Fix Docker build context
2. Update GitHub Actions
3. Create Vercel workflow
4. Test Docker build locally

### **Day 3: Deployment Setup**
1. Set up Vercel project
2. Configure GitHub secrets
3. Test full deployment pipeline
4. Verify end-to-end functionality

---

*This housekeeping plan ensures your monorepo can deploy seamlessly to both Vercel (frontend) and DigitalOcean (backend) with full CI/CD automation.*
