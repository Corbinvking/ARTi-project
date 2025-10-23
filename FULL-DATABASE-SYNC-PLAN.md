# 🔄 Full Database Sync & Refresh Plan

**Complete data refresh from CSV to ensure 100% accuracy across all systems**

---

## 📊 Scope

### **CSV Data** (`full-databse-chunk.csv`)
- **Total Campaigns**: 653
- **Unique Clients**: 203
- **Salespersons**: 19
- **Status Breakdown**:
  - Complete: 325 (50%)
  - Active: 265 (41%)
  - Cancelled: 43 (7%)
  - Unreleased: 14 (2%)
  - Other: 6 (<1%)

### **Goal**
Create a **complete, accurate, synchronized database** with:
1. ✅ All 653 campaigns from CSV
2. ✅ All 203 clients properly linked
3. ✅ All vendors tracked
4. ✅ Spotify for Artists URLs collected
5. ✅ Stream data for all active/complete campaigns (~590 campaigns)
6. ✅ Playlist data linked correctly

---

## 🎯 Master Workflow

```
CSV (653 campaigns) 
  ↓
Stage 1: Parse & Normalize CSV Data
  ↓
Stage 2: Create/Update Clients (203 unique)
  ↓
Stage 3: Create/Update Vendors (from CSV vendor column)
  ↓
Stage 4: Create/Update Campaigns (653 total)
  ↓
Stage 5: Collect SFA URLs (for campaigns without them)
  ↓
Stage 6: Scrape Stream Data (active + complete campaigns)
  ↓
Stage 7: Import Playlist Data
  ↓
Stage 8: Link Everything (campaigns ↔ clients ↔ vendors ↔ playlists)
  ↓
Stage 9: Verify Data Integrity
  ↓
Stage 10: Deploy to Production
```

---

## 📋 Database Structure

### **Current Tables**

#### `spotify_campaigns`
```sql
- campaign (TEXT) -- "Artist - Song Name"
- client (TEXT) -- Client name
- goal (TEXT) -- Stream goal
- salesperson (TEXT) -- Who sold it
- url (TEXT) -- Spotify track URL
- sfa (TEXT) -- Spotify for Artists URL
- status (TEXT) -- Active, Complete, etc.
- vendor (TEXT) -- Who's running it
- start_date (TEXT)
- sale_price (TEXT)
- client_email (TEXT)
- vendor_email (TEXT)
- notes (TEXT)
... + 15 more columns
```

#### `clients`
```sql
- id (UUID)
- name (TEXT)
- emails (TEXT[])
- phone (TEXT)
- contact_person (TEXT)
```

#### `vendors`
```sql
- id (UUID)
- name (TEXT)
- email (TEXT)
- contact_person (TEXT)
```

#### `campaign_playlists`
```sql
- campaign_id (INT) → spotify_campaigns(id)
- playlist_name (TEXT)
- playlist_curator (TEXT)
- streams_28d (INT)
- streams_7d (INT)
- streams_12m (INT)
- date_added (TEXT)
```

---

## 🔨 Stage-by-Stage Implementation

### **Stage 1: CSV Parsing & Normalization**

**Script**: `scripts/parse_all_campaigns_csv.js`

**What it does**:
- ✅ Read `Spotify Playlisting-All Campaigns.csv`
- ✅ Clean and normalize data
- ✅ Extract campaign name, client, salesperson, status
- ✅ Parse Spotify URLs (if present)
- ✅ Identify which campaigns need SFA URLs

**Output**:
```json
{
  "total_campaigns": 585,
  "by_status": {
    "active": 248,
    "complete": 291,
    "cancelled": 31,
    "unreleased": 9
  },
  "clients": [...],
  "vendors": [...],
  "campaigns": [...]
}
```

---

### **Stage 2: Client Creation/Update**

**Script**: `scripts/sync_clients_from_csv.js`

**What it does**:
- ✅ Extract all unique clients (190)
- ✅ Check if client exists in database
- ✅ Create new clients OR update existing
- ✅ Normalize email addresses
- ✅ Link to campaigns

**Data mapping**:
```
CSV "Client" → clients.name
CSV "Client Email" → clients.emails[]
```

---

### **Stage 3: Vendor Creation/Update**

**Script**: `scripts/sync_vendors_from_csv.js`

**What it does**:
- ✅ Extract all unique vendors
- ✅ Check if vendor exists
- ✅ Create new vendors OR update existing
- ✅ Link vendor emails

**Data mapping**:
```
CSV "Vendor" → vendors.name
CSV "Vendor Email" → vendors.email
```

---

### **Stage 4: Campaign Creation/Update**

**Script**: `scripts/sync_campaigns_from_csv.js`

**What it does**:
- ✅ For each of 585 campaigns:
  - Check if campaign exists (by name or URL)
  - Create new OR update existing
  - Map ALL CSV columns to database columns
  - Link to client_id and vendor_id
  - Preserve existing SFA URLs

**Data mapping**:
```
CSV "Campaign" → spotify_campaigns.campaign
CSV "Client" → spotify_campaigns.client (also link to clients table)
CSV "Goal" → spotify_campaigns.goal
CSV "Salesperson" → spotify_campaigns.salesperson
CSV "Status" → spotify_campaigns.status
CSV "URL" → spotify_campaigns.url
CSV "SFA" → spotify_campaigns.sfa
CSV "Vendor" → spotify_campaigns.vendor (also link to vendors table)
CSV "Start Date" → spotify_campaigns.start_date
CSV "Sale price" → spotify_campaigns.sale_price
... all 25 columns
```

**Important**: 
- Update existing campaigns (don't create duplicates)
- Preserve existing `sfa` URLs if present
- Update status, salesperson, etc. from CSV

---

### **Stage 5: SFA URL Collection**

**Script**: `roster_scraper/run_roster_scraper.py` (modified)

**What it does**:
- ✅ Get all campaigns where `sfa` is NULL or empty
- ✅ Filter by status: Active, Complete
- ✅ Search Roster for each artist
- ✅ Find matching songs
- ✅ Extract SFA URLs
- ✅ Update `spotify_campaigns.sfa` column

**Target campaigns**: 
- Active (248) + Complete (291) = 539 campaigns
- Estimate: ~300-400 will have SFA URLs available

---

### **Stage 6: Stream Data Scraping**

**Script**: `spotify_scraper/run_roster_urls.py` (modified)

**What it does**:
- ✅ Get all campaigns with `sfa` URLs
- ✅ Filter: Active + Complete statuses
- ✅ Scrape playlist data (28d, 7d, 12m)
- ✅ Save JSON files per song

**Estimated time**: 
- ~400 songs × 2 min = ~13 hours
- Can run overnight

---

### **Stage 7: Playlist Data Import**

**Script**: `scripts/import-roster-scraped-data.js` (existing)

**What it does**:
- ✅ Read all scraped JSON files
- ✅ Match to campaigns by track ID
- ✅ Create `campaign_playlists` records
- ✅ Link playlists to campaigns

**Result**:
- Thousands of playlist records
- Stream data for 28d, 7d, 12m
- Algorithmic vs vendor playlist classification

---

### **Stage 8: Relationship Linking**

**Script**: `scripts/link_all_relationships.js`

**What it does**:
- ✅ Link campaigns ↔ clients (via client_id foreign key)
- ✅ Link campaigns ↔ vendors (via vendor_id foreign key)
- ✅ Link campaigns ↔ playlists (via campaign_playlists)
- ✅ Create `campaign_groups` for multi-song campaigns
- ✅ Verify all relationships are correct

---

### **Stage 9: Data Verification**

**Script**: `scripts/verify_database_integrity.js`

**What it does**:
- ✅ Count total campaigns (should be 585)
- ✅ Count clients (should be 190)
- ✅ Count vendors
- ✅ Check for orphaned records
- ✅ Verify all statuses are valid
- ✅ Check all active campaigns have data
- ✅ Generate integrity report

**Report includes**:
```
✅ Total campaigns: 585
✅ Active campaigns: 248
✅ Complete campaigns: 291
✅ Campaigns with SFA URLs: ~400
✅ Campaigns with playlist data: ~350
✅ Clients created: 190
✅ Vendors created: ~15
✅ Playlist records: ~5,000+
⚠️  Campaigns missing data: ~35
⚠️  Orphaned records: 0
```

---

### **Stage 10: Production Deployment**

**Script**: `scripts/deploy_to_production.sh`

**What it does**:
- ✅ Upload all scraped JSON files
- ✅ Run all sync scripts on production
- ✅ Import playlist data
- ✅ Verify production database
- ✅ Test production UI

---

## 🔄 Master Script

### **`scripts/run_full_database_sync.py`**

**One command to rule them all:**

```bash
python scripts/run_full_database_sync.py \
  --csv "Spotify Playlisting-All Campaigns.csv" \
  --scrape-sfa \
  --scrape-streams \
  --deploy-production
```

**Options:**
```bash
# Parse and sync only (no scraping)
--sync-only

# Scrape SFA URLs only
--scrape-sfa-only

# Scrape stream data only (if SFA URLs exist)
--scrape-streams-only

# Local only (test first)
--local-only

# Production deployment
--deploy-production

# Dry run (show what would happen)
--dry-run
```

---

## 📊 Data Flow Diagram

```
Spotify Playlisting-All Campaigns.csv (585 campaigns)
│
├─► Parse & Normalize
│   ├─► 190 Unique Clients
│   ├─► ~15 Unique Vendors
│   └─► 585 Campaigns
│
├─► Create/Update Database Records
│   ├─► clients table (190 records)
│   ├─► vendors table (~15 records)
│   └─► spotify_campaigns table (585 records)
│
├─► Collect SFA URLs
│   ├─► Search Roster for ~400 campaigns
│   └─► Update spotify_campaigns.sfa column
│
├─► Scrape Stream Data
│   ├─► ~400 campaigns with SFA URLs
│   └─► ~800 JSON files (2 per campaign avg)
│
├─► Import Playlist Data
│   └─► campaign_playlists table (~5,000+ records)
│
└─► Deploy to Production
    ├─► Upload data files
    ├─► Run sync scripts
    └─► Verify in UI
```

---

## ⚠️ Important Considerations

### **Duplicate Prevention**
- ✅ Check for existing campaigns by name OR URL
- ✅ Update existing records instead of creating duplicates
- ✅ Merge data intelligently (preserve SFA URLs, update status)

### **Data Preservation**
- ✅ Don't delete existing playlist data
- ✅ Preserve manually entered SFA URLs
- ✅ Keep historical data (don't overwrite timestamps)

### **Performance**
- ✅ Batch database operations (100 records at a time)
- ✅ Show progress bars
- ✅ Allow resume if interrupted
- ✅ Parallel scraping where possible

### **Error Handling**
- ✅ Log all errors
- ✅ Continue on individual failures
- ✅ Generate error report at end
- ✅ Retry failed operations

---

## 📈 Expected Results

### **Database State After Sync**

| Table | Records | Notes |
|-------|---------|-------|
| `clients` | 190 | All unique clients |
| `vendors` | ~15 | All vendors from CSV |
| `spotify_campaigns` | 585 | All campaigns, all statuses |
| `campaign_playlists` | ~5,000+ | Playlist data for active/complete |

### **Coverage**

| Metric | Expected | Percentage |
|--------|----------|------------|
| **Total Campaigns** | 585 | 100% |
| **With Spotify URLs** | ~500 | 85% |
| **With SFA URLs** | ~400 | 68% |
| **With Playlist Data** | ~350 | 60% |
| **Active/Complete** | 539 | 92% |

---

## 🚀 Implementation Order

### **Phase 1: Database Sync** (1 hour)
1. ✅ Parse CSV
2. ✅ Create/update clients
3. ✅ Create/update vendors
4. ✅ Create/update campaigns

### **Phase 2: URL Collection** (3-4 hours)
1. ✅ Search Roster for ~400 campaigns
2. ✅ Extract SFA URLs
3. ✅ Update database

### **Phase 3: Stream Scraping** (12-15 hours)
1. ✅ Scrape ~400 campaigns
2. ✅ Save JSON files
3. ✅ Can run overnight

### **Phase 4: Import & Verify** (1 hour)
1. ✅ Import playlist data
2. ✅ Link relationships
3. ✅ Verify integrity

### **Phase 5: Production** (30 min)
1. ✅ Upload to production
2. ✅ Run imports
3. ✅ Verify UI

**Total Time: ~16-20 hours (mostly automated)**

---

## 📝 Next Steps

1. **Review this plan** - Make sure approach is correct
2. **Create sync scripts** - Build the database sync tools
3. **Test on subset** - Try with 10 campaigns first
4. **Run full sync** - Process all 585 campaigns
5. **Verify results** - Check database and UI
6. **Deploy to production** - Make it live

---

## 🎯 Success Criteria

✅ **All 585 campaigns** in database  
✅ **All 190 clients** created/linked  
✅ **All vendors** created/linked  
✅ **~400 SFA URLs** collected  
✅ **~350 campaigns** with playlist data  
✅ **~5,000+ playlist records** created  
✅ **Data visible in UI** (local and production)  
✅ **All relationships** correctly linked  
✅ **Zero duplicates** in database  
✅ **100% data accuracy** from CSV  

---

**Ready to build this system?** 🚀

This will be the **definitive data refresh** that ensures everything is correct!

