# 🔍 Debug: Auth Not Working

## Issue
Studio loads without login prompt at `https://db.artistinfluence.com`

## Possible Causes

### 1. Browser Cached the Page
Try these:
```bash
# Hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Or open in Incognito/Private mode
Ctrl + Shift + N (Chrome)
Ctrl + Shift + P (Firefox)
```

### 2. Caddy Routing Issue
The auth might not be applied to the correct route. Let's check:

```bash
# On production, verify the Caddyfile
cat /root/arti-marketing-ops/caddy/Caddyfile.production | grep -A 30 "db.artistinfluence.com"

# Check if basicauth is there
grep -A 5 "basicauth" /root/arti-marketing-ops/caddy/Caddyfile.production
```

### 3. Caddy Not Using Updated Config
```bash
# Check which config Caddy is using
docker exec supabase_caddy_arti-marketing-ops caddy validate --config /etc/caddy/Caddyfile

# Check if the file inside container has auth
docker exec supabase_caddy_arti-marketing-ops cat /etc/caddy/Caddyfile | grep -A 5 "basicauth"

# Reload again to be sure
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

### 4. Accessing Wrong URL
Make sure you're accessing:
- ✅ `https://db.artistinfluence.com` (should have auth)
- ❌ `http://localhost:54323` (direct, no auth)
- ❌ Internal IP or other routes

### 5. Port 54323 Exposed Directly
Check if Studio port is exposed publicly:
```bash
# Check what ports are exposed
docker ps | grep studio

# Check if 54323 is accessible from outside
netstat -tlnp | grep 54323 || ss -tlnp | grep 54323
```

If port 54323 is exposed as `0.0.0.0:54323`, anyone can bypass Caddy!

## Quick Diagnostic Commands

Run these on production:

```bash
echo "=== 1. Check Caddyfile has basicauth ==="
grep -A 5 "basicauth" /root/arti-marketing-ops/caddy/Caddyfile.production

echo ""
echo "=== 2. Check Caddy container config ==="
docker exec supabase_caddy_arti-marketing-ops cat /etc/caddy/Caddyfile | grep -B 2 -A 10 "db.artistinfluence.com"

echo ""
echo "=== 3. Check port exposure ==="
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep studio

echo ""
echo "=== 4. Test auth with curl ==="
curl -I https://db.artistinfluence.com

echo ""
echo "=== 5. Check Caddy logs ==="
docker logs supabase_caddy_arti-marketing-ops --tail 50
```

## Expected Outputs

### ✅ Correct (Auth Working):
```bash
# curl should return 401
HTTP/2 401
www-authenticate: Basic realm="restricted"

# Port should NOT be exposed publicly
54323/tcp  # No 0.0.0.0 prefix
```

### ❌ Problem (Auth Not Working):
```bash
# curl returns 200
HTTP/2 200

# Port is exposed publicly
0.0.0.0:54323->3000/tcp  # Anyone can access directly!
```

## Most Likely Issue: Port Exposure

If you see `0.0.0.0:54323` in docker ps, that's the problem!

The Studio container is exposed directly, bypassing Caddy.

### Fix: Remove Port Exposure

Edit docker-compose.production.yml:

```yaml
# BEFORE (BAD - exposes port):
studio:
  image: supabase/studio:latest
  ports:
    - "54323:3000"  # ❌ REMOVE THIS

# AFTER (GOOD - only Caddy can access):
studio:
  image: supabase/studio:latest
  # ports removed - only accessible via Caddy
```

Then restart:
```bash
docker compose -f docker-compose.production.yml up -d studio
```

## Test Again

After fixing:
1. Clear browser cache
2. Open `https://db.artistinfluence.com`
3. Should see login prompt
4. Direct access to port 54323 should fail

