# 🔧 FOUND THE PROBLEM: Port Mismatch!

## Issue
- **Caddyfile proxies to**: `localhost:54323`
- **Studio is actually on**: `localhost:3010`
- **Result**: Caddy can't reach Studio, auth doesn't apply

## Fix: Update Caddyfile to Use Correct Port

### Step 1: Edit Caddyfile

```bash
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

### Step 2: Find and Replace Port

Find this line (around line 118):
```caddyfile
reverse_proxy localhost:54323 {
```

Change to:
```caddyfile
reverse_proxy localhost:3010 {
```

### Step 3: Save and Reload

```bash
# Save: Ctrl+X, Y, Enter

# Reload Caddy
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

## Complete Fixed Section

Your `db.artistinfluence.com` section should look like this:

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin $2a$14$YOUR_HASH_HERE
    }
    
    reverse_proxy localhost:3010 {
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

## Quick One-Liner Fix

```bash
# Backup, fix port, reload
cd /root/arti-marketing-ops
cp caddy/Caddyfile.production caddy/Caddyfile.production.backup-port-fix
sed -i 's/localhost:54323/localhost:3010/g' caddy/Caddyfile.production
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

## Test After Fix

```bash
# Should return 401 Unauthorized
curl -I https://db.artistinfluence.com

# Should show correct proxy target
grep "reverse_proxy" /root/arti-marketing-ops/caddy/Caddyfile.production | grep db -A 1
```

## Then in Browser

1. Hard refresh: `Ctrl + Shift + R`
2. Or open incognito: `Ctrl + Shift + N`
3. Go to: `https://db.artistinfluence.com`
4. **NOW you should see the login prompt!** ✅

---

## Why This Happened

The docker-compose file exposes Studio on port 3010:
```yaml
studio:
  ports:
    - "3010:3000"
```

But the Caddyfile was trying to connect to 54323 (probably a Supabase default).

After fixing the port, Caddy will:
1. ✅ Receive request at `https://db.artistinfluence.com`
2. ✅ Check basicauth credentials
3. ✅ Proxy to `localhost:3010` (Studio)
4. ✅ Return Studio UI

