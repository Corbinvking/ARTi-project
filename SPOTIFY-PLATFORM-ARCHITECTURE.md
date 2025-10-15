# Spotify Campaign Management Platform - Complete Architecture

## 🎯 Core Concept

This platform manages **Spotify playlist promotion campaigns** where:
1. **Clients** (artists/labels) want to promote their songs
2. **Vendors** (playlist curators) place songs on their playlists
3. **Campaigns** represent the engagement between a client's song and vendors' playlists
4. **Scraped data** provides real-time performance metrics to evaluate vendor effectiveness

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SPOTIFY SCRAPER                              │
│  Extracts real-time stream data from Spotify for Artists           │
│  - Plays last 7 days, 28 days, 12 months                          │
│  - Playlist placements and stream counts per playlist              │
│  - Date added to playlists                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CAMPAIGN_PLAYLISTS TABLE                        │
│  Raw scraped data: Links songs to playlists to vendors             │
│  - campaign_id (song/campaign)                                     │
│  - vendor_id                                                        │
│  - playlist_name                                                    │
│  - streams_7d, streams_28d, streams_12m                           │
│  - date_added                                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│   PLAYLISTS TABLE    │              │  VENDOR PERFORMANCE  │
│  Aggregated display  │              │   Calculated from    │
│  - vendor_id         │              │   real stream data   │
│  - avg_daily_streams │              │   - Cost per 1k      │
│  - follower_count    │              │   - Delivery rate    │
└──────────────────────┘              │   - Reliability      │
                                      └──────────────────────┘
```

---

## 🗄️ Database Schema

### Core Entities

#### 1. **Clients**
Artists or labels who want to promote their music.

**Table:** `clients`
```sql
- id (uuid, primary key)
- name (text, e.g., "Pharaoh Phonix")
- contact_person (text)
- emails (text[])
- phone (text)
- org_id (uuid, for multi-tenancy)
- created_at, updated_at
```

**Key Relationships:**
- Has many `campaign_groups` (multiple campaigns)
- Has many `spotify_campaigns` (individual song placements)

---

#### 2. **Vendors**
Playlist curators who place songs on their playlists.

**Table:** `vendors`
```sql
- id (uuid, primary key)
- name (text, e.g., "Club Restricted", "Glenn", "Golden Nugget")
- contact_email (text)
- cost_per_1k_streams (numeric, promised rate)
- is_active (boolean)
- performance_rating (numeric, calculated from real data)
- org_id (uuid)
- created_at, updated_at
```

**Key Relationships:**
- Has many `playlists` (their curated playlists)
- Has many `campaign_playlists` (songs they've placed)
- Has many `spotify_campaigns` (via vendor field)

**Performance Metrics (Calculated):**
- **Actual Cost per 1K streams**: Total paid / (Total real streams / 1000)
- **Delivery Rate**: Real streams / Promised streams
- **Active Campaigns**: Count of ongoing placements
- **Reliability Score**: Based on delivery consistency

---

#### 3. **Campaigns (Campaign Groups)**
High-level campaigns representing a client's promotion effort (can include multiple songs).

**Table:** `campaign_groups`
```sql
- id (uuid, primary key)
- name (text, e.g., "Segan - DNBMF Campaign")
- client_id (uuid, foreign key to clients)
- artist_name (text)
- total_goal (bigint, total stream goal across all songs)
- total_budget (numeric)
- start_date (date)
- status (text: "active", "completed", "paused")
- invoice_status (text)
- salesperson (text)
- org_id (uuid)
- created_at, updated_at
```

**Key Relationships:**
- Belongs to one `client`
- Has many `spotify_campaigns` (individual song placements)

**Calculated Fields:**
- `total_remaining`: Sum of remaining streams across all songs
- `total_daily`: Sum of promised daily streams from vendors
- `progress_percentage`: (total_goal - total_remaining) / total_goal * 100

---

#### 4. **Song Placements (Spotify Campaigns)**
Individual song placements with vendors.

**Table:** `spotify_campaigns`
```sql
- id (integer, primary key)
- campaign_group_id (uuid, foreign key to campaign_groups)
- client_id (uuid, foreign key to clients)
- campaign (text, legacy campaign name)
- campaign_name (text)
- artist_name (text)
- url (text, Spotify track URL)
- vendor (text, vendor name - legacy)
- goal (bigint, promised streams for this placement)
- remaining (bigint, remaining streams)
- daily (integer, promised daily streams)
- weekly (integer, promised weekly streams)
- price (numeric)
- start_date (date)
- genre (text)
- org_id (uuid)
- created_at, updated_at
```

**Scraped Data Fields:**
- `plays_last_7d` (bigint): Real streams from scraper
- `plays_last_28d` (bigint): Real streams from scraper
- `plays_last_12m` (bigint): Real streams from scraper
- `playlist_adds` (integer): Number of playlists song is on
- `saves` (integer): Spotify saves

**Key Relationships:**
- Belongs to one `campaign_group`
- Belongs to one `client`
- Has many `campaign_playlists` (individual playlist placements)

---

#### 5. **Campaign Playlists (Raw Scraped Data)**
Links songs to specific playlists and vendors with real performance data.

**Table:** `campaign_playlists`
```sql
- id (uuid, primary key)
- campaign_id (integer, foreign key to spotify_campaigns)
- vendor_id (uuid, foreign key to vendors)
- playlist_name (text, e.g., "GYM - TEMAZOS MOTIVACION 2025")
- playlist_curator (text, who made the playlist)
- streams_7d (integer, real streams from this playlist)
- streams_28d (integer, real streams from this playlist)
- streams_12m (integer, real streams from this playlist)
- date_added (text, when added to playlist)
- last_scraped (timestamp)
- org_id (uuid)
- created_at, updated_at
```

**Purpose:**
- **Ground truth** for vendor performance
- Links songs → playlists → vendors
- Enables vendor comparison and performance tracking

---

#### 6. **Playlists (Aggregated for Display)**
Vendor's playlists aggregated for frontend display.

**Table:** `playlists`
```sql
- id (uuid, primary key)
- vendor_id (uuid, foreign key to vendors)
- name (text)
- url (text, Spotify playlist URL)
- genres (text[])
- avg_daily_streams (integer, calculated from campaign_playlists)
- follower_count (integer)
- org_id (uuid)
- created_at, updated_at
```

**Purpose:**
- Display vendor's playlist inventory
- Show aggregate performance per playlist
- Used in "Vendors/Playlists" tab

---

## 🔄 Data Processing Pipeline

### Step 1: Scraper Execution
```bash
# Run Spotify scraper for active campaigns
cd spotify_scraper
python scraper.py

# Outputs: song_<TRACK_ID>_<TIMESTAMP>.json
# Contains: playlist placements, streams per time range, curator info
```

### Step 2: Process Scraped Data
```bash
node scripts/process-scraped-data.js
```
**What it does:**
1. Reads `song_*.json` files
2. Extracts track ID from filename
3. Finds matching `spotify_campaigns` records
4. Updates campaign fields:
   - `plays_last_7d`, `plays_last_28d`, `plays_last_12m`
   - `playlist_adds`, `saves`

### Step 3: Populate Campaign Playlists
```bash
node scripts/populate-playlist-vendor-data.js
```
**What it does:**
1. Reads scraped JSON files
2. Extracts playlist data (name, curator, streams)
3. Maps playlists to vendors (based on campaign's vendor field)
4. Inserts into `campaign_playlists` table
5. Creates link: Song → Playlist → Vendor

### Step 4: Sync to Display Table
```bash
node scripts/sync-campaign-playlists-to-playlists.js
```
**What it does:**
1. Groups `campaign_playlists` by (playlist_name + vendor_id)
2. Calculates `avg_daily_streams` from 28-day data
3. Inserts/updates `playlists` table for frontend display

---

## 🎨 Frontend Views & User Flows

### 1. **Campaigns Tab** (`/spotify/campaigns`)

**Purpose:** View and manage all campaigns

**Data Displayed:**
- Campaign name and artist
- Client name
- Stream goal vs. actual progress
- Promised daily/weekly streams
- **Real scraped streams** (plays_last_7d, plays_last_28d)
- Status and invoice status

**Key Features:**
- Search by campaign name, client, salesperson
- Filter by status (active, completed, paused)
- Click campaign → View campaign details modal

**Campaign Details Modal Should Show:**
- ✅ Campaign overview (goal, budget, remaining)
- ✅ Songs in campaign (if multiple)
- ✅ **Playlists this song is on** (from `campaign_playlists`)
  - Playlist name
  - Vendor name
  - Streams from this playlist (7d, 28d, 12m)
  - Date added
- ✅ Vendor performance breakdown
- ✅ Real vs. promised stream comparison

---

### 2. **Clients Tab** (`/spotify/clients`)

**Purpose:** Manage clients and view their campaigns

**Data Displayed:**
- Client name
- Contact info (email, phone)
- Number of active campaigns
- Total budget spent

**Key Features:**
- Create new client
- Edit client details
- Click client → View client campaigns modal

**Client Details Modal Should Show:**
- ✅ Client info
- ✅ All campaigns for this client
- ✅ Total streams delivered
- ✅ Active vs. completed campaigns

---

### 3. **Vendors/Playlists Tab** (`/spotify/playlists`)

**Purpose:** View and manage vendors and their playlists

**View Modes:**
1. **Vendor Cards View**
   - Card per vendor
   - Shows: name, active playlists, total streams
   - Click vendor → Expand to show playlists
   - Each playlist shows: name, avg daily streams

2. **All Playlists Table View**
   - Table of all playlists across all vendors
   - Columns: Playlist name, Vendor, Avg Daily Streams, Genres
   - Sortable and filterable

**Key Features:**
- Create new vendor
- Edit vendor details (contact, cost per 1k)
- Add playlists to vendor
- View vendor performance metrics

**Vendor Performance Metrics Should Show:**
- ✅ Total playlists
- ✅ Total avg daily streams (from `playlists` table)
- ✅ Active campaigns (from `campaign_playlists`)
- ✅ **Real cost per 1k streams** (calculated from actual delivered streams)
- ✅ **Delivery rate** (real streams / promised streams)
- ✅ **Reliability score**

---

## 🛠️ CRUD Operations & Infrastructure

### Create Client
**Location:** Clients tab → "Add Client" button

**Required Fields:**
- Name
- Email(s)
- Contact person
- Phone

**Script:** `scripts/create-clients-from-campaigns.js` (for bulk import)

**API Endpoint:** 
```typescript
POST /api/clients
Body: { name, emails, contact_person, phone, org_id }
```

---

### Create Campaign
**Location:** Campaigns tab → "New Campaign" button

**Required Fields:**
- Client (select from dropdown)
- Campaign name
- Artist name
- Spotify track URL
- Stream goal
- Budget
- Start date

**Steps:**
1. Select client
2. Enter campaign details
3. Add song(s) with individual goals
4. Select vendors or let algorithm suggest
5. Set budget allocation per vendor
6. Submit → Creates `campaign_group` + `spotify_campaigns`

**Script:** Manual creation via frontend or bulk import via CSV

---

### Create Vendor
**Location:** Vendors/Playlists tab → "Add Vendor" button

**Required Fields:**
- Name
- Contact email
- Cost per 1k streams (promised rate)
- Active status

**Script:** `scripts/populate-vendors.js` (for bulk import)

**API Endpoint:**
```typescript
POST /api/vendors
Body: { name, contact_email, cost_per_1k_streams, is_active, org_id }
```

---

### Add Playlist to Vendor
**Location:** Vendor card → "Add Playlist" button

**Required Fields:**
- Playlist name
- Spotify playlist URL
- Genres
- Avg daily streams (estimated)
- Follower count

**API Endpoint:**
```typescript
POST /api/playlists
Body: { vendor_id, name, url, genres, avg_daily_streams, follower_count }
```

---

### Link Campaign to Vendor
**When:** During campaign creation or via "Allocate to Vendor" action

**Creates:**
- `spotify_campaigns` record with `vendor` field set
- When scraper runs → Creates `campaign_playlists` entries

---

## 🔍 Key Queries & Data Flows

### Query 1: Get Campaign with Real Performance
```sql
SELECT 
  cg.*,
  c.name as client_name,
  COUNT(sc.id) as song_count,
  SUM(sc.plays_last_7d) as real_streams_7d,
  SUM(sc.plays_last_28d) as real_streams_28d,
  SUM(sc.goal) as total_promised_streams,
  SUM(sc.remaining) as total_remaining_streams
FROM campaign_groups cg
JOIN clients c ON cg.client_id = c.id
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
WHERE cg.id = $1
GROUP BY cg.id, c.name;
```

---

### Query 2: Get Campaign Playlists for Modal
```sql
SELECT 
  cp.*,
  v.name as vendor_name,
  v.cost_per_1k_streams,
  sc.campaign_name,
  sc.artist_name
FROM campaign_playlists cp
JOIN vendors v ON cp.vendor_id = v.id
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
WHERE cp.campaign_id = $1
ORDER BY cp.streams_28d DESC;
```

---

### Query 3: Calculate Vendor Performance
```sql
SELECT 
  v.id,
  v.name,
  v.cost_per_1k_streams as promised_cost,
  COUNT(DISTINCT cp.playlist_name) as total_playlists,
  COUNT(DISTINCT cp.campaign_id) as active_campaigns,
  SUM(cp.streams_28d) / 28 as avg_daily_streams,
  -- Real cost per 1k (if we have payment data)
  -- SUM(payments) / (SUM(cp.streams_28d) / 1000) as real_cost_per_1k
FROM vendors v
LEFT JOIN campaign_playlists cp ON cp.vendor_id = v.id
WHERE v.is_active = true
GROUP BY v.id, v.name, v.cost_per_1k_streams;
```

---

### Query 4: Get Client's Campaign Summary
```sql
SELECT 
  c.id,
  c.name,
  COUNT(DISTINCT cg.id) as total_campaigns,
  COUNT(DISTINCT CASE WHEN cg.status = 'active' THEN cg.id END) as active_campaigns,
  SUM(cg.total_budget) as total_budget,
  SUM(sc.plays_last_28d) as total_streams_delivered
FROM clients c
LEFT JOIN campaign_groups cg ON cg.client_id = c.id
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
WHERE c.id = $1
GROUP BY c.id, c.name;
```

---

## 🔄 Automation & Scheduling

### Daily Scraper Job
```bash
# Cron job to run daily at 2 AM
0 2 * * * cd /path/to/spotify_scraper && python scraper.py
```

**What it does:**
1. Fetches active campaigns from database
2. Scrapes Spotify for Artists data for each track
3. Saves JSON files to `spotify_scraper/data/`
4. Triggers data processing pipeline

---

### Data Processing Pipeline (After Scraper)
```bash
# Run after scraper completes
node scripts/process-scraped-data.js
node scripts/populate-playlist-vendor-data.js
node scripts/sync-campaign-playlists-to-playlists.js
```

**Automate with:**
```bash
#!/bin/bash
# scripts/run-daily-update.sh

echo "🎵 Starting daily Spotify data update..."

# Step 1: Run scraper
cd spotify_scraper
python scraper.py

# Step 2: Process scraped data
cd ..
node scripts/process-scraped-data.js

# Step 3: Populate campaign playlists
node scripts/populate-playlist-vendor-data.js

# Step 4: Sync to display tables
node scripts/sync-campaign-playlists-to-playlists.js

echo "✅ Daily update complete!"
```

---

## 📋 Implementation Checklist

### ✅ Completed
- [x] Database schema for clients, vendors, campaigns, playlists
- [x] Spotify scraper integration
- [x] Scripts to process scraped data
- [x] Scripts to populate campaign_playlists
- [x] Scripts to sync to playlists table
- [x] Frontend: Campaigns tab with real stream data
- [x] Frontend: Clients tab with campaign counts
- [x] Frontend: Vendors/Playlists tab with vendor cards
- [x] Production deployment

### 🚧 To Implement

#### 1. Campaign Details Modal Enhancement
- [ ] Add "Playlists" section showing all playlists song is on
- [ ] Display playlist name, vendor, streams, date added
- [ ] Show vendor performance breakdown for this campaign
- [ ] Add real vs. promised stream comparison chart

#### 2. Vendor Performance Metrics
- [ ] Calculate real cost per 1k from actual delivered streams
- [ ] Calculate delivery rate (real / promised)
- [ ] Add reliability score based on consistency
- [ ] Display in vendor cards and detail modals

#### 3. CRUD Operations UI
- [ ] Create Client form with validation
- [ ] Create Campaign form with multi-song support
- [ ] Create Vendor form
- [ ] Add Playlist to Vendor form
- [ ] Edit operations for all entities

#### 4. Advanced Features
- [ ] Campaign budget allocation algorithm (suggest best vendors)
- [ ] Vendor recommendation based on genre and performance
- [ ] Alert system for underperforming campaigns
- [ ] Export reports (campaigns, vendors, clients)
- [ ] Dashboard with key metrics and charts

#### 5. Automation
- [ ] Scheduled daily scraper job
- [ ] Automated data processing pipeline
- [ ] Email notifications for campaign milestones
- [ ] Slack/Discord integration for alerts

---

## 🎯 Next Steps for Local Development

### Phase 1: Campaign Modal Enhancement
1. Update `CampaignDetailsModal` component
2. Add query to fetch `campaign_playlists` for a campaign
3. Display playlist table with vendor info
4. Add charts for real vs. promised streams

### Phase 2: Vendor Performance Dashboard
1. Create `VendorPerformanceCard` component
2. Add queries to calculate performance metrics
3. Display in Vendors tab
4. Add sorting/filtering by performance

### Phase 3: CRUD Forms
1. Create `CreateClientForm` component
2. Create `CreateCampaignForm` component (multi-step)
3. Create `CreateVendorForm` component
4. Add validation and error handling

### Phase 4: Testing & Production
1. Test all flows locally
2. Push to production
3. Run daily automation
4. Monitor and iterate

---

## 📝 Summary

This platform is a **closed-loop system** where:
1. **Campaigns** connect clients' songs to vendors' playlists
2. **Scraped data** provides real performance metrics
3. **Vendor performance** is calculated from real data vs. promises
4. **Users** can create clients, campaigns, vendors, and track everything in one place

The key innovation is using **real Spotify data** to hold vendors accountable and optimize campaign performance over time.

