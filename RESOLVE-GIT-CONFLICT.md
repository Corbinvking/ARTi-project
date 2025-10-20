# 🔧 Resolve Git Conflict on Production

## Issue
Local changes to `scripts/add-studio-auth.sh` conflict with remote updates.

## Quick Fix - Option 1: Stash and Pull (Recommended)

```bash
# Stash your local changes
git stash

# Pull latest code
git pull origin main

# Done! The updated script is now in place
```

---

## Quick Fix - Option 2: Force Overwrite

```bash
# Discard local changes and use remote version
git reset --hard HEAD
git pull origin main

# Done! Fresh copy from GitHub
```

---

## Quick Fix - Option 3: Skip Git, Download Directly

```bash
# Just download the fixed script
curl -o scripts/add-studio-auth.sh https://raw.githubusercontent.com/Corbinvking/ARTi-project/main/scripts/add-studio-auth.sh

# Make it executable
chmod +x scripts/add-studio-auth.sh

# Run it
./scripts/add-studio-auth.sh
```

---

## ⚡ Fastest: Run Without Git

You don't even need to pull! Just run these 3 manual commands:

### **Step 1: Generate Hash**
```bash
docker exec supabase_caddy_arti-marketing-ops caddy hash-password
```
Enter password, copy the hash

### **Step 2: Edit Caddyfile**
```bash
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

Find line ~117:
```caddyfile
# Supabase Studio (Self-Hosted Admin Panel)
db.artistinfluence.com {
    reverse_proxy localhost:54323 {
```

Change to:
```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin $2a$14$YOUR_HASH_FROM_STEP_1
    }
    
    reverse_proxy localhost:54323 {
```

Save: `Ctrl+X`, `Y`, `Enter`

### **Step 3: Reload**
```bash
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

✅ **Done!** Test: `https://db.artistinfluence.com`

---

## 🎯 Recommended Approach

**Use Option 2 (Force Overwrite)** - cleanest:

```bash
cd /root/arti-marketing-ops
git reset --hard HEAD
git pull origin main
./scripts/add-studio-auth.sh
```

This gets you the latest fixed script and runs it automatically.

