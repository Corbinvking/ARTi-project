# 🔐 Add Authentication Wall to Supabase Studio

## Objective
Protect `https://db.artistinfluence.com` with HTTP Basic Authentication so unauthorized users cannot access the database admin interface.

## Solution: HTTP Basic Auth via Caddy

Caddy has built-in support for HTTP Basic Authentication. We'll add a hard login prompt before anyone can access Supabase Studio.

---

## 📋 Implementation Steps

### **Step 1: Generate Secure Password Hash**

On your production server, run this command to generate a bcrypt hash:

```bash
# SSH into production
ssh root@artistinfluence.com

# Generate password hash (Caddy uses bcrypt)
caddy hash-password
```

When prompted, enter your desired password (e.g., `SuperSecure2024!`)

**Copy the output hash** - it will look like:
```
$2a$14$xyz...abc123
```

### **Step 2: Update Caddyfile with Basic Auth**

Edit the Caddyfile to add authentication:

```bash
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

Replace the `db.artistinfluence.com` section with:

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    # HTTP Basic Authentication
    basicauth {
        # Username: admin
        # Password: [whatever you entered in caddy hash-password]
        admin $2a$14$YOUR_BCRYPT_HASH_HERE
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

### **Step 3: Reload Caddy**

```bash
# Reload Caddy configuration (no downtime)
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 🎯 What Users Will See

When someone visits `https://db.artistinfluence.com`:

1. **Browser login prompt appears** (hard-coded browser auth)
2. They must enter:
   - **Username**: `admin`
   - **Password**: `[your secure password]`
3. **Only after successful authentication** can they access Supabase Studio

---

## 🔐 Security Features

✅ **Browser-level authentication** - Cannot be bypassed with JavaScript  
✅ **Bcrypt password hashing** - Industry-standard secure hashing  
✅ **No database queries needed** - Fast and efficient  
✅ **Works with all browsers** - Standard HTTP Basic Auth  
✅ **Session persistence** - Browser remembers credentials during session  

---

## 👥 Managing Multiple Users

To add more users, add multiple lines in the `basicauth` block:

```caddyfile
basicauth {
    # Admin user
    admin $2a$14$HASH_FOR_ADMIN
    
    # Developer user
    developer $2a$14$HASH_FOR_DEVELOPER
    
    # Manager user
    manager $2a$14$HASH_FOR_MANAGER
}
```

Each user gets their own username and password hash.

---

## 🧪 Testing

1. Visit `https://db.artistinfluence.com`
2. Browser should show a login prompt
3. Enter credentials:
   - Username: `admin`
   - Password: `[your password]`
4. After successful login, Supabase Studio loads normally

---

## 🔄 Alternative: IP Whitelist

If you want to restrict by IP address instead:

```caddyfile
db.artistinfluence.com {
    # Only allow specific IPs
    @blocked {
        not remote_ip 1.2.3.4 5.6.7.8
    }
    respond @blocked "Access Denied" 403
    
    reverse_proxy localhost:54323 {
        # ... rest of config
    }
}
```

---

## 📝 Complete Example with Strong Security

```caddyfile
# Supabase Studio - MAXIMUM SECURITY
db.artistinfluence.com {
    # HTTP Basic Authentication
    basicauth {
        admin $2a$14$YOUR_HASH_HERE
    }
    
    # Optional: Also restrict by IP (double protection)
    @blocked {
        not remote_ip YOUR_OFFICE_IP YOUR_HOME_IP
    }
    respond @blocked "Access Denied" 403
    
    # Rate limiting (prevent brute force)
    rate_limit {
        zone db_studio {
            key {remote_ip}
            events 10
            window 1m
        }
    }
    
    reverse_proxy localhost:54323 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        
        health_uri /
        health_interval 30s
        health_timeout 10s
    }
    
    # Security headers
    header X-Frame-Options "DENY"
    header X-Content-Type-Options "nosniff"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    
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

---

## 🚀 Quick Deployment Script

I'll create an automated script for you to run on production.

---

## 📞 Support

If you get locked out:
1. SSH into server
2. Edit Caddyfile to temporarily remove `basicauth` block
3. Reload Caddy: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`
4. Access Studio and note your credentials
5. Re-add auth and reload again

