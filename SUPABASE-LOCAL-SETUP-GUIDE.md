# Supabase Database Cloning Guide for ARTi Platform

## Overview

This guide provides the **simplified 3-step process** for cloning your current Supabase database (ARTI0) to another machine. Instead of complex setup and data import, we'll copy your exact database state.

## What This Process Does

✅ **Complete Database Clone**: Copies your exact Supabase database with all data
✅ **Schema Preservation**: Maintains all tables, functions, policies, and configurations
✅ **One-Click Import**: Automated import script handles everything
✅ **Zero Data Loss**: Perfect replica of your current database state

## Prerequisites (Target Machine)

- ✅ Docker and Docker Compose installed
- ✅ Node.js and npm installed
- ✅ Git repository cloned to target machine
- ✅ Supabase CLI installed (`npm install -g supabase`)

## Step-by-Step Cloning Instructions

### Step 1: Export Database (Source Machine - ARTI0)

**On your current machine where ARTI0 is running:**

```bash
# Navigate to project root
cd C:\Users\Admin\Desktop\ARTi-project

# Export the current Supabase database
node scripts/export-supabase-database.js
```

**What this does:**
- ✅ Creates `supabase-export/` directory with complete database dump
- ✅ Exports schema, data, functions, policies, and configurations
- ✅ Creates import script for target machine
- ✅ Generates metadata and documentation

**Expected output:**
```
📄 File size: XX.XX MB
📁 Export directory: supabase-export/
🕒 Timestamp: 2025-01-XX...

✅ EXPORT COMPLETED SUCCESSFULLY!
```

### Step 2: Transfer Export (Copy to Target Machine)

**Copy the entire `supabase-export/` directory to your target machine:**

```bash
# On source machine - compress for transfer
cd C:\Users\Admin\Desktop\ARTi-project
tar -czf supabase-export.tar.gz supabase-export/

# Copy to target machine (USB, network, etc.)
# scp supabase-export.tar.gz target-machine:~/ARTi-project/

# On target machine - extract
cd C:\Users\Admin\Desktop\ARTi-project
tar -xzf supabase-export.tar.gz
```

### Step 3: Import Database (Target Machine)

**On the target machine:**

```bash
# Navigate to project root
cd C:\Users\Admin\Desktop\ARTi-project

# Import the database
node scripts/import-supabase-database.js
```

**What this does:**
- ✅ Checks for export files and validates them
- ✅ Starts Supabase if not running
- ✅ Imports complete database schema and data
- ✅ Verifies data integrity
- ✅ Provides post-import checklist

**Expected output:**
```
🚀 STARTING SUPABASE DATABASE IMPORT
==================================================

📋 Import source: ARTI0-local-supabase
📅 Export date: XX/XX/2025, XX:XX:XX

📄 Using export file: supabase-export-2025-XX-XX-XX-XX-XX.sql

🔍 Checking Supabase status...
✅ Supabase is already running

📥 IMPORTING DATABASE...
✅ DATABASE IMPORT COMPLETED SUCCESSFULLY!

🔍 VERIFYING DATA INTEGRITY...
   SELECT COUNT(*) as client_count FROM clients; → 150
   SELECT COUNT(*) as campaign_count FROM spotify_campaigns; → 1200
   SELECT COUNT(*) as org_count FROM orgs; → 5
   SELECT COUNT(*) as user_count FROM auth.users; → 25
```

## Post-Import Configuration

### Update Environment Variables

**Update the following files with your local configuration:**

#### Frontend (`apps/frontend/.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

#### Backend (`apps/api/.env`):
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Verify Everything Works

```bash
# Test database connection
node scripts/test-connection.js

# Start your applications
cd apps/api && npm run dev    # Backend
cd apps/frontend && npm run dev  # Frontend

# Test key functionality
curl http://localhost:3001/api/health
# Access: http://localhost:3000
```

## Troubleshooting

### Common Issues

#### "Export files not found"
**Solution:** Ensure you've copied the complete `supabase-export/` directory from source machine

#### "Import failed"
**Solution:** 
```bash
# Reset and try again
supabase stop
supabase start
node scripts/import-supabase-database.js
```

#### Port conflicts
**Solution:** Check if ports 54321-54326 are available, update `supabase/config.toml` if needed

## What Gets Cloned

✅ **Complete Schema**: All tables, indexes, constraints
✅ **All Data**: Every record from every table
✅ **Functions & Policies**: Stored procedures and RLS policies
✅ **Auth Configuration**: Users, roles, and permissions
✅ **Storage Setup**: Buckets and configurations

## Security Notes

- 🔐 **Passwords Excluded**: User passwords are not exported for security
- 🔑 **Service Keys**: Update service role keys in environment variables
- 👤 **Auth Users**: May need to recreate admin users if needed

## Files Created

The export process creates:
- `supabase-export/supabase-export-YYYY-MM-DD-HH-MM-SS.sql` - Database dump
- `supabase-export/import-database.sh` - Shell import script
- `supabase-export/export-metadata.json` - Export information
- `supabase-export/README.md` - Setup documentation

---

**That's it!** Your Supabase database is now perfectly cloned from ARTI0 to your target machine in just 3 simple steps.
