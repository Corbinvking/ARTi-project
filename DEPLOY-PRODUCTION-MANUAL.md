# 🚀 Manual Production Deployment Guide

Follow these steps to deploy the clean 653 campaigns to production.

---

## Step 1: SSH into Production

```bash
ssh root@164.90.129.146
```

---

## Step 2: Check/Create Directory Structure

```bash
# Check current directory
pwd

# List what's there
ls -la

# If /root/arti-project doesn't exist, find the correct path
find /root -name "package.json" -type f 2>/dev/null | head -5

# Once you find it, cd to that directory
cd /path/to/your/project

# Create scripts directory if needed
mkdir -p scripts
```

---

## Step 3: Upload Files from Local Machine

**Open a NEW terminal on your local machine** (keep SSH open), then run:

```powershell
# Replace /path/to/project with the actual path from Step 2
$PROD_PATH = "/path/to/project"  # e.g., "/root/arti-marketing-ops"

# Upload CSV
scp full-databse-chunk.csv root@164.90.129.146:$PROD_PATH/

# Upload scripts
scp scripts/reset_to_csv_only.js root@164.90.129.146:$PROD_PATH/scripts/
scp scripts/fix_campaign_source_type.js root@164.90.129.146:$PROD_PATH/scripts/
scp scripts/sync_clients_from_csv.js root@164.90.129.146:$PROD_PATH/scripts/
scp scripts/sync_vendors_from_csv.js root@164.90.129.146:$PROD_PATH/scripts/
scp scripts/link_campaign_relationships.js root@164.90.129.146:$PROD_PATH/scripts/
scp scripts/create_campaign_groups_from_campaigns.js root@164.90.129.146:$PROD_PATH/scripts/
```

---

## Step 4: Verify Files Uploaded

**Back in the SSH terminal:**

```bash
# Check CSV is there
ls -lh full-databse-chunk.csv

# Check scripts are there
ls -lh scripts/*.js

# Should see all 6 scripts
```

---

## Step 5: Check Environment Variables

```bash
# Make sure Supabase vars are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# If they're empty, set them:
export NEXT_PUBLIC_SUPABASE_URL="your-production-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

---

## Step 6: Run Import Scripts (One at a Time)

```bash
# 1. Import 653 campaigns
node scripts/reset_to_csv_only.js --confirm

# Wait for completion, verify count:
# Should show: "Database now has exactly 653 campaigns"

# 2. Fix source and type
node scripts/fix_campaign_source_type.js

# Should show: "Successfully updated 653 campaigns"

# 3. Sync clients
node scripts/sync_clients_from_csv.js

# Should show: "Created: 203" or "Updated: 203"

# 4. Sync vendors
node scripts/sync_vendors_from_csv.js

# Should show: "Created: 9" or "Updated: 9"

# 5. Link relationships
node scripts/link_campaign_relationships.js

# Should show: "Linked: 642 clients, 612 vendors"

# 6. Create campaign groups
node scripts/create_campaign_groups_from_campaigns.js

# Should show: "Created: 653"
```

---

## Step 7: Verify Production Database

```bash
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const campaigns = await supabase.from('spotify_campaigns').select('*', { count: 'exact', head: true });
const clients = await supabase.from('clients').select('*', { count: 'exact', head: true });
const vendors = await supabase.from('vendors').select('*', { count: 'exact', head: true });
const groups = await supabase.from('campaign_groups').select('*', { count: 'exact', head: true });

console.log('Production Database:');
console.log(\`  Campaigns: \${campaigns.count}\`);
console.log(\`  Clients: \${clients.count}\`);
console.log(\`  Vendors: \${vendors.count}\`);
console.log(\`  Campaign Groups: \${groups.count}\`);
"
```

**Expected output:**
```
Production Database:
  Campaigns: 653
  Clients: 203
  Vendors: 9
  Campaign Groups: 653
```

---

## Step 8: Test Production UI

1. Go to your production URL
2. Navigate to Campaigns tab
3. Should see all 653 campaigns

---

## ✅ Success Checklist

- [ ] SSH connected to production
- [ ] Found correct project directory
- [ ] Files uploaded successfully
- [ ] Environment variables set
- [ ] All 6 scripts ran successfully
- [ ] Database counts match (653/203/9/653)
- [ ] Production UI shows campaigns

---

## 🆘 Troubleshooting

### Issue: Can't find project directory
```bash
# Search for it
find /root -name "supabase" -type d 2>/dev/null
find /root -name "package.json" -type f 2>/dev/null
```

### Issue: Module not found errors
```bash
# Make sure you're in the project root
cd /path/to/project

# Check if node_modules exists
ls -la | grep node_modules

# If not, install dependencies
npm install
```

### Issue: Supabase connection error
```bash
# Check Supabase is running
docker ps | grep supabase

# Check environment variables
cat .env.local | grep SUPABASE
```

---

## 📞 Need Help?

If you get stuck at any step, note:
1. Which step you're on
2. The exact error message
3. Output of `pwd` and `ls -la`

And I can help you troubleshoot!

