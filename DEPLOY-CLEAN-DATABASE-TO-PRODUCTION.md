# 🚀 Deploy Clean Database to Production

This guide will deploy the clean 653 campaigns to production, removing all old data.

---

## 📋 Pre-Deployment Checklist

- ✅ Local database has exactly 653 campaigns
- ✅ All campaigns have correct `source` and `campaign_type`
- ✅ All campaigns are linked to clients (203 clients)
- ✅ All campaigns are linked to vendors (9 vendors)
- ✅ All campaigns have campaign_groups created
- ✅ RLS policies are in place

---

## 🎯 Deployment Steps

### Step 1: SSH into Production Server

```bash
ssh root@164.90.129.146
cd /root/arti-project
```

### Step 2: Backup Production Database (Safety First!)

```bash
# Create backup directory
mkdir -p backups

# Backup current database
docker exec supabase-db pg_dump -U postgres postgres > backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup was created
ls -lh backups/
```

### Step 3: Clean Production Database

Create and run this script on production:

```bash
cat > scripts/clean_production_database.js << 'EOF'
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanTable(tableName) {
  console.log(`🗑️  Cleaning ${tableName}...`);
  
  const { data: records } = await supabase
    .from(tableName)
    .select('id');
  
  if (!records || records.length === 0) {
    console.log(`   ✅ Already empty\n`);
    return 0;
  }
  
  console.log(`   Found ${records.length} records`);
  
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const ids = batch.map(r => r.id);
    
    await supabase.from(tableName).delete().in('id', ids);
    deleted += batch.length;
    
    if (deleted % 500 === 0 || deleted === records.length) {
      console.log(`   Progress: ${deleted}/${records.length}`);
    }
  }
  
  console.log(`   ✅ Deleted ${deleted} records\n`);
  return deleted;
}

async function main() {
  console.log('🧹 CLEANING PRODUCTION DATABASE\n');
  
  // Delete in correct order (respecting foreign keys)
  await cleanTable('campaign_playlists');
  await cleanTable('playlists');
  await cleanTable('campaign_groups');
  await cleanTable('spotify_campaigns');
  await cleanTable('clients');
  await cleanTable('vendors');
  
  console.log('✅ Production database cleaned!\n');
}

main().catch(console.error);
EOF

chmod +x scripts/clean_production_database.js
node scripts/clean_production_database.js
```

### Step 4: Upload Local Data to Production

From your **local machine**, upload the CSV:

```powershell
# Upload CSV
scp full-databse-chunk.csv root@164.90.129.146:/root/arti-project/

# Upload sync scripts
scp scripts/reset_to_csv_only.js root@164.90.129.146:/root/arti-project/scripts/
scp scripts/fix_campaign_source_type.js root@164.90.129.146:/root/arti-project/scripts/
scp scripts/sync_clients_from_csv.js root@164.90.129.146:/root/arti-project/scripts/
scp scripts/sync_vendors_from_csv.js root@164.90.129.146:/root/arti-project/scripts/
scp scripts/link_campaign_relationships.js root@164.90.129.146:/root/arti-project/scripts/
scp scripts/create_campaign_groups_from_campaigns.js root@164.90.129.146:/root/arti-project/scripts/
```

### Step 5: Run Sync Scripts on Production

Back in production SSH session:

```bash
# 1. Import 653 campaigns
node scripts/reset_to_csv_only.js --confirm

# 2. Fix source and type
node scripts/fix_campaign_source_type.js

# 3. Sync clients
node scripts/sync_clients_from_csv.js

# 4. Sync vendors
node scripts/sync_vendors_from_csv.js

# 5. Link relationships
node scripts/link_campaign_relationships.js

# 6. Create campaign groups
node scripts/create_campaign_groups_from_campaigns.js
```

### Step 6: Verify Production Data

```bash
# Check counts
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const campaigns = await supabase.from('spotify_campaigns').select('*', { count: 'exact', head: true });
const clients = await supabase.from('clients').select('*', { count: 'exact', head: true });
const vendors = await supabase.from('vendors').select('*', { count: 'exact', head: true });
const groups = await supabase.from('campaign_groups').select('*', { count: 'exact', head: true });

console.log('📊 Production Database:');
console.log(\`   Campaigns: \${campaigns.count}\`);
console.log(\`   Clients: \${clients.count}\`);
console.log(\`   Vendors: \${vendors.count}\`);
console.log(\`   Campaign Groups: \${groups.count}\`);
"
```

### Step 7: Apply RLS Policies

Make sure the RLS migration is applied:

```bash
cd supabase
npx supabase db reset --db-url "$DATABASE_URL"
# Or apply specific migration:
npx supabase db push --db-url "$DATABASE_URL"
```

### Step 8: Verify Production UI

1. Go to your production URL
2. Login
3. Navigate to Campaigns tab
4. Verify you see all 653 campaigns

---

## ✅ Success Criteria

- [ ] Production has exactly 653 campaigns
- [ ] Production has exactly 203 clients
- [ ] Production has exactly 9 vendors
- [ ] Production has exactly 653 campaign_groups
- [ ] All campaigns visible in production UI
- [ ] No old/stale data remaining

---

## 🔄 Quick Deployment Script

For faster deployment, use this all-in-one script:

```bash
# On local machine
./DEPLOY-TO-PRODUCTION-QUICK.sh
```

---

## 🆘 Rollback Plan

If something goes wrong:

```bash
# On production
cd /root/arti-project/backups
ls -lh  # Find your backup

# Restore
cat backup-YYYYMMDD-HHMMSS.sql | docker exec -i supabase-db psql -U postgres postgres

# Restart services
docker-compose restart
```

---

## 📝 Notes

- The deployment will take approximately 5-10 minutes
- There will be brief downtime during the sync
- All scripts use the same CSV as local: `full-databse-chunk.csv`
- Production will be an exact mirror of local database

---

**Last Updated**: October 24, 2025

