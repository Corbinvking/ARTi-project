# Data Import Guide - CSV to Database

**Date:** November 13, 2024  
**Purpose:** Import historical campaign data from CSV files into the unified database

---

## 📋 Overview

This guide walks you through importing campaign data from CSV files into your production database for all three platforms:

- **YouTube:** 816 campaigns
- **Instagram:** 169 campaigns
- **SoundCloud:** 2,149 submissions

---

## 🎯 Pre-Import Checklist

### ✅ Required Files

Ensure these CSV files are in your project root:

- [ ] `YouTube-All Campaigns.csv` (816 rows)
- [ ] `IG Seeding-All Campaigns.csv` (169 rows)
- [ ] `SoundCloud-All Campaigns.csv` (2,149 rows)

### ✅ Environment Setup

Set these environment variables:

```bash
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
```

**⚠️ Important:** Use the **SERVICE_ROLE_KEY**, not the ANON_KEY. The service role key bypasses RLS policies and is required for data import.

### ✅ Dependencies

Install required npm packages:

```bash
npm install @supabase/supabase-js csv-parse
npm install --save-dev @types/node typescript ts-node
```

---

## 🚀 Quick Start (Run All Imports)

### Option 1: Master Script (Recommended)

```bash
# Make script executable
chmod +x scripts/import-all-campaigns.sh

# Run all imports
bash scripts/import-all-campaigns.sh
```

This will:
1. Validate environment variables
2. Check CSV files exist
3. Compile TypeScript scripts
4. Import YouTube campaigns
5. Import Instagram campaigns
6. Import SoundCloud submissions

### Option 2: Individual Imports

Run each platform separately:

```bash
# YouTube
npx ts-node scripts/import-youtube-campaigns.ts

# Instagram
npx ts-node scripts/import-instagram-campaigns.ts

# SoundCloud
npx ts-node scripts/import-soundcloud-submissions.ts
```

---

## 📊 What Gets Imported

### YouTube Import

**Creates:**
- `youtube_clients` (unique clients from CSV)
- `youtube_campaigns` (grouped by Campaign + URL)

**Features:**
- ✅ Multi-service campaign support (groups multiple service types)
- ✅ Extracts video IDs from YouTube URLs
- ✅ Maps service types to database enums
- ✅ Handles currency parsing ($150.00 → 150.00)
- ✅ Handles date parsing (9/19/2025 → 2025-09-19)

**Example:**
```
Input CSV:
  Campaign: "Holmesick - OnlyForU"
  URL: https://www.youtube.com/watch?v=SAkmVKRj3uw
  Service Type: WW Display (Goal: 10,000)
  Service Type: WW Skip (Goal: 10,000)

Output Database:
  youtube_campaigns:
    campaign_name: "Holmesick - OnlyForU"
    youtube_url: "https://www.youtube.com/watch?v=SAkmVKRj3uw"
    video_id: "SAkmVKRj3uw"
    service_types: [
      {service_type: "ww_display", goal_views: 10000, current_views: 0},
      {service_type: "ww_skip", goal_views: 10000, current_views: 0}
    ]
    goal_views: 20000 (total)
```

---

### Instagram Import

**Creates:**
- `instagram_campaigns`

**Features:**
- ✅ Maps status (Active → active, Unreleased → draft, Complete → completed)
- ✅ Parses budget and spend data
- ✅ Stores tracker URLs in results JSONB
- ✅ Combines report notes and client notes into description

**Example:**
```
Input CSV:
  Campaign: "DELATO, 7KY & RYA - Lucky You"
  Clients: "Bijan M"
  Price: "$600.00"
  Spend: "$245.00"
  Status: "Unreleased"

Output Database:
  instagram_campaigns:
    name: "DELATO, 7KY & RYA - Lucky You"
    brand_name: "Bijan M"
    budget: 600.00
    status: "draft"
    totals: {budget: 600, spent: 245, remaining: 355}
```

---

### SoundCloud Import

**Creates:**
- `soundcloud_members` (unique clients as members)
- `soundcloud_submissions`

**Features:**
- ✅ Creates member records for each unique client
- ✅ Parses track info (Artist - Track Name)
- ✅ Maps status (Active → approved, Unreleased → new)
- ✅ Handles huge goal numbers (40000000.0)
- ✅ Parses timestamps (9/20/2025 1:53pm)

**Example:**
```
Input CSV:
  Track Info: "Acyan - Lead Poison VIP"
  Client: "Acyan"
  Goal: 2000000.0
  Status: "Active"
  URL: "https://soundcloud.com/acyanmusic/leadpoison-vip"

Output Database:
  soundcloud_members:
    name: "Acyan"
    status: "active"
    size_tier: "T1"
  
  soundcloud_submissions:
    member_id: <acyan-member-id>
    artist_name: "Acyan"
    track_url: "https://soundcloud.com/acyanmusic/leadpoison-vip"
    expected_reach_planned: 2000000
    status: "approved"
```

---

## 🔍 Validation Queries

After import, run these queries in Supabase Studio to verify data:

### YouTube Validation

```sql
-- Count imported campaigns
SELECT COUNT(*) as total_campaigns FROM youtube_campaigns;

-- Check service type distribution
SELECT 
  jsonb_array_elements(service_types)->>'service_type' as service_type,
  COUNT(*) as count
FROM youtube_campaigns
GROUP BY service_type
ORDER BY count DESC;

-- Check campaigns by client
SELECT 
  c.name as client_name,
  COUNT(yc.id) as campaign_count
FROM youtube_campaigns yc
JOIN youtube_clients c ON yc.client_id = c.id
GROUP BY c.name
ORDER BY campaign_count DESC
LIMIT 10;
```

### Instagram Validation

```sql
-- Count imported campaigns
SELECT COUNT(*) as total_campaigns FROM instagram_campaigns;

-- Check status distribution
SELECT status, COUNT(*) as count
FROM instagram_campaigns
GROUP BY status
ORDER BY count DESC;

-- Check total budget
SELECT 
  SUM(budget) as total_budget,
  AVG(budget) as avg_budget
FROM instagram_campaigns;
```

### SoundCloud Validation

```sql
-- Count imported submissions
SELECT COUNT(*) as total_submissions FROM soundcloud_submissions;

-- Count created members
SELECT COUNT(*) as total_members FROM soundcloud_members;

-- Check status distribution
SELECT status, COUNT(*) as count
FROM soundcloud_submissions
GROUP BY status
ORDER BY count DESC;

-- Check submissions per member
SELECT 
  m.name,
  COUNT(s.id) as submission_count
FROM soundcloud_members m
JOIN soundcloud_submissions s ON m.id = s.member_id
GROUP BY m.name
ORDER BY submission_count DESC
LIMIT 10;
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "SUPABASE_SERVICE_ROLE_KEY is required"

**Problem:** Environment variable not set  
**Solution:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

Get the key from:
- Production: SSH to server, check `docker-compose.yml` or env files
- OR: Supabase Studio → Settings → API → service_role key

---

### Issue 2: "CSV file not found"

**Problem:** CSV files not in project root  
**Solution:** Move CSV files to project root directory

```bash
# Check current location
pwd

# Should be: C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# List CSV files
ls *.csv
```

---

### Issue 3: "Foreign key violation"

**Problem:** Referenced table doesn't exist or RLS blocking insert  
**Solution:** Ensure:
1. All migrations applied (`docker exec ... psql ... < supabase/migrations/...`)
2. Using SERVICE_ROLE_KEY (not ANON_KEY)
3. Default org exists:

```sql
INSERT INTO orgs (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Artist Influence', 'artist-influence')
ON CONFLICT (id) DO NOTHING;
```

---

### Issue 4: "Duplicate key value violates unique constraint"

**Problem:** Running import script multiple times  
**Solution:** Clear existing data first:

```sql
-- ⚠️ CAUTION: This deletes all campaign data!
DELETE FROM youtube_campaigns WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM instagram_campaigns WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM soundcloud_submissions WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM soundcloud_members WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM youtube_clients WHERE org_id = '00000000-0000-0000-0000-000000000001';
```

---

### Issue 5: TypeScript compilation errors

**Problem:** Missing types or incorrect tsconfig  
**Solution:** Install types:

```bash
npm install --save-dev @types/node
```

Or use ts-node directly:

```bash
npx ts-node --esModuleInterop scripts/import-youtube-campaigns.ts
```

---

## 📈 Expected Import Results

| Platform | CSV Rows | Expected Imports | Notes |
|----------|----------|------------------|-------|
| **YouTube** | 816 | ~350 campaigns | Grouped by Campaign+URL (multi-service) |
| **Instagram** | 169 | ~169 campaigns | 1:1 mapping |
| **SoundCloud** | 2,149 | ~2,149 submissions | 1:1 mapping |
| **Total** | 3,134 | ~2,668 records | Plus ~50 clients/members |

---

## 🔐 Security Notes

1. **Never commit service role keys** to git
2. **Use environment variables** for all credentials
3. **Run imports on production** only from secure location (SSH, VPN, etc.)
4. **Verify data** before making public
5. **Back up database** before import:

```bash
# SSH to production
ssh root@164.90.129.146

# Backup database
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres -d postgres > backup-$(date +%Y%m%d).sql
```

---

## ✅ Post-Import Checklist

After successful import:

- [ ] Run validation queries (see above)
- [ ] Check Supabase Studio for data: https://db.artistinfluence.com
- [ ] Verify campaign counts match expectations
- [ ] Check for any NULL values that should have data
- [ ] Test frontend displays correctly
- [ ] Enable YouTube API stats collection (if desired)
- [ ] Set up weekly report automations (if desired)

---

## 🎯 Next Steps

1. **Data Enrichment:**
   - Run YouTube API to fetch current view counts
   - Fetch Instagram post analytics
   - Update SoundCloud member follower counts

2. **Campaign Management:**
   - Assign salespersons to campaigns
   - Link creators to Instagram campaigns
   - Set up queue generation for SoundCloud

3. **Reporting:**
   - Generate initial reports for clients
   - Set up automated weekly updates
   - Create dashboards for performance tracking

---

## 📞 Support

If you encounter issues:

1. Check error messages in terminal output
2. Review validation queries above
3. Check database logs:
   ```bash
   docker logs supabase_db_arti-marketing-ops --tail=100
   ```
4. Verify RLS policies allow inserts
5. Ensure org_id exists in orgs table

---

**End of Data Import Guide**

