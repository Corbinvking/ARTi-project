# ARTi Platform - Production Deployment Plan
## Domain: artistinfluence.com

## 🌐 **Domain Architecture**

### **Primary Domain & Subdomains:**
```
artistinfluence.com                  → EXISTING LIVE SITE (unchanged)
├── app.artistinfluence.com         → Frontend (Vercel)
├── api.artistinfluence.com         → Backend API (DigitalOcean Droplet)
├── db.artistinfluence.com          → Supabase Dashboard (Optional)
└── link.artistinfluence.com        → n8n Automation (DigitalOcean Droplet)
```

### **Service Mapping:**
| Service | Subdomain | Target | Port | Platform |
|---------|-----------|--------|------|----------|
| **Frontend** | `app.artistinfluence.com` | Vercel | 443 | Vercel |
| **Backend API** | `api.artistinfluence.com` | Droplet IP | 3001 | DigitalOcean |
| **Supabase Studio** | `db.artistinfluence.com` | Supabase Cloud | 443 | Supabase Cloud |
| **n8n Automation** | `link.artistinfluence.com` | Droplet IP | 5678 | DigitalOcean |
| **Root Domain** | `artistinfluence.com` | Existing Live Site | - | Unchanged |

---

## 🔧 **DNS Configuration**

### **Required DNS Records:**
```dns
# A Records (Point to DigitalOcean Droplet IP: 164.90.129.146)
api.artistinfluence.com     A     164.90.129.146
link.artistinfluence.com    A     164.90.129.146

# CNAME Records
app.artistinfluence.com     CNAME cname.vercel-dns.com
db.artistinfluence.com      CNAME YOUR_SUPABASE_PROJECT.supabase.co

# NOTE: Root domain (artistinfluence.com) and www remain unchanged
# They continue to serve the existing live site
```

### **DNS Setup Steps:**
1. **Point API & n8n to Droplet:**
   - `api.artistinfluence.com` → 164.90.129.146
   - `link.artistinfluence.com` → 164.90.129.146
   
2. **Point Frontend to Vercel:**
   - `app.artistinfluence.com` → Vercel CNAME
   
3. **Optional Supabase Dashboard:**
   - `db.artistinfluence.com` → Supabase Project URL
   
4. **Leave Root Domain Unchanged:**
   - `artistinfluence.com` → Existing live site (no changes)
   - `www.artistinfluence.com` → Existing live site (no changes)

---

## 🌊 **Caddy Reverse Proxy Configuration**

### **Production Caddyfile:**
```caddy
# Root domain redirect
artistinfluence.com {
    redir https://app.artistinfluence.com{uri} permanent
}

www.artistinfluence.com {
    redir https://app.artistinfluence.com{uri} permanent
}

# Backend API
api.artistinfluence.com {
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # CORS headers for production
    header Access-Control-Allow-Origin "https://app.artistinfluence.com"
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    header Access-Control-Allow-Credentials "true"
    
    # Handle preflight requests
    @options method OPTIONS
    handle @options {
        header Access-Control-Allow-Origin "https://app.artistinfluence.com"
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
        header Access-Control-Max-Age "86400"
        respond "" 204
    }
    
    # Security headers
    header X-Frame-Options "DENY"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Permissions-Policy "geolocation=(), microphone=(), camera=()"
    
    # Logging
    log {
        output file /var/log/caddy/api.log
        format json
    }
}

# n8n Automation Platform
link.artistinfluence.com {
    reverse_proxy localhost:5678 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Security headers for n8n
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    
    # Logging
    log {
        output file /var/log/caddy/n8n.log
        format json
    }
}

# Supabase Dashboard Proxy (Optional - if you want custom subdomain)
db.artistinfluence.com {
    reverse_proxy https://YOUR_SUPABASE_PROJECT.supabase.co {
        header_up Host YOUR_SUPABASE_PROJECT.supabase.co
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Logging
    log {
        output file /var/log/caddy/supabase.log
        format json
    }
}
```

---

## 🔄 **Environment Variables Update**

### **Frontend Environment Variables (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=https://api.artistinfluence.com
```

### **Backend Environment Variables (.env):**
```bash
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://app.artistinfluence.com
PRODUCTION_DOMAIN=https://api.artistinfluence.com
JWT_SECRET=your-jwt-secret
N8N_WEBHOOK_URL=https://link.artistinfluence.com/webhook
N8N_ENCRYPTION_KEY=your-n8n-encryption-key
CORS_ORIGIN=https://app.artistinfluence.com
```

### **Vercel Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=https://api.artistinfluence.com
```

### **GitHub Secrets Update:**
```bash
# Add these new secrets to GitHub
VERCEL_DEPLOYMENT_URL=https://app.artistinfluence.com
PRODUCTION_FRONTEND_URL=https://app.artistinfluence.com
PRODUCTION_API_URL=https://api.artistinfluence.com
PRODUCTION_N8N_URL=https://link.artistinfluence.com
```

---

## 📋 **Deployment Checklist**

### **Phase 1: DigitalOcean Droplet Setup**
- [ ] Create Ubuntu 22.04 droplet on DigitalOcean
- [ ] Note the droplet IP address
- [ ] Configure SSH key access
- [ ] Install Docker and Docker Compose
- [ ] Install Caddy web server

### **Phase 2: DNS Configuration**
- [ ] Add A records for `api.artistinfluence.com` → Droplet IP
- [ ] Add A records for `link.artistinfluence.com` → Droplet IP
- [ ] Add A record for `artistinfluence.com` → Droplet IP (for redirect)
- [ ] Add CNAME for `app.artistinfluence.com` → Vercel
- [ ] Add CNAME for `db.artistinfluence.com` → Supabase (optional)
- [ ] Verify DNS propagation (24-48 hours)

### **Phase 3: Droplet Configuration**
- [ ] SSH into droplet
- [ ] Clone repository to `/root/arti-marketing-ops`
- [ ] Create production Caddyfile
- [ ] Set up environment variables
- [ ] Configure firewall (ports 80, 443, 22)
- [ ] Start Caddy service

### **Phase 4: Application Deployment**
- [ ] Deploy backend API via GitHub Actions
- [ ] Configure n8n with custom domain
- [ ] Update Supabase CORS settings
- [ ] Test API health endpoints

### **Phase 5: Frontend Deployment**
- [ ] Configure Vercel custom domain
- [ ] Add environment variables to Vercel
- [ ] Deploy frontend via GitHub Actions
- [ ] Test full authentication flow

### **Phase 6: SSL & Security**
- [ ] Verify Caddy auto-SSL certificates
- [ ] Test HTTPS on all subdomains
- [ ] Configure security headers
- [ ] Set up monitoring and logging

---

## 🛠️ **Required File Changes**

### **1. Update Backend CORS (apps/api/src/lib/plugins.ts):**
```typescript
// Update CORS origins
const allowedOrigins = [
  'https://app.artistinfluence.com',
  'https://artistinfluence.com',
  /^https:\/\/.*\.vercel\.app$/,
  'http://localhost:3000', // Keep for development
];
```

### **2. Create Production Caddyfile:**
```bash
# File: caddy/Caddyfile.production
# (Content as shown above)
```

### **3. Update Docker Compose for Production:**
```yaml
# File: docker-compose.production.yml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      - FRONTEND_URL=https://app.artistinfluence.com
      - PRODUCTION_DOMAIN=https://api.artistinfluence.com
    restart: unless-stopped

  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - WEBHOOK_URL=https://link.artistinfluence.com
      - N8N_BASIC_AUTH_ACTIVE=true
    restart: unless-stopped

  caddy:
    image: caddy:2.7-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile.production:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - /var/log/caddy:/var/log/caddy
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
```

### **4. Update Frontend Auth Configuration:**
```typescript
// File: apps/frontend/lib/auth.ts
// Update API base URL validation
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.artistinfluence.com'
```

---

## 🔍 **Testing Plan**

### **DNS Testing:**
```bash
# Test DNS resolution
nslookup api.artistinfluence.com
nslookup app.artistinfluence.com
nslookup link.artistinfluence.com

# Test connectivity
curl -I https://api.artistinfluence.com/healthz
curl -I https://app.artistinfluence.com
curl -I https://link.artistinfluence.com
```

### **End-to-End Testing:**
1. **Frontend Access:** https://app.artistinfluence.com
2. **User Login:** Test authentication flow
3. **API Calls:** Verify backend communication
4. **Admin Panel:** Test user management
5. **n8n Access:** https://link.artistinfluence.com
6. **Root Redirect:** https://artistinfluence.com → app.artistinfluence.com

---

## 🚨 **Rollback Plan**

### **If Deployment Fails:**
1. **DNS Rollback:** Point subdomains back to old servers
2. **Caddy Rollback:** Revert to previous Caddyfile
3. **App Rollback:** Use GitHub Actions to deploy previous version
4. **Database Rollback:** Ensure Supabase remains accessible

### **Monitoring Setup:**
- [ ] Set up uptime monitoring for all subdomains
- [ ] Configure error alerting
- [ ] Monitor SSL certificate expiration
- [ ] Track API response times

---

## 📊 **Success Metrics**

### **Deployment Complete When:**
- [ ] All subdomains resolve correctly
- [ ] HTTPS certificates are auto-generated
- [ ] Frontend loads and authenticates users
- [ ] Backend API responds to health checks
- [ ] n8n is accessible and functional
- [ ] CORS allows cross-domain requests
- [ ] Root domain redirects properly

---

*This deployment plan ensures your ARTi platform runs seamlessly on the artistinfluence.com domain with proper subdomain routing and security.*
