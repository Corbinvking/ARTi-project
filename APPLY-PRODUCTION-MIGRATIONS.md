# Apply Production Database Migrations

## 🔍 Required Migrations

Based on the code changes, these database migrations need to be applied to production:

### **Migration 027: Add source and campaign_type columns**
- File: `supabase/migrations/027_add_source_campaign_type_columns.sql`
- **Status**: ⚠️ Needs verification

### **Migration 028: Create campaign_groups table** ✨ CRITICAL
- File: `supabase/migrations/028_create_campaign_groups.sql`
- **Status**: ⚠️ MUST BE APPLIED
- **What it does**:
  - Creates `campaign_groups` table
  - Adds `campaign_group_id` to `spotify_campaigns`
  - Adds stream metrics columns (`plays_last_7d`, `plays_last_3m`, `plays_last_12m`, `playlist_adds`, `saves`)
  - Creates helper functions (`get_campaign_group_with_songs`, `get_client_campaigns`)
  - Sets up RLS policies

### **Migration 029: Create campaign_playlists table**
- File: `supabase/migrations/029_create_campaign_playlists_table.sql`
- **Status**: ⚠️ MUST BE APPLIED (if using playlist features)
- **What it does**:
  - Creates `campaign_playlists` table for tracking playlist performance
  - Sets up indexes and RLS policies

### **Migration 031: Link vendors to campaigns**
- File: `supabase/migrations/031_link_vendors_to_campaigns.sql`
- **Status**: ⚠️ Check if needed
- Adds `vendor_id` to `spotify_campaigns`

---

## 🚀 How to Apply Migrations

### **Option 1: Via SSH (Recommended for Production)**

```bash
# SSH into production
ssh root@164.90.129.146

# Navigate to project
cd /root/arti-marketing-ops

# Check current migrations
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\dt"

# Apply migrations one by one
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/027_add_source_campaign_type_columns.sql

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/028_create_campaign_groups.sql

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/029_create_campaign_playlists_table.sql
```

### **Option 2: Check What's Already Applied**

```bash
# SSH into production
ssh root@164.90.129.146
cd /root/arti-marketing-ops

# Check if campaign_groups table exists
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_groups"

# Check if campaign_playlists table exists
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_playlists"

# Check if campaign_group_id column exists in spotify_campaigns
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d spotify_campaigns" | grep campaign_group_id

# Check if stream metrics columns exist
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d spotify_campaigns" | grep plays_last
```

---

## ⚠️ IMPORTANT: Migration 028 is CRITICAL

The **CreateCampaignWizard** and **status editing** features **will NOT work** without Migration 028 because:

1. ✅ Creates `campaign_groups` table (where campaigns are stored)
2. ✅ Adds `campaign_group_id` FK to `spotify_campaigns` (links songs to campaigns)
3. ✅ The frontend queries `campaign_groups` for the campaign list
4. ✅ Status changes update `campaign_groups.status`
5. ✅ Campaign creation inserts into `campaign_groups` first, then `spotify_campaigns`

---

## 🔍 Verification Commands

After applying migrations, verify they worked:

```bash
# Check campaign_groups table structure
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_groups"

# Check for any existing campaign groups
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campaign_groups;"

# Check spotify_campaigns has new columns
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'spotify_campaigns' AND column_name IN ('campaign_group_id', 'plays_last_7d', 'plays_last_3m', 'plays_last_12m');"

# Test the helper functions
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\df get_campaign_group_with_songs"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\df get_client_campaigns"
```

---

## 📊 Expected Results

After applying migrations:

### **campaign_groups table:**
```sql
CREATE TABLE campaign_groups (
  id UUID PRIMARY KEY,
  org_id UUID,
  client_id UUID,
  name TEXT NOT NULL,
  artist_name TEXT,
  total_goal INTEGER DEFAULT 0,
  total_budget DECIMAL(10,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'Draft',
  invoice_status TEXT DEFAULT 'Not Invoiced',
  salesperson TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **spotify_campaigns additions:**
```sql
ALTER TABLE spotify_campaigns ADD COLUMN:
- campaign_group_id UUID (FK to campaign_groups)
- plays_last_7d INTEGER DEFAULT 0
- plays_last_3m INTEGER DEFAULT 0
- plays_last_12m INTEGER DEFAULT 0
- playlist_adds INTEGER DEFAULT 0
- saves INTEGER DEFAULT 0
```

---

## 🛠️ Troubleshooting

### **If migration fails:**
```bash
# Check for error details
docker logs supabase_db_arti-marketing-ops --tail 100

# Check if tables already exist
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\dt campaign*"

# If table exists but needs updates, migration might be partially applied
# Check specific columns
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_groups"
```

### **If "table already exists" error:**
This means migration was already applied (or partially applied). Verify structure matches expected schema above.

### **If foreign key constraint fails:**
This could happen if there's existing data with invalid references. Check data integrity first.

---

## ✅ Migration Checklist

Run these checks after migration:

- [ ] `campaign_groups` table exists
- [ ] `campaign_playlists` table exists
- [ ] `spotify_campaigns.campaign_group_id` column exists
- [ ] `spotify_campaigns.plays_last_7d` column exists
- [ ] `get_campaign_group_with_songs` function exists
- [ ] `get_client_campaigns` function exists
- [ ] RLS policies are enabled
- [ ] Indexes are created

---

## 🎯 Next Steps After Migration

1. **Restart services** (if migrations were applied):
   ```bash
   docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart
   ```

2. **Test Campaign Creation**:
   - Go to https://app.artistinfluence.com
   - Click "Create Campaign"
   - Complete the 4-step wizard
   - Verify campaign appears in list

3. **Test Status Editing**:
   - Click on any status badge
   - Change status
   - Verify it updates in database

4. **Check database**:
   ```bash
   docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT id, name, status FROM campaign_groups LIMIT 5;"
   ```

---

## 🚨 CRITICAL

**Do NOT proceed with testing the new features until Migration 028 is applied!**

The app will throw errors because it's trying to query/insert into tables that don't exist yet.

---

**Ready to apply migrations? Follow the commands above step by step.**

