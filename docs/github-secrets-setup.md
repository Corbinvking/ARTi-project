# GitHub Secrets Setup Guide

## 🔐 **Required GitHub Repository Secrets**

### **For DigitalOcean Backend Deployment:**

```bash
# DigitalOcean Droplet Access
DO_HOST=your-droplet-ip-address
DO_USERNAME=root
DO_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
your-private-ssh-key-content-here
-----END OPENSSH PRIVATE KEY-----
DO_PORT=22

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_ISSUER=your-jwt-issuer
```

### **For Vercel Frontend Deployment:**

```bash
# Vercel Access
VERCEL_TOKEN=your-vercel-token-here
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
VERCEL_DEPLOYMENT_URL=https://your-app-name.vercel.app

# Frontend Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

---

## 📋 **Setup Instructions**

### **Step 1: GitHub Repository Secrets**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the lists above

### **Step 2: DigitalOcean Setup**

#### **Create Droplet:**
```bash
# 1. Create a new droplet on DigitalOcean
# 2. Choose Ubuntu 22.04 LTS
# 3. Add your SSH key during creation
# 4. Note the IP address
```

#### **Initial Droplet Setup:**
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create application directory
mkdir -p /root/arti-marketing-ops
cd /root/arti-marketing-ops

# Clone your repository
git clone https://github.com/your-username/your-repo-name.git .

# Create environment file
cp apps/api/environment.template apps/api/.env
# Edit the .env file with your actual values
nano apps/api/.env
```

### **Step 3: Vercel Setup**

#### **Create Vercel Project:**
```bash
# 1. Go to https://vercel.com/dashboard
# 2. Click "New Project"
# 3. Import your GitHub repository
# 4. Configure build settings:
#    - Framework Preset: Next.js
#    - Root Directory: apps/frontend
#    - Build Command: npm run build
#    - Output Directory: .next
```

#### **Get Vercel IDs:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
cd apps/frontend
vercel link

# Get your organization and project IDs
vercel env ls
# Note the org and project IDs shown
```

### **Step 4: Supabase Credentials**

#### **Get Supabase Keys:**
```bash
# From your Supabase dashboard:
# 1. Go to Settings → API
# 2. Copy Project URL (SUPABASE_URL)
# 3. Copy anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
# 4. Copy service_role key (SUPABASE_SERVICE_ROLE_KEY)
```

---

## 🔧 **Environment Files Setup**

### **Backend Environment (apps/api/.env):**
```bash
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://your-app-name.vercel.app
PRODUCTION_DOMAIN=https://api.yourdomain.com
JWT_SECRET=your-jwt-secret-here
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=postgres
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=https://your-app-name.vercel.app/auth/callback
OPENAI_API_KEY=sk-your-openai-api-key
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_ENCRYPTION_KEY=your-n8n-encryption-key
```

### **Frontend Environment (apps/frontend/.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

---

## ✅ **Testing Your Setup**

### **Test DigitalOcean Deployment:**
```bash
# Push a change to trigger deployment
git add .
git commit -m "test: trigger deployment"
git push origin main

# Check GitHub Actions
# Go to your repo → Actions tab
# Watch the "Deploy API" workflow
```

### **Test Vercel Deployment:**
```bash
# Push a frontend change
touch apps/frontend/test-deployment.txt
git add .
git commit -m "test: trigger frontend deployment"
git push origin main

# Check GitHub Actions
# Watch the "Deploy Frontend to Vercel" workflow
```

### **Verify Deployments:**
```bash
# Test backend health
curl https://api.yourdomain.com/healthz

# Test frontend
curl https://your-app-name.vercel.app

# Test full flow
# 1. Open https://your-app-name.vercel.app
# 2. Try to login
# 3. Check if API calls work
```

---

## 🚨 **Common Issues & Solutions**

### **Issue: DigitalOcean SSH Connection Failed**
```bash
# Solution: Check your SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"
# Copy the public key to DigitalOcean
cat ~/.ssh/id_ed25519.pub
```

### **Issue: Docker Build Failed**
```bash
# Solution: Check Docker context in workflows
# Ensure .github/workflows/ci.yml uses correct paths
```

### **Issue: Vercel Build Failed**
```bash
# Solution: Check vercel.json configuration
# Ensure build commands point to correct directories
```

### **Issue: Environment Variables Not Working**
```bash
# Solution: Check Vercel dashboard
# Go to Project → Settings → Environment Variables
# Ensure all NEXT_PUBLIC_ variables are set
```

---

## 📞 **Support Checklist**

Before asking for help, verify:

- [ ] All GitHub secrets are set correctly
- [ ] DigitalOcean droplet is accessible via SSH
- [ ] Vercel project is linked to GitHub repo
- [ ] Supabase credentials are valid
- [ ] Environment files exist and are properly formatted
- [ ] Docker is running on DigitalOcean droplet
- [ ] Domain DNS is configured (if using custom domain)

---

*This guide ensures your monorepo can deploy seamlessly to both platforms with full CI/CD automation.*
