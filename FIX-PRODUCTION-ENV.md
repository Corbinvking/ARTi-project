# 🔧 Fix Production Environment Issue

## Issue

The deployment script is looking for `.env` file but it doesn't exist in `/root/arti-marketing-ops`.

## Solution

The environment variables are likely in a different location or need to be set manually.

---

## Option 1: Find Existing .env File

```bash
# Search for .env files
find /root -name ".env" -type f 2>/dev/null

# Or check docker-compose.yml for env_file location
cat docker-compose.yml | grep env_file

# Or check if using .env.local
ls -la | grep env
```

## Option 2: Set Environment Variable Manually

The deployment needs `SUPABASE_SERVICE_ROLE_KEY`. You can set it manually:

### Step 1: Get the Service Role Key

**From Kong config:**
```bash
cd /root/arti-marketing-ops
cat supabase/kong.yml | grep anon
```

**From Docker Compose:**
```bash
cat docker-compose.yml | grep SERVICE_ROLE_KEY
```

**From running container:**
```bash
docker exec supabase_kong_arti-marketing-ops env | grep SERVICE_ROLE_KEY
```

**From Supabase Studio (if accessible):**
- Go to http://your-server:54323
- Settings → API
- Look for "service_role" key

### Step 2: Set the Variable and Continue

```bash
# Export the key (replace with actual key)
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key-here"

# Verify it's set
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Continue with Data Import Manually

Since the automated script failed at Phase 4, you can run the data import steps manually:

```bash
cd /root/arti-marketing-ops

# Make sure env vars are set
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# Run import scripts
echo "✅ Importing CSV data..."
node scripts/import-csv-campaigns-full.js

echo "✅ Fixing duplicates..."
node scripts/fix-duplicates-batch.js

echo "✅ Linking vendors..."
node scripts/fix-duplicates-and-vendors.js

echo "✅ Creating playlists..."
node scripts/create-playlists-from-csv-data.js

echo "✅ Fixing statuses..."
node scripts/fix-csv-campaign-statuses.js

echo "✅ Creating missing vendors..."
node scripts/create-missing-vendor-and-playlists.js

echo "✅ Syncing playlists..."
node scripts/sync-campaign-playlists-to-playlists-v2.js

# Restart services
docker-compose restart
```

---

## Option 3: Create .env File

If you have the service role key, create the `.env` file:

```bash
cd /root/arti-marketing-ops

# Create .env file
cat > .env << 'EOF'
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
EOF

# Then re-run the deployment script
./DEPLOY-TO-PRODUCTION.sh
```

---

## How to Get Service Role Key

### Method 1: From Docker Compose

```bash
cd /root/arti-marketing-ops
cat docker-compose.yml | grep -A 5 SERVICE_ROLE_KEY
```

### Method 2: From Kong Configuration

```bash
cd /root/arti-marketing-ops
cat supabase/kong.yml
```

Look for the JWT secret or service role token.

### Method 3: From Supabase Init Files

```bash
# Check initialization files
cat supabase/.env 2>/dev/null
cat supabase/config.toml 2>/dev/null
```

### Method 4: Generate New One (if needed)

If you can't find it and need to generate a new one:

```bash
# Generate new JWT secret (use this as service role key)
openssl rand -base64 32
```

**Note:** If you generate a new key, you'll need to update Kong and GoTrue configs too.

---

## Quick Fix (Recommended)

Since migrations are already applied (Phase 3 succeeded), you just need to run the data import scripts:

```bash
# 1. Find the service role key
docker exec supabase_kong_arti-marketing-ops env | grep JWT

# 2. Export it
export SUPABASE_SERVICE_ROLE_KEY="<paste-key-here>"
export SUPABASE_URL="http://127.0.0.1:54321"

# 3. Run imports one by one
cd /root/arti-marketing-ops

node scripts/import-csv-campaigns-full.js
node scripts/fix-duplicates-batch.js
node scripts/fix-duplicates-and-vendors.js
node scripts/create-playlists-from-csv-data.js
node scripts/fix-csv-campaign-statuses.js
node scripts/create-missing-vendor-and-playlists.js
node scripts/sync-campaign-playlists-to-playlists-v2.js

# 4. Restart services
docker-compose restart

# 5. Verify
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM clients;"
```

---

## Verification After Fix

Once you've set the key and run the scripts:

```bash
# Check counts
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  'Clients' as entity, COUNT(*)::text as count FROM clients
UNION ALL
SELECT 'Campaigns', COUNT(*)::text FROM spotify_campaigns
UNION ALL
SELECT 'Playlists', COUNT(*)::text FROM campaign_playlists;
"

# Check for duplicates
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT name, COUNT(*) FROM clients GROUP BY name HAVING COUNT(*) > 1;
"
```

**Expected:**
- Clients: 260-270
- Campaigns: 2300-2400
- Playlists: 1600-1800
- Duplicates: 0

---

## Summary

**Phase 1-3: ✅ Complete** (Backup and Migrations applied)  
**Phase 4: ❌ Needs fix** (Missing .env file)

**Next Steps:**
1. Get the SUPABASE_SERVICE_ROLE_KEY (see methods above)
2. Export it as environment variable
3. Run data import scripts manually
4. Verify results
5. Restart services

