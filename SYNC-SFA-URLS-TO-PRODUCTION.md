# 🔗 Sync SFA URLs to Production

## 🎯 **Problem:**
Campaigns have stream data but missing "Spotify for Artists Link" in the UI.

## ✅ **Solution:**
Run this script to sync SFA URLs to production database.

---

## 🚀 **Run on Production:**

```bash
# SSH to production
ssh root@164.90.129.146
cd /root/arti-marketing-ops

# Get environment variables
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
SERVICE_KEY=$(supabase status | grep "Secret key" | awk '{print $3}')

# Run sync script
NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
node scripts/sync_sfa_urls_to_production.js
```

---

## 📋 **What It Does:**

1. Reads latest roster scraping results
2. Extracts all SFA URLs (track IDs → SFA URLs)
3. Finds matching campaigns in database
4. Updates `spotify_campaigns.sfa` column
5. Shows progress and summary

---

## 📊 **Expected Output:**

```
🔗 SYNC SFA URLs TO PRODUCTION
================================================================================

📖 Reading: roster_scraping_results_20251024_022942.json

✅ Found 121 SFA URLs to sync

   ✅ Updated: Sunni D - Filthy
   ✅ Updated: Traveler - Ocean Born
   ...
   Progress: 121/121

================================================================================
✅ SYNC COMPLETE
================================================================================

📊 Results:
   ✅ Updated: 64
   ℹ️  Already set: 22
   ⚠️  Not found: 35
   ❌ Failed: 0
   📊 Total: 121
```

---

## ✅ **Verify:**

After running, check a campaign in the UI:
- Should now see "Spotify for Artists Link" section
- Link should open to SFA stats page

---

## 🔄 **Alternative Method (Upload Local Data):**

If the script doesn't work, you can upload the roster results and run locally:

```bash
# On local machine
scp roster_scraper/data/roster_scraping_results_*.json root@164.90.129.146:/root/arti-marketing-ops/roster_scraper/data/
```

Then run the script on production.

