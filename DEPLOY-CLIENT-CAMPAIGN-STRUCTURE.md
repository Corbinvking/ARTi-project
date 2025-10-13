# 🚀 Deploy Client-Campaign Structure to Production

## 📋 **Overview**

This guide will deploy the client-campaign relational structure to production, ensuring that when you click on a client, all their campaigns are displayed.

---

## ✅ **What's Changed Locally**

1. **Database Structure**: Added `client_id` column to `spotify_campaigns` table
2. **Client Relationships**: 428 campaigns linked to 92 clients  
3. **Frontend Updates**: Modified hooks to fetch campaigns for each client
4. **Data Clean-up**: Campaign names properly populated from CSV

---

## 🔧 **Production Deployment Steps**

### **Step 1: Deploy Database Migration**

SSH into the droplet and apply the migration:

```bash
ssh root@164.90.129.146

cd /root/arti-marketing-ops

# Move the conflicting file
mv apps/api/package-lock.json apps/api/package-lock.json.backup

# Pull latest changes
git pull origin main

# Apply the new migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/025_refactor_clients_campaigns_structure.sql
```

**Expected Output:**
```
CREATE TABLE
ALTER TABLE
CREATE INDEX
ALTER TABLE
CREATE POLICY
... (multiple CREATE POLICY statements)
CREATE FUNCTION
CREATE FUNCTION
COMMENT
GRANT
```

### **Step 2: Reload Campaign Data**

The production database needs fresh campaign data with proper names:

```bash
# Set production environment variables
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Load campaign data
node scripts/load-all-platform-data.js
```

**Expected Output:**
```
📂 Processing: Spotify Playlisting-All Campaigns.csv → spotify_campaigns
✅ spotify_campaigns: 2149/2149 rows loaded
✅ soundcloud_campaigns: 1981/1981 rows loaded
✅ youtube_campaigns: 820/820 rows loaded
✅ instagram_campaigns: 161/161 rows loaded
🎉 TOTAL LOADED: 5111 campaigns across all platforms
```

### **Step 3: Link Campaigns to Clients**

Now link the campaigns to their respective clients:

```bash
# Run the client-campaign linking script
node scripts/fix-client-campaign-linking.js
```

**Expected Output:**
```
📊 Found 92 clients
🔍 Created client map with 323 variations
📋 Found [X] unlinked campaigns
✅ Successfully linked: [X]
✅ Final verification: 428 campaigns now linked to clients
```

### **Step 4: Verify the Results**

Check that campaigns are properly linked:

```bash
# Check total clients
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM clients;"

# Check linked campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM spotify_campaigns WHERE client_id IS NOT NULL;"

# Check top clients by campaign count
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT c.name, COUNT(sc.id) as campaign_count FROM clients c LEFT JOIN spotify_campaigns sc ON c.id = sc.client_id GROUP BY c.id, c.name ORDER BY campaign_count DESC LIMIT 10;"
```

**Expected Output:**
```
 count 
-------
    92

 count 
-------
   428

    client_name     | campaign_count 
--------------------+----------------
 Pharaoh Phonix     |             34
 Hitskope           |             19
 Filthy             |             18
 Phuture Collective |             16
 ...
```

### **Step 5: Deploy Frontend Changes**

The frontend changes are already deployed via Vercel automatically when you push to GitHub. The changes include:

- ✅ Updated `useClients.ts` to fetch campaign counts
- ✅ Updated `useCampaigns.ts` to fetch campaigns without restrictive filtering
- ✅ Updated `ClientDetailsModal.tsx` to display campaigns correctly

**Vercel will automatically deploy these changes** when you push to `main`.

---

## 🧪 **Testing in Production**

Once deployed, test the functionality:

1. **Go to**: `https://app.artistinfluence.com/spotify/clients`
2. **Click on "Hitskope"** (should show 19 campaigns)
3. **Click on "Pharaoh Phonix"** (should show 34 campaigns)  
4. **Click on "Filthy"** (should show 18 campaigns)

Each client should now display all their campaigns with:
- ✅ Campaign names
- ✅ Status badges
- ✅ Start dates
- ✅ Budget/sale price
- ✅ Actions (unassign)

---

## 📊 **Database Changes Summary**

### **New Tables:**
- `clients` - Client entities (92 total)

### **Modified Tables:**
- `spotify_campaigns` - Added `client_id` foreign key column

### **New Functions:**
- `get_client_with_campaigns(uuid)` - Get client with all their campaigns
- `get_clients_with_campaign_counts()` - Get all clients with campaign statistics

### **Indexes:**
- `idx_spotify_campaigns_client_id` - For fast client campaign lookups

---

## ⚠️ **Important Notes**

1. **Data Integrity**: The migration adds a foreign key relationship, so campaigns can only reference valid clients
2. **Null Values**: Campaigns without a matching client will have `client_id = NULL`
3. **Performance**: Indexes are created for optimal query performance
4. **RLS Policies**: Row Level Security policies are applied for proper access control

---

## 🔄 **Rollback Plan** (if needed)

If something goes wrong:

```bash
# Remove client_id foreign key
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS client_id CASCADE;"

# Drop clients table
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "DROP TABLE IF EXISTS clients CASCADE;"
```

---

## ✅ **Success Criteria**

After deployment, you should see:

- ✅ **92 clients** in the Clients tab
- ✅ **428 campaigns** linked to clients
- ✅ When clicking a client, their campaigns display in the modal
- ✅ Campaign names, statuses, dates, and budgets are visible
- ✅ No "No campaigns assigned" messages for clients with campaigns

---

## 📚 **Files Modified**

### **Database:**
- `supabase/migrations/025_refactor_clients_campaigns_structure.sql`

### **Scripts:**
- `scripts/fix-client-campaign-linking.js` - Links campaigns to clients
- `scripts/load-all-platform-data.js` - Reloads campaign data

### **Frontend:**
- `apps/frontend/app/(dashboard)/spotify/stream-strategist/hooks/useClients.ts`
- `apps/frontend/app/(dashboard)/spotify/stream-strategist/hooks/useCampaigns.ts`  
- `apps/frontend/app/(dashboard)/spotify/stream-strategist/components/ClientDetailsModal.tsx`

---

## 🎯 **Quick Deploy Commands**

```bash
# SSH to droplet
ssh root@164.90.129.146

# Navigate to project
cd /root/arti-marketing-ops

# Backup conflicting file
mv apps/api/package-lock.json apps/api/package-lock.json.backup

# Pull changes
git pull origin main

# Apply migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/025_refactor_clients_campaigns_structure.sql

# Set environment
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Load data
node scripts/load-all-platform-data.js

# Link clients to campaigns
node scripts/fix-client-campaign-linking.js

# Verify
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT c.name, COUNT(sc.id) as campaign_count FROM clients c LEFT JOIN spotify_campaigns sc ON c.id = sc.client_id GROUP BY c.id, c.name ORDER BY campaign_count DESC LIMIT 10;"
```

---

**The frontend will auto-deploy via Vercel when you push to GitHub. No manual frontend deployment needed!** 🎉
