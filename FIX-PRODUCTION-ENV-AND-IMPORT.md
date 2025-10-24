# 🔧 Fix Production Environment & Import Data

## Problem:
Production import is failing with: `Expected 3 parts in JWT; got 1`

This means the Supabase environment variables aren't set on production.

---

## ✅ Solution: Set Environment Variables on Production

### Step 1: SSH to Production
```bash
ssh root@164.90.129.146
cd /root/arti-marketing-ops
```

### Step 2: Set Environment Variables
```bash
# Source the env setup script we created earlier
source scripts/set_production_env.sh
```

This will automatically set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Run Import Again
```bash
node scripts/import-roster-scraped-data.js
```

---

## 🔄 Alternative: Manual Export

If the script doesn't work, manually export the variables:

```bash
# Get the keys from supabase status
supabase status

# Then export them
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

# Then run import
node scripts/import-roster-scraped-data.js
```

---

## 📊 Expected Results:

After setting env vars correctly, you should see:
```
✅ Data files processed: 79
✅ Campaigns updated: 69
⚠️  Campaigns not found: 10
✅ Playlists processed: 1706
```

---

## 💡 Quick Commands:

```bash
# SSH to production
ssh root@164.90.129.146

# Go to project
cd /root/arti-marketing-ops

# Set environment
source scripts/set_production_env.sh

# Run import
node scripts/import-roster-scraped-data.js
```

---

That's it! Once the environment is set, the import will work just like it did locally! 🚀

