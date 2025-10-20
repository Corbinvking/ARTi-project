# 🔧 Resolve Caddyfile Conflict Now

## Current Situation
- Merge conflict in `caddy/Caddyfile.production`
- Need to keep BOTH changes:
  1. The `basicauth` block (from auth script)
  2. The port change `3010` (from git pull)

## Quick Resolution

```bash
cd /root/arti-marketing-ops

# Option 1: Just use the remote version (has port fix) and re-add auth
git checkout --theirs caddy/Caddyfile.production
git add caddy/Caddyfile.production

# Now the file has correct port (3010) but NO auth
# Let's add the auth block manually
```

## Add Auth Block Manually

```bash
nano caddy/Caddyfile.production
```

Find this section (around line 117):
```caddyfile
# Supabase Studio (Self-Hosted Admin Panel)
db.artistinfluence.com {
    reverse_proxy localhost:3010 {
```

Change it to:
```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin [YOUR_HASH_FROM_EARLIER]
    }
    
    reverse_proxy localhost:3010 {
```

**If you don't have the hash**, generate a new one:
```bash
docker exec supabase_caddy_arti-marketing-ops caddy hash-password
```

## Complete Fixed Section

Should look like this:

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin $2a$14$YOUR_ACTUAL_HASH_HERE
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

## After Editing

```bash
# Save: Ctrl+X, Y, Enter

# Add to git (resolve conflict)
git add caddy/Caddyfile.production

# Commit the resolution
git commit -m "Merge: add auth + port fix to Caddyfile"

# Reload Caddy
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile

# Test
curl -I https://db.artistinfluence.com
# Should return: HTTP/2 401
```

## Or: Extract Hash from Backup

Your auth script made a backup with the hash:

```bash
# Extract the hash from backup
grep -A 3 "basicauth" /root/arti-marketing-ops/caddy/Caddyfile.production.backup.20251020_193740

# Copy the hash line that looks like:
# admin $2a$14$xyz...
```

Then paste it into the main Caddyfile as shown above.

