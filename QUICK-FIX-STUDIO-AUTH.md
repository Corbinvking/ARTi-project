# 🔧 Quick Fix: Correct Container Name

## Issue
The script used `caddy` but the actual container name is `arti-caddy-prod`

## ⚡ Quick 3-Command Setup

Run these on production:

### **Step 1: Generate Password Hash**
```bash
docker exec arti-caddy-prod caddy hash-password
```
Enter your password when prompted (e.g., `MyStudio2024!`)  
**Copy the hash output** (starts with `$2a$14$...`)

### **Step 2: Edit Caddyfile**
```bash
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

Find the `db.artistinfluence.com` section (around line 117) and change:

**FROM:**
```caddyfile
# Supabase Studio (Self-Hosted Admin Panel)
db.artistinfluence.com {
    reverse_proxy localhost:54323 {
```

**TO:**
```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin $2a$14$YOUR_HASH_FROM_STEP_1
    }
    
    reverse_proxy localhost:54323 {
```

Save: `Ctrl+X`, `Y`, `Enter`

### **Step 3: Reload Caddy**
```bash
docker exec arti-caddy-prod caddy reload --config /etc/caddy/Caddyfile
```

✅ **Done!** Test at: `https://db.artistinfluence.com`

---

## 🔄 Alternative: Fixed Automated Script

Or use this corrected one-liner:

```bash
# Download and run fixed script
curl -s https://raw.githubusercontent.com/Corbinvking/ARTi-project/main/scripts/add-studio-auth-fixed.sh | bash
```

---

## 🧪 Verify It Works

```bash
# Test 1: Check if Caddy reloaded
docker logs arti-caddy-prod --tail 20

# Test 2: Open in browser
# https://db.artistinfluence.com
# Should show login prompt

# Test 3: Check Caddyfile has auth
grep -A 5 "basicauth" /root/arti-marketing-ops/caddy/Caddyfile.production
```

---

## 📋 Complete Example

```bash
# SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Generate hash
docker exec arti-caddy-prod caddy hash-password
# Enter password: MyStudio2024!
# Output: $2a$14$abc123xyz...

# Backup Caddyfile
cp caddy/Caddyfile.production caddy/Caddyfile.production.backup

# Edit Caddyfile
nano caddy/Caddyfile.production
# Add the basicauth block with your hash

# Reload
docker exec arti-caddy-prod caddy reload --config /etc/caddy/Caddyfile

# Test
curl -I https://db.artistinfluence.com
# Should see: HTTP/2 401 (Unauthorized)
```

---

## 🎯 What to Add to Caddyfile

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    # HTTP Basic Authentication
    basicauth {
        admin $2a$14$YOUR_ACTUAL_HASH_HERE
    }
    
    reverse_proxy localhost:54323 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        
        # Health check for Studio
        health_uri /
        health_interval 30s
        health_timeout 10s
    }
    
    # Security headers for Supabase Studio
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Logging
    log {
        output file /var/log/caddy/supabase.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
        level INFO
    }
}
```

That's it! 🎉

