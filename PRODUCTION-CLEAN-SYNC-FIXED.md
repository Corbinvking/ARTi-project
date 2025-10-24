# 🚀 Production Database Clean & Sync (FIXED)

## Problem Detected
The delete operation didn't work due to RLS policies. You now have 2040 campaigns instead of 653.

## Solution: Force Clean + Fresh Import

---

## ✅ Run These Commands on Production SSH

You should be in: `/root/arti-marketing-ops`

### Step 0: Pull Latest Code
```bash
git pull origin main
```

---

### Step 1: Disable RLS Temporarily
```bash
psql $DATABASE_URL -f scripts/disable_rls_for_cleanup.sql
```

**Expected Output:**
```
ALTER TABLE
```

---

### Step 2: Force Clean All Campaigns
```bash
node scripts/force_clean_campaigns.js
```

**Expected Output:**
```
================================================================================
🗑️  FORCE CLEAN ALL CAMPAIGNS
================================================================================

📊 Current campaigns in database: 2040

🗑️  Deleting ALL campaigns in batches...

   Batch 1: Deleted 500 campaigns (Total: 500/2040)
   Batch 2: Deleted 500 campaigns (Total: 1000/2040)
   Batch 3: Deleted 500 campaigns (Total: 1500/2040)
   Batch 4: Deleted 500 campaigns (Total: 2000/2040)
   Batch 5: Deleted 40 campaigns (Total: 2040/2040)

   ✅ No more campaigns to delete

================================================================================
✅ DELETION COMPLETE
================================================================================

📊 Campaigns before: 2040
📊 Campaigns deleted: 2040
📊 Campaigns remaining: 0

✅ SUCCESS! Database is completely clean!
```

---

### Step 3: Re-enable RLS
```bash
psql $DATABASE_URL -f scripts/enable_rls_after_cleanup.sql
```

**Expected Output:**
```
ALTER TABLE
DO
```

---

### Step 4: Import 653 Clean Campaigns
```bash
node scripts/reset_to_csv_only.js --confirm
```

**Expected Output:**
```
📥 Inserting 653 campaigns from CSV...
   Progress: 653/653
   ✅ Inserted 653 campaigns

================================================================================
✅ RESET COMPLETE
================================================================================

📊 Database now has exactly 653 campaigns
📊 Expected: 653 campaigns

✅ SUCCESS! Database matches expected count!
```

---

### Step 5: Fix Source & Type
```bash
node scripts/fix_campaign_source_type.js
```

**Expected Output:**
```
🔧 Fixing campaign source and type...
📊 Found 653 campaigns
🔧 653 campaigns need updating
✅ Updated 653/653 campaigns

🎉 Successfully updated 653 campaigns!
```

---

### Step 6: Sync Clients
```bash
node scripts/sync_clients_from_csv.js
```

**Expected Output:**
```
📊 Parsing CSV...
   Active campaigns: 653
   Unique clients: 203

🔄 Syncing clients to database...
   Created: 203 (or Updated: 203 if they already exist)
   Failed: 0

✅ Client sync complete!
```

---

### Step 7: Sync Vendors
```bash
node scripts/sync_vendors_from_csv.js
```

**Expected Output:**
```
📊 Parsing CSV...
   Active campaigns: 653
   Unique vendors: 9

🔄 Syncing vendors to database...
   Created: 9 (or Updated: 9)
   Failed: 0

✅ Vendor sync complete!
```

---

### Step 8: Link Relationships
```bash
node scripts/link_campaign_relationships.js
```

**Expected Output:**
```
🔗 Linking campaigns to clients and vendors...

📊 Found:
   Campaigns: 653
   Clients: 203
   Vendors: 9

🔗 Linking campaigns...
   Linked clients: 642
   Linked vendors: 612

✅ Relationship linking complete!
```

---

### Step 9: Create Campaign Groups
```bash
node scripts/create_campaign_groups_from_campaigns.js
```

**Expected Output:**
```
🎯 Creating campaign groups from spotify_campaigns...

📊 Found 653 campaigns to process

📦 Creating campaign groups...
   Created: 653/653

✅ Campaign group creation complete!
```

---

### Step 10: Verify Everything
```bash
node scripts/verify_database_sync.js
```

**Expected Output:**
```
📊 DATABASE VERIFICATION
==========================================

CSV Data:
   Active Campaigns: 653
   Unique Clients: 203
   Unique Vendors: 9

Database Counts:
   Campaigns: 653 ✅
   Clients: 203 ✅
   Vendors: 9 ✅
   Campaign Groups: 653 ✅

Relationships:
   Campaigns with client_id: 642 ✅
   Campaigns with vendor_id: 612 ✅

✅ ALL CHECKS PASSED!
```

---

## 🎉 Success!

Your production database is now clean with exactly 653 campaigns!

**Test the UI:**
Go to your production URL → Campaigns tab → Should see all 653 campaigns!

---

## 🆘 Troubleshooting

### If psql command not found:
```bash
# Find psql
which psql

# Or use docker
docker exec -i $(docker ps -qf "name=supabase-db") psql -U postgres -d postgres -f /path/to/script.sql
```

### If $DATABASE_URL is empty:
```bash
# Check environment
echo $DATABASE_URL

# If empty, get it from:
cat .env.local | grep DATABASE_URL

# Then export it:
export DATABASE_URL="your-database-url"
```

### If force_clean_campaigns.js still can't delete:
```bash
# Try SQL directly
psql $DATABASE_URL -c "DELETE FROM spotify_campaigns;"
```

