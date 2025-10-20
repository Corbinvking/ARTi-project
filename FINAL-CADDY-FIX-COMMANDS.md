# 🎯 Final Commands - Copy & Paste

Run these commands on production **exactly as shown**:

## Step 1: Use Remote Version (Has Correct Port 3010)

```bash
cd /root/arti-marketing-ops
git checkout --theirs caddy/Caddyfile.production
```

## Step 2: Add Auth Block with Your Hash

```bash
# This will insert the basicauth block with your actual hash
sed -i '/db.artistinfluence.com {/a\    basicauth {\n        admin $2a$14$j0uiD/1wIHD9bR3.n7Fp8eYLm1nzQ1xEzaZZ1cK1YqxRmDZzCzK9y\n    }\n' caddy/Caddyfile.production
```

## Step 3: Verify It Looks Correct

```bash
# Check that both auth AND correct port are there
grep -A 10 "db.artistinfluence.com" caddy/Caddyfile.production
```

Should show:
```
db.artistinfluence.com {
    basicauth {
        admin $2a$14$j0uiD/1wIHD9bR3.n7Fp8eYLm1nzQ1xEzaZZ1cK1YqxRmDZzCzK9y
    }
    
    reverse_proxy localhost:3010 {
```

## Step 4: Resolve Git Conflict

```bash
git add caddy/Caddyfile.production
git commit -m "Merge: add basicauth + port 3010 fix"
```

## Step 5: Reload Caddy

```bash
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

## Step 6: Test

```bash
curl -I https://db.artistinfluence.com
```

Expected: `HTTP/2 401` ✅

## If Step 2 sed command doesn't work, do it manually:

```bash
nano caddy/Caddyfile.production
```

Find:
```caddyfile
db.artistinfluence.com {
    reverse_proxy localhost:3010 {
```

Change to:
```caddyfile
db.artistinfluence.com {
    basicauth {
        admin $2a$14$j0uiD/1wIHD9bR3.n7Fp8eYLm1nzQ1xEzaZZ1cK1YqxRmDZzCzK9y
    }
    
    reverse_proxy localhost:3010 {
```

Save: `Ctrl+X`, `Y`, `Enter`

