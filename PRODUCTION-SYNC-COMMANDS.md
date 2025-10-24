# 🚀 Production Database Sync Commands

Run these commands **one at a time** on your production server SSH terminal.

You should already be in: `/root/arti-marketing-ops`

---

## ✅ Step 1: Reset Database & Import 653 Campaigns

```bash
node scripts/reset_to_csv_only.js --confirm
```

**Expected Output:**
```
🗑️  Deleting ALL campaigns from spotify_campaigns...
   Found X campaigns to delete
   ✅ All campaigns deleted

📥 Importing campaigns from CSV...
   ✅ Processed 653 campaigns
   
✅ Database now has exactly 653 campaigns!
```

---

## ✅ Step 2: Fix Source & Campaign Type

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

## ✅ Step 3: Sync Clients

```bash
node scripts/sync_clients_from_csv.js
```

**Expected Output:**
```
📊 Parsing CSV...
   Active campaigns: 653
   Unique clients: 203

🔄 Syncing clients to database...
   Created: 203
   Updated: 0
   Failed: 0

✅ Client sync complete!
```

---

## ✅ Step 4: Sync Vendors

```bash
node scripts/sync_vendors_from_csv.js
```

**Expected Output:**
```
📊 Parsing CSV...
   Active campaigns: 653
   Unique vendors: 9

🔄 Syncing vendors to database...
   Created: 9
   Updated: 0
   Failed: 0

✅ Vendor sync complete!
```

---

## ✅ Step 5: Link Campaigns to Clients & Vendors

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
   No client match: ~11
   No vendor match: ~41

✅ Relationship linking complete!
```

---

## ✅ Step 6: Create Campaign Groups

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

## ✅ Step 7: Apply RLS Migration

```bash
cd supabase
npx supabase migration up
cd ..
```

**Expected Output:**
```
Applying migration 035_add_spotify_campaigns_rls.sql...
✅ Migration applied successfully
```

---

## ✅ Step 8: Verify Everything

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

## 🎉 Done!

Your production database now has:
- ✅ 653 clean campaigns
- ✅ 203 clients
- ✅ 9 vendors
- ✅ 653 campaign groups
- ✅ All relationships linked
- ✅ RLS policies applied

### Test the UI:
Go to your production URL and check the Campaigns tab - you should see all 653 campaigns!

---

## 🆘 Troubleshooting

### If you get "MODULE_NOT_FOUND" error:
```bash
# Make sure you're in the right directory
pwd
# Should show: /root/arti-marketing-ops

# Check if scripts exist
ls -la scripts/ | grep reset_to_csv
```

### If you get Supabase connection error:
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# If empty, check .env.local
cat .env.local | grep SUPABASE
```

### If counts don't match:
```bash
# Re-run the specific script that failed
# For example, if campaign groups failed:
node scripts/create_campaign_groups_from_campaigns.js
```

