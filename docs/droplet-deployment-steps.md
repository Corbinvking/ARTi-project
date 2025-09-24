# DigitalOcean Droplet Deployment Steps
## IP: 164.90.129.146
## Domain: artistinfluence.com

## 🚀 **Step-by-Step Deployment Guide**

### **Step 1: Connect to Your Droplet**
```bash
# SSH into your droplet (replace with your SSH key path if different)
ssh root@164.90.129.146

# If you get SSH key issues, use password authentication initially
# Then set up SSH keys once connected
```

### **Step 2: Initial Server Setup**
```bash
# Update the system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installations
docker --version
docker compose version
```

### **Step 3: Clone Your GitHub Repository**
```bash
# Navigate to the root directory
cd /root

# Clone your repository (replace with your actual GitHub repo URL)
git clone https://github.com/YOUR_USERNAME/ARTi-project.git arti-marketing-ops

# Navigate to the project
cd arti-marketing-ops

# Verify the clone
ls -la
```

### **Step 4: Set Up Environment Variables**
```bash
# Copy the environment template
cp apps/api/environment.template apps/api/.env

# Edit the environment file with your actual values
nano apps/api/.env
```

**Copy this configuration into your `.env` file:**
```bash
# Basic Configuration
PORT=3001
NODE_ENV=production

# Domain Configuration
FRONTEND_URL=https://app.artistinfluence.com
PRODUCTION_DOMAIN=https://api.artistinfluence.com
CORS_ORIGIN=https://app.artistinfluence.com

# Supabase Configuration (get these from your Supabase dashboard)
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_PROJECT_ID=your-supabase-project-id

# Database Configuration
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=postgres
POSTGRES_USER=postgres

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# API Keys (add when you have them)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=https://app.artistinfluence.com/auth/callback
OPENAI_API_KEY=sk-your-openai-api-key

# n8n Configuration
N8N_WEBHOOK_URL=https://link.artistinfluence.com/webhook
N8N_ENCRYPTION_KEY=your-n8n-encryption-key-here
N8N_BASIC_AUTH_PASSWORD=your-secure-n8n-password
```

### **Step 5: Configure DNS Records**
**Before continuing, you need to set up these DNS records in your domain registrar:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 164.90.129.146 | 300 |
| A | api | 164.90.129.146 | 300 |
| A | link | 164.90.129.146 | 300 |
| CNAME | app | cname.vercel-dns.com | 300 |
| CNAME | www | artistinfluence.com | 300 |

### **Step 6: Set Up Firewall**
```bash
# Configure UFW firewall
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# Check firewall status
ufw status
```

### **Step 7: Create Log Directories**
```bash
# Create log directories for Caddy
mkdir -p /var/log/caddy
chmod 755 /var/log/caddy
```

### **Step 8: Deploy the Application**
```bash
# Build and start the production services
docker compose -f docker-compose.production.yml up -d --build

# Check if services are running
docker compose -f docker-compose.production.yml ps

# View logs to check for issues
docker compose -f docker-compose.production.yml logs
```

### **Step 9: Verify Deployment**
```bash
# Test local connectivity
curl http://localhost:3001/healthz
curl http://localhost:5678
curl http://localhost:80

# Check service status
docker compose -f docker-compose.production.yml ps

# View individual service logs
docker logs arti-api-prod
docker logs arti-n8n-prod
docker logs arti-caddy-prod
docker logs arti-redis-prod
```

### **Step 10: Test Domain Access (After DNS Propagation)**
```bash
# Test from the server (once DNS propagates)
curl -I https://api.artistinfluence.com/healthz
curl -I https://link.artistinfluence.com
curl -I https://artistinfluence.com

# Check SSL certificates
curl -vI https://api.artistinfluence.com 2>&1 | grep -i certificate
```

---

## 🔧 **Troubleshooting Commands**

### **View Logs:**
```bash
# All services
docker compose -f docker-compose.production.yml logs

# Specific service
docker logs arti-api-prod
docker logs arti-caddy-prod
docker logs arti-n8n-prod

# Follow logs in real-time
docker logs -f arti-api-prod
```

### **Restart Services:**
```bash
# Restart all services
docker compose -f docker-compose.production.yml restart

# Restart specific service
docker restart arti-api-prod
docker restart arti-caddy-prod
```

### **Update Application:**
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build

# Clean up old images
docker image prune -f
```

### **Check Resource Usage:**
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop

# Check Docker resources
docker system df
```

---

## 🚨 **Common Issues & Solutions**

### **Issue: Services Won't Start**
```bash
# Check for port conflicts
netstat -tulpn | grep :80
netstat -tulpn | grep :443
netstat -tulpn | grep :3001

# Check Docker daemon
systemctl status docker

# Check environment variables
cat apps/api/.env
```

### **Issue: SSL Certificates Not Generated**
```bash
# Check DNS propagation
nslookup api.artistinfluence.com
nslookup link.artistinfluence.com

# Check Caddy logs
docker logs arti-caddy-prod

# Restart Caddy after DNS propagation
docker restart arti-caddy-prod
```

### **Issue: API Not Responding**
```bash
# Check API logs
docker logs arti-api-prod

# Check if API container is running
docker ps | grep arti-api

# Test API locally
curl http://localhost:3001/healthz
```

---

## 📋 **Post-Deployment Checklist**

- [ ] Droplet created and accessible via SSH
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned to `/root/arti-marketing-ops`
- [ ] Environment variables configured
- [ ] DNS records pointing to 164.90.129.146
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Services running via Docker Compose
- [ ] Local health checks passing
- [ ] SSL certificates generated (after DNS propagation)
- [ ] Domain access working
- [ ] Frontend deployed to Vercel with custom domain

---

## 🎯 **Next Steps After Droplet Setup**

1. **Wait for DNS Propagation** (5-60 minutes)
2. **Deploy Frontend to Vercel** with custom domain
3. **Test Full End-to-End Flow**
4. **Set up monitoring and backups**

---

*Once completed, your ARTi platform will be fully deployed and accessible at artistinfluence.com!*
