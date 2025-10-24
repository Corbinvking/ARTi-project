# 🚀 Complete End-to-End Workflow Guide

## 📋 **Overview**

This guide documents the complete workflow to go from a CSV file to having all campaign data with streaming information in production.

---

## 🎯 **One-Command Workflow (Goal)**

**What we want:**
```bash
python scripts/run_complete_workflow.py --csv full-databse-chunk.csv --deploy-to-production
```

**What it does:**
1. ✅ Sync campaigns, clients, vendors from CSV to local database
2. ✅ Collect SFA URLs from Spotify for Artists Roster
3. ✅ Scrape streaming data for all songs
4. ✅ Import streaming data to local database
5. ✅ Upload to production
6. ✅ Import to production database

---

## 📁 **Current Multi-Step Workflow**

### **Stage 1: Local Database Sync**

**What:** Import campaign data from CSV to local Supabase

**Command:**
```bash
node scripts/run_full_database_sync.js
```

**What it does:**
- Syncs clients from CSV
- Syncs vendors from CSV
- Syncs campaigns from CSV
- Links relationships (client_id, vendor_id)
- Creates campaign_groups for UI
- Fixes source/type fields

**Input:** `full-databse-chunk.csv`

**Output:** Local database with 653 campaigns, 203 clients, vendors

---

### **Stage 2: Collect SFA URLs**

**What:** Get Spotify for Artists URLs for each song from the Roster

**Command:**
```bash
cd roster_scraper
python run_roster_scraper.py
```

**What it does:**
- Logs into Spotify for Artists (manual login required)
- For each client in CSV:
  - Searches for artist in Roster
  - Navigates to Songs page
  - Extracts SFA URLs for each song
- Saves results to `roster_scraper/data/roster_scraping_results_*.json`

**Input:** `full-databse-chunk.csv`

**Output:** `roster_scraper/data/roster_scraping_results_TIMESTAMP.json`

**Time:** ~5-10 minutes for 203 clients

---

### **Stage 3: Save SFA URLs to Database**

**What:** Update campaigns with their SFA URLs

**Command:**
```bash
node scripts/import-roster-urls.js
```

**What it does:**
- Reads latest `roster_scraping_results_*.json`
- Finds matching campaigns by track ID
- Updates `spotify_campaigns.sfa` column with URL

**Input:** `roster_scraper/data/roster_scraping_results_*.json`

**Output:** Database campaigns with SFA URLs populated

---

### **Stage 4: Scrape Streaming Data**

**What:** Get playlist and stream data from Spotify for Artists

**Command:**
```bash
cd spotify_scraper
python run_s4a_list.py
```

**What it does:**
- Reads SFA URLs from `roster_scraping_results_*.json`
- For each URL:
  - Navigates to song stats page
  - Scrapes playlist data (28d, 7d, 12m streams)
  - Saves to `spotify_scraper/data/song_*.json`
- Supports resume (skips already scraped songs)

**Input:** `roster_scraper/data/roster_scraping_results_*.json`

**Output:** `spotify_scraper/data/song_TRACKID_TIMESTAMP.json` (one per song)

**Time:** ~2-3 seconds per song (110 songs = ~6 minutes)

---

### **Stage 5: Import Streaming Data to Local**

**What:** Load scraped playlist data into local database

**Command:**
```bash
node scripts/import-roster-scraped-data.js
```

**What it does:**
- Reads all `spotify_scraper/data/song_*.json` files
- For each song:
  - Finds matching campaign by track ID
  - Updates campaign SFA URL
  - Inserts/updates playlists in `campaign_playlists`
- Marks playlists as algorithmic (Discover Weekly, Radio, etc.)

**Input:** `spotify_scraper/data/song_*.json`

**Output:** `campaign_playlists` table populated with stream data

---

### **Stage 6: Generate Production SQL**

**What:** Create SQL file for production import (bypasses JWT issues)

**Command:**
```bash
python scripts/generate_sql_import.py
```

**What it does:**
- Reads all `spotify_scraper/data/roster_*.json` files
- Generates SQL INSERT/UPDATE statements
- Creates `IMPORT-SCRAPED-DATA.sql`

**Input:** `spotify_scraper/data/roster_*.json`

**Output:** `IMPORT-SCRAPED-DATA.sql` (ready for production)

---

### **Stage 7: Upload to Production**

**What:** Transfer SQL file to production server

**Command:**
```bash
scp IMPORT-SCRAPED-DATA.sql root@164.90.129.146:/root/arti-marketing-ops/
```

**Alternative (Windows PowerShell):**
```powershell
scp IMPORT-SCRAPED-DATA.sql root@164.90.129.146:/root/arti-marketing-ops/
```

---

### **Stage 8: Run Production Import**

**What:** Execute SQL on production database

**SSH to production:**
```bash
ssh root@164.90.129.146
cd /root/arti-marketing-ops
```

**First time only - Create unique constraint:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_playlists_unique ON campaign_playlists(campaign_id, playlist_name, playlist_curator);"
```

**Run import:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql
```

**Verify:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(DISTINCT campaign_id) FROM campaign_playlists;"
```

---

## 🔄 **Quick Reference Commands**

### **Complete Local Workflow:**
```bash
# Stage 1: Database Sync
node scripts/run_full_database_sync.js

# Stage 2: Collect URLs (manual login required)
cd roster_scraper
python run_roster_scraper.py
cd ..

# Stage 3: Save URLs to DB
node scripts/import-roster-urls.js

# Stage 4: Scrape Stream Data
cd spotify_scraper
python run_s4a_list.py
cd ..

# Stage 5: Import to Local DB
node scripts/import-roster-scraped-data.js

# Verify local
psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
```

### **Deploy to Production:**
```bash
# Stage 6: Generate SQL
python scripts/generate_sql_import.py

# Stage 7: Upload
scp IMPORT-SCRAPED-DATA.sql root@164.90.129.146:/root/arti-marketing-ops/

# Stage 8: Run on production (SSH)
ssh root@164.90.129.146
cd /root/arti-marketing-ops
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql
```

---

## 🎯 **Automated Script (Future Enhancement)**

### **Create: `scripts/run_complete_workflow.py`**

```python
#!/usr/bin/env python3
"""
Complete end-to-end workflow automation
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd, cwd=None, description=""):
    """Run a command and handle errors"""
    print(f"\n{'='*80}")
    print(f"🚀 {description}")
    print(f"{'='*80}")
    print(f"Command: {cmd}\n")
    
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    
    if result.returncode != 0:
        print(f"❌ Error: {description} failed!")
        sys.exit(1)
    
    print(f"✅ {description} complete!")
    return result

def main():
    base_dir = Path(__file__).parent.parent
    
    print("\n" + "="*80)
    print("🎯 COMPLETE SPOTIFY CAMPAIGN WORKFLOW")
    print("="*80)
    
    # Stage 1: Database Sync
    run_command(
        "node scripts/run_full_database_sync.js",
        cwd=base_dir,
        description="Stage 1: Sync CSV to Local Database"
    )
    
    # Stage 2: Collect URLs (requires manual login)
    print("\n" + "="*80)
    print("⚠️  MANUAL ACTION REQUIRED: Spotify for Artists Login")
    print("="*80)
    print("The Roster Scraper will open a browser.")
    print("Please log in to Spotify for Artists when prompted.")
    input("\nPress ENTER when ready to continue...")
    
    run_command(
        "python run_roster_scraper.py",
        cwd=base_dir / "roster_scraper",
        description="Stage 2: Collect SFA URLs from Roster"
    )
    
    # Stage 3: Save URLs to DB
    run_command(
        "node scripts/import-roster-urls.js",
        cwd=base_dir,
        description="Stage 3: Save URLs to Database"
    )
    
    # Stage 4: Scrape Stream Data
    print("\n" + "="*80)
    print("⚠️  USING EXISTING LOGIN SESSION")
    print("="*80)
    print("The scraper will use your existing Spotify login.")
    input("\nPress ENTER when ready to continue...")
    
    run_command(
        "python run_s4a_list.py",
        cwd=base_dir / "spotify_scraper",
        description="Stage 4: Scrape Streaming Data"
    )
    
    # Stage 5: Import to Local
    run_command(
        "node scripts/import-roster-scraped-data.js",
        cwd=base_dir,
        description="Stage 5: Import Data to Local Database"
    )
    
    # Verify Local
    print("\n" + "="*80)
    print("🔍 Verifying Local Import")
    print("="*80)
    run_command(
        'psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"',
        cwd=base_dir,
        description="Check Local Playlist Count"
    )
    
    # Ask about production deployment
    print("\n" + "="*80)
    print("🚀 PRODUCTION DEPLOYMENT")
    print("="*80)
    deploy = input("Deploy to production? (yes/no): ").strip().lower()
    
    if deploy == 'yes':
        # Stage 6: Generate SQL
        run_command(
            "python scripts/generate_sql_import.py",
            cwd=base_dir,
            description="Stage 6: Generate Production SQL"
        )
        
        # Stage 7: Upload
        run_command(
            "scp IMPORT-SCRAPED-DATA.sql root@164.90.129.146:/root/arti-marketing-ops/",
            cwd=base_dir,
            description="Stage 7: Upload to Production"
        )
        
        # Stage 8: Instructions for production
        print("\n" + "="*80)
        print("📋 FINAL STEP: Run on Production")
        print("="*80)
        print("SSH to production and run:")
        print("\n  ssh root@164.90.129.146")
        print("  cd /root/arti-marketing-ops")
        print("  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql")
        print("\nVerify:")
        print('  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"')
        print("\n" + "="*80)
    
    print("\n" + "="*80)
    print("🎉 WORKFLOW COMPLETE!")
    print("="*80)

if __name__ == "__main__":
    main()
```

### **Usage:**
```bash
# Run complete workflow
python scripts/run_complete_workflow.py

# Or with auto-deploy
python scripts/run_complete_workflow.py --auto-deploy
```

---

## 📝 **Prerequisites**

### **One-Time Setup:**

1. **Install Dependencies:**
   ```bash
   # Node.js packages
   npm install
   
   # Python packages
   pip install playwright asyncio
   playwright install chromium
   ```

2. **Supabase Local:**
   ```bash
   supabase start
   ```

3. **Production Server:**
   ```bash
   # SSH access configured
   ssh root@164.90.129.146
   
   # PostgreSQL client installed
   apt install postgresql-client
   ```

---

## ⏱️ **Time Estimates**

| Stage | Time | Notes |
|-------|------|-------|
| Database Sync | 1-2 min | Automated |
| Collect URLs | 5-10 min | Manual login required |
| Save URLs | 30 sec | Automated |
| Scrape Data | 5-10 min | 2-3 sec per song |
| Import Local | 1 min | Automated |
| Generate SQL | 30 sec | Automated |
| Upload | 10 sec | Automated |
| Import Production | 2-3 min | May have errors on duplicates |

**Total:** ~15-30 minutes for complete workflow

---

## 🐛 **Troubleshooting**

### **Roster Scraper Issues:**
- **Login fails:** Use manual login, wait for 2FA
- **Artist not found:** Check spelling in CSV, verify Roster access
- **No songs found:** Click "See songs" button manually

### **Stream Scraper Issues:**
- **Restarting from beginning:** Delete existing `song_*.json` files or let it resume
- **Session expired:** Re-run with manual login check

### **Database Import Issues:**
- **No campaigns found:** Check track IDs match between CSV and database
- **Duplicate errors:** Already imported, safe to ignore
- **JWT errors:** Use SQL import method instead

### **Production Issues:**
- **Connection refused:** Check SSH access
- **psql not found:** Install `postgresql-client`
- **Constraint errors:** Create unique index first

---

## 🔐 **Security Notes**

- **Spotify Login:** Session stored in browser profile, reused between runs
- **Database Credentials:** Stored in `.env.local`, never committed
- **SSH Keys:** Use key-based auth for production, not passwords
- **SFA URLs:** Stored securely in database, never logged

---

## 🔄 **Future Improvements**

1. **Full Automation:**
   - Headless Spotify login with stored credentials
   - Automatic retry on failures
   - Better error handling and logging

2. **Production Direct Import:**
   - Fix JWT authentication to use Node.js directly
   - Eliminate SQL generation step

3. **Scheduling:**
   - Weekly cron job for data refresh
   - Automatic detection of new campaigns
   - Email notifications on completion

4. **Monitoring:**
   - Dashboard showing last sync time
   - Data quality checks
   - Alert on scraping failures

---

## 📞 **Support**

For issues or questions:
1. Check troubleshooting section above
2. Review error logs in terminal
3. Verify prerequisites are installed
4. Check that Supabase is running locally

---

**Last Updated:** October 24, 2025

