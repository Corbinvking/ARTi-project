# Production Data Migration Plan

## 🎯 **Objective**

Migrate the 5,111 campaign records from local development to the production database on DigitalOcean.

## 📊 **Data Overview**

| Platform | Records | Status |
|----------|---------|--------|
| Spotify | 2,149 | ✅ Local CSV Ready |
| SoundCloud | 1,981 | ✅ Local CSV Ready |
| YouTube | 820 | ✅ Local CSV Ready |
| Instagram | 161 | ✅ Local CSV Ready |
| **Total** | **5,111** | **Ready for Migration** |

## 🔄 **Migration Methods**

### **Method 1: Direct CSV Upload (Recommended)**

Upload CSV files directly to production database using Supabase Studio.

#### **Steps:**
1. **Access Production Supabase Studio**:
   ```bash
   # Visit: https://db.artistinfluence.com
   # Login with admin credentials
   ```

2. **Upload CSV Files**:
   - Navigate to **Table Editor**
   - Select each campaign table (`spotify_campaigns`, `soundcloud_campaigns`, etc.)
   - Click **Insert** → **Upload CSV**
   - Select corresponding CSV file from `data/csv/` directory

3. **Verify Data**:
   ```sql
   SELECT COUNT(*) FROM spotify_campaigns;
   SELECT COUNT(*) FROM soundcloud_campaigns;
   SELECT COUNT(*) FROM youtube_campaigns;
   SELECT COUNT(*) FROM instagram_campaigns;
   ```

### **Method 2: Script-Based Migration**

Use a migration script to copy data from local to production.

#### **Create Migration Script:**

```javascript
// scripts/migrate-to-production.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Local Supabase (source)
const localSupabase = createClient(
  'http://127.0.0.1:54321',
  'LOCAL_SERVICE_ROLE_KEY_HERE'
);

// Production Supabase (destination)
const prodSupabase = createClient(
  'https://api.artistinfluence.com',
  'PRODUCTION_SERVICE_ROLE_KEY_HERE'
);

async function migrateCampaignData() {
  const tables = ['spotify_campaigns', 'soundcloud_campaigns', 'youtube_campaigns', 'instagram_campaigns'];
  
  for (const table of tables) {
    console.log(`\n🔄 Migrating ${table}...`);
    
    // Fetch from local
    const { data: localData, error: fetchError } = await localSupabase
      .from(table)
      .select('*');
    
    if (fetchError) {
      console.error(`❌ Failed to fetch ${table}:`, fetchError);
      continue;
    }
    
    console.log(`📊 Found ${localData.length} records in ${table}`);
    
    // Insert to production
    const { data: insertData, error: insertError } = await prodSupabase
      .from(table)
      .insert(localData);
    
    if (insertError) {
      console.error(`❌ Failed to insert ${table}:`, insertError);
    } else {
      console.log(`✅ Successfully migrated ${localData.length} records to ${table}`);
    }
  }
}

migrateCampaignData().catch(console.error);
```

### **Method 3: SQL Dump Migration**

Export local database and import to production.

#### **Steps:**
1. **Export Local Data**:
   ```bash
   # On your local machine
   docker exec supabase_db_arti-marketing-ops pg_dump -U postgres -t spotify_campaigns -t soundcloud_campaigns -t youtube_campaigns -t instagram_campaigns --data-only postgres > campaign_data.sql
   ```

2. **Transfer to Production**:
   ```bash
   # Copy to droplet
   scp campaign_data.sql root@YOUR_DROPLET_IP:/root/arti-marketing-ops/
   ```

3. **Import to Production**:
   ```bash
   # On the droplet
   docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -f /campaign_data.sql
   ```

## 🔐 **Authentication Setup**

The production database needs proper authentication for migration.

### **Get Production Credentials:**

1. **Service Role Key**:
   ```bash
   # On droplet, check Kong configuration
   cat supabase/kong.yml | grep service_role
   ```

2. **Database Connection**:
   ```bash
   # Production database URL
   postgresql://postgres:your-password@localhost:5432/postgres
   ```

## ⚠️ **Pre-Migration Checklist**

- [ ] ✅ Production backend is running and healthy
- [ ] ✅ Production database tables exist (run migrations)
- [ ] ✅ Local data is verified and clean
- [ ] ✅ Backup production database (if any existing data)
- [ ] ✅ Test connection to production database

## 🚀 **Migration Commands**

### **Quick Migration (Using Studio)**

```bash
# 1. Ensure production is running
curl -I https://api.artistinfluence.com/healthz

# 2. Access Studio
open https://db.artistinfluence.com

# 3. Upload CSVs from data/csv/ directory
# - spotify_campaigns.csv → spotify_campaigns table
# - soundcloud_campaigns.csv → soundcloud_campaigns table  
# - youtube_campaigns.csv → youtube_campaigns table
# - instagram_campaigns.csv → instagram_campaigns table
```

### **Verification Queries**

After migration, run these in Supabase Studio:

```sql
-- Check total records
SELECT 
  'spotify_campaigns' as table_name, COUNT(*) as records FROM spotify_campaigns
UNION ALL
SELECT 
  'soundcloud_campaigns' as table_name, COUNT(*) as records FROM soundcloud_campaigns  
UNION ALL
SELECT 
  'youtube_campaigns' as table_name, COUNT(*) as records FROM youtube_campaigns
UNION ALL
SELECT 
  'instagram_campaigns' as table_name, COUNT(*) as records FROM instagram_campaigns;

-- Expected Results:
-- spotify_campaigns: 2,149
-- soundcloud_campaigns: 1,981  
-- youtube_campaigns: 820
-- instagram_campaigns: 161
-- TOTAL: 5,111
```

## 🐛 **Troubleshooting**

### **Studio Access Issues**
```bash
# Check if Studio is accessible
curl -I https://db.artistinfluence.com
# Should return HTTP 307 redirect
```

### **Database Connection Issues**
```bash
# Check if database is running
docker exec supabase_db_arti-marketing-ops pg_isready -U postgres
```

### **Permission Issues**
- Ensure you're using admin/service role credentials
- Check RLS policies don't block data insertion

## 📋 **Post-Migration Tasks**

1. **Verify Frontend Access**: Test campaign data display in frontend
2. **Update Indexes**: Ensure database performance with indexes
3. **Test Filtering**: Verify campaign filtering and search works
4. **Backup Production**: Create backup after successful migration

## 🎯 **Success Criteria**

- ✅ All 5,111 records migrated successfully
- ✅ Frontend displays campaign data correctly  
- ✅ No data corruption or missing fields
- ✅ Production database performance is good
- ✅ Local development environment remains functional

---

**Next Step**: Choose Migration Method 1 (CSV Upload via Studio) for simplicity and reliability.
