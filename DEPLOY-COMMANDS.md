# Quick Deploy Commands for DigitalOcean Droplet
## IP: 164.90.129.146

## 📋 **Copy & Paste These Commands**

### **1. Connect to Your Droplet:**
```bash
ssh root@164.90.129.146
```

### **2. Run These Commands One by One:**

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Set up firewall
ufw --force enable && ufw allow ssh && ufw allow 80 && ufw allow 443

# Create log directory
mkdir -p /var/log/caddy && chmod 755 /var/log/caddy

# Clone your repository (REPLACE WITH YOUR ACTUAL REPO URL)
cd /root && git clone https://github.com/Corbinvking/ARTi-project.git arti-marketing-ops

# Navigate to project
cd arti-marketing-ops

# Copy environment template
cp apps/api/environment.template apps/api/.env
```

### **3. Edit Environment File:**
```bash
nano apps/api/.env
```

**Copy this into the file (update the YOUR_* placeholders):**
```bash
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://app.artistinfluence.com
PRODUCTION_DOMAIN=https://api.artistinfluence.com
CORS_ORIGIN=https://app.artistinfluence.com
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=postgres
POSTGRES_USER=postgres
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
N8N_WEBHOOK_URL=https://link.artistinfluence.com/webhook
N8N_ENCRYPTION_KEY=your-n8n-encryption-key
N8N_BASIC_AUTH_PASSWORD=your-secure-n8n-password
```

**Press Ctrl+X, then Y, then Enter to save.**

### **4. Deploy the Application:**
```bash
# Build and start services
docker compose -f docker-compose.production.yml up -d --build

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs
```

### **5. Test Local Services:**
```bash
# Test API
curl http://localhost:3001/healthz

# Test n8n
curl http://localhost:5678

# Test Caddy
curl http://localhost:80
```

---

## 🌐 **DNS Configuration Required**

**Add these DNS records in your domain registrar:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | 164.90.129.146 | 300 |
| A | link | 164.90.129.146 | 300 |

**For your frontend (Vercel):**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | app | cname.vercel-dns.com | 300 |

**NOTE:** Do NOT change the root domain `artistinfluence.com` - it remains with your existing live site.

---

## 🔧 **Useful Commands After Deployment**

### **View Logs:**
```bash
# All services
docker compose -f docker-compose.production.yml logs

# Specific service
docker logs arti-api-prod
docker logs arti-caddy-prod
docker logs arti-n8n-prod
```

### **Restart Services:**
```bash
# All services
docker compose -f docker-compose.production.yml restart

# Specific service
docker restart arti-api-prod
```

### **Update Code:**
```bash
git pull origin main
docker compose -f docker-compose.production.yml up -d --build
```

---

## ✅ **Success Indicators**

**Your deployment is working when:**
- [ ] All Docker containers are running
- [ ] `curl http://localhost:3001/healthz` returns a response
- [ ] `curl http://localhost:5678` shows n8n interface
- [ ] DNS records are configured
- [ ] After DNS propagation: `https://api.artistinfluence.com/healthz` works
- [ ] After DNS propagation: `https://link.artistinfluence.com` shows n8n

---

**🎯 Total deployment time: ~10-15 minutes + DNS propagation (5-60 minutes)**
