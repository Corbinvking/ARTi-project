# DNS Setup Guide for artistinfluence.com

## 🌐 **Required DNS Records**

### **When you get your DigitalOcean droplet IP, configure these DNS records:**

```dns
# A Records for Droplet Subdomains (Replace 164.90.129.146 with actual IP)
api.artistinfluence.com     A     164.90.129.146    (backend API)
link.artistinfluence.com    A     164.90.129.146    (n8n automation)

# CNAME Records
app.artistinfluence.com     CNAME cname.vercel-dns.com    (frontend)

# Optional: Supabase Dashboard (if using custom subdomain)
db.artistinfluence.com      CNAME YOUR_SUPABASE_PROJECT.supabase.co

# NOTE: artistinfluence.com (root domain) remains unchanged - existing live site
# NOTE: www.artistinfluence.com remains unchanged - existing live site
```

## 📋 **Step-by-Step DNS Configuration**

### **1. Get Your Droplet IP**
After creating your DigitalOcean droplet, note the public IP address.

### **2. Configure DNS at Your Domain Registrar**
Add these records in your domain management panel:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_DROPLET_IP | 300 |
| A | api | YOUR_DROPLET_IP | 300 |
| A | link | YOUR_DROPLET_IP | 300 |
| CNAME | app | cname.vercel-dns.com | 300 |
| CNAME | www | artistinfluence.com | 300 |

### **3. Verify DNS Propagation**
```bash
# Test DNS resolution (run these commands after setting up DNS)
nslookup artistinfluence.com
nslookup api.artistinfluence.com
nslookup app.artistinfluence.com
nslookup link.artistinfluence.com

# Or use online tools:
# https://www.whatsmydns.net/
# https://dnschecker.org/
```

## 🔧 **Vercel Custom Domain Setup**

### **1. Add Custom Domain in Vercel**
1. Go to your Vercel project dashboard
2. Settings → Domains
3. Add domain: `app.artistinfluence.com`
4. Vercel will provide DNS configuration instructions

### **2. Expected Vercel Configuration**
- Domain: `app.artistinfluence.com`
- Type: CNAME
- Value: `cname.vercel-dns.com` (or specific Vercel CNAME)

## 🚀 **Deployment Order**

### **Recommended Deployment Sequence:**
1. **Create DigitalOcean Droplet** → Get IP address
2. **Configure DNS Records** → Point domains to droplet
3. **Deploy Backend** → Run deployment script on droplet
4. **Wait for DNS Propagation** → Usually 5-60 minutes
5. **Deploy Frontend** → Configure Vercel custom domain
6. **Test Everything** → Verify all services work

## ⏰ **DNS Propagation Times**

| Record Type | Typical Time | Max Time |
|-------------|--------------|----------|
| A Records | 5-30 minutes | 2 hours |
| CNAME Records | 5-30 minutes | 2 hours |
| Full Global Propagation | 2-6 hours | 24-48 hours |

## 🧪 **Testing Commands**

### **After DNS Setup:**
```bash
# Test basic connectivity
ping api.artistinfluence.com
ping link.artistinfluence.com

# Test HTTP responses (after deployment)
curl -I https://api.artistinfluence.com/healthz
curl -I https://app.artistinfluence.com
curl -I https://link.artistinfluence.com

# Test redirects
curl -I https://artistinfluence.com
# Should redirect to https://app.artistinfluence.com
```

## 🔐 **SSL Certificate Notes**

- **Caddy will automatically generate SSL certificates** for all domains
- Certificates are issued by Let's Encrypt
- First SSL generation may take 1-2 minutes after DNS propagation
- Certificates auto-renew every 90 days

## 🚨 **Common Issues & Solutions**

### **DNS Not Resolving:**
- Wait longer (DNS propagation can take up to 48 hours)
- Check DNS configuration at registrar
- Use different DNS checker tools
- Clear local DNS cache: `ipconfig /flushdns` (Windows)

### **SSL Certificate Errors:**
- Ensure DNS points to correct IP
- Wait for full DNS propagation
- Check Caddy logs: `docker logs arti-caddy-prod`
- Restart Caddy: `docker restart arti-caddy-prod`

### **Vercel Domain Not Working:**
- Verify CNAME record in DNS
- Check Vercel domain configuration
- Ensure domain status is "Active" in Vercel dashboard
- Try removing and re-adding domain in Vercel

## 📞 **Quick Verification Checklist**

- [ ] DigitalOcean droplet created and IP noted
- [ ] DNS A records configured for api & link subdomains
- [ ] DNS CNAME record configured for app subdomain
- [ ] Vercel project connected to custom domain
- [ ] DNS propagation completed (test with nslookup)
- [ ] Backend deployed and running on droplet
- [ ] Frontend deployed to Vercel
- [ ] All HTTPS certificates generated
- [ ] Full end-to-end test completed

---

*Once DNS is configured and propagated, your ARTi platform will be accessible at artistinfluence.com with all subdomains working correctly.*
