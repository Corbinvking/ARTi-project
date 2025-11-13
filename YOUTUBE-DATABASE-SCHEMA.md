# YouTube Database Schema - Complete Documentation

**Platform:** Vidi Health Flow (YouTube View Campaign Management)  
**Source:** `vidi-health-flow` repository (65 migrations analyzed)  
**Status:** ✅ **Deployed to Unified Database** (migrations 042, 044, 045, 046)  
**Last Updated:** November 13, 2024

---

## 🎉 Current Status & Import Statistics

**Database Status:** ✅ **OPERATIONAL**  
**CSV Data Import:** ✅ **COMPLETED** (November 13, 2024)

### Import Results

| Metric | Value |
|--------|-------|
| **CSV File** | `YouTube-All Campaigns.csv` |
| **Total Rows** | 804 rows (437 unique campaigns) |
| **Successfully Imported** | 420 campaigns (96.1% success rate) |
| **Errors** | 9 campaigns (2.0%) |
| **Skipped** | 8 campaigns (missing URLs or invalid data) |
| **Database Total** | 1,676 campaigns (420 new + 1,256 existing) |

### Schema Adjustments Made

1. ✅ **Migration 042_youtube_complete_schema_fix.sql**
   - Replaced old INTEGER-based IDs with UUID
   - Added `org_id` for multi-tenancy
   - Created `youtube_clients` and `youtube_salespersons` tables
   - Added `service_types` JSONB column for multi-service campaigns

2. ✅ **Migration 044_add_youtube_clients_and_service_types.sql**
   - Added `video_id` column (extracted from YouTube URLs)
   - Added `end_date` column
   - Updated foreign keys to reference new client tables

3. ✅ **Migration 045_add_youtube_service_type_enum_values.sql**
   - Added 16 new service type enum values from CSV data
   - Includes: `ww_display`, `ww_skip`, `us_display`, `us_website_ads`, etc.

4. ✅ **Migration 046_add_remaining_youtube_service_types.sql**
   - Added `custom`, `latam_website`, `eur_website`, `aus_website`, `cad_website`

### Import Script

**Location:** `scripts/import-youtube-campaigns.ts`

**Features:**
- Multi-service campaign support (groups services by Campaign + URL)
- Extracts video IDs from YouTube URLs
- Maps service types to database enums
- Handles currency and date parsing
- Filters empty/invalid service types
- Creates client records automatically

**Known Issues:**
- 9 campaigns failed due to:
  - Custom/uncommon service types not in enum
  - Data validation issues
- Impact: Less than 2% - not critical

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Campaign Management](#campaign-management)
4. [Analytics & Tracking](#analytics--tracking)
5. [Pricing & Payments](#pricing--payments)
6. [Automation & Monitoring](#automation--monitoring)
7. [Enums & Types](#enums--types)
8. [Functions & Triggers](#functions--triggers)
9. [RLS Policies](#rls-policies)
10. [Indexes](#indexes)
11. [Data Flow Diagrams](#data-flow-diagrams)

---

## Overview

The YouTube app (Vidi Health Flow) is a **YouTube view campaign management platform** for music promotion. It manages:

- **Paid view campaigns** (clients pay for views, likes, comments, subscribers)
- **Geographic targeting** (Worldwide, USA, UK, Canada, Australia, LATAM, Europe, Asia, MENA)
- **Service types** (Display ads, Skip ads, Website traffic, Engagement-only)
- **Multi-tier pricing** (volume-based pricing for vendors)
- **Daily stats tracking** (3x per day via YouTube API)
- **Vendor payment calculations** (automated cost per 1K views)
- **Engagement ratio fixing** (automated queue for view/like/comment balancing)
- **Weekly client updates** (automated email reports)

---

## Core Tables

### `youtube_clients`
**Purpose:** Companies/individuals purchasing YouTube promotion campaigns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL | Client name |
| `email` | TEXT | | Contact email |
| `company` | TEXT | | Company name |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_youtube_clients_org_id` on (org_id)

---

### `youtube_salespersons`
**Purpose:** Sales team members who manage client relationships

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL | Salesperson name |
| `email` | TEXT | | Contact email |
| `commission_rate` | DECIMAL(5,2) | DEFAULT 0.00 | Commission percentage |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_youtube_salespersons_org_id` on (org_id)

---

## Campaign Management

### `youtube_campaigns`
**Purpose:** Individual YouTube video promotion campaigns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| **Campaign Basics** | | | |
| `campaign_name` | TEXT | NOT NULL | Campaign display name |
| `youtube_url` | TEXT | NOT NULL | YouTube video URL |
| `video_id` | TEXT | | Extracted YouTube video ID |
| `client_id` | UUID | REFERENCES youtube_clients(id) | Client reference |
| `salesperson_id` | UUID | REFERENCES youtube_salespersons(id) | Salesperson reference |
| **Service Configuration** | | | |
| `service_type` | youtube_service_type | NOT NULL | DEPRECATED: Use service_types |
| `custom_service_type` | TEXT | | Custom service description |
| `service_types` | JSONB | | Array of service type objects |
| `genre` | TEXT | | Music genre |
| `artist_tier` | INTEGER | CHECK (1-3) | Artist popularity tier |
| **Goals & Pricing** | | | |
| `goal_views` | INTEGER | DEFAULT 0 | DEPRECATED: Sum of service_types goals |
| `sale_price` | DECIMAL(10,2) | | Price charged to client |
| `calculated_vendor_payment` | DECIMAL(10,2) | | Calculated vendor cost |
| `payment_calculation_date` | TIMESTAMPTZ | | Last payment calculation |
| **Timing** | | | |
| `start_date` | DATE | | Campaign start date |
| `end_date` | DATE | | Campaign end date |
| `status` | youtube_campaign_status | DEFAULT 'pending' | Campaign status |
| **Current Performance Metrics** | | | |
| `current_views` | INTEGER | DEFAULT 0 | Current view count |
| `views_7_days` | INTEGER | DEFAULT 0 | Views in last 7 days |
| `current_likes` | INTEGER | DEFAULT 0 | Current like count |
| `likes_7_days` | INTEGER | DEFAULT 0 | Likes in last 7 days |
| `current_comments` | INTEGER | DEFAULT 0 | Current comment count |
| `comments_7_days` | INTEGER | DEFAULT 0 | Comments in last 7 days |
| `subscribers_gained` | INTEGER | DEFAULT 0 | New subscribers |
| `watch_time` | INTEGER | DEFAULT 0 | Total watch time (minutes) |
| `impression_ctr` | DECIMAL(5,2) | DEFAULT 0.00 | Click-through rate |
| **Technical Setup** | | | |
| `comments_sheet_url` | TEXT | | Google Sheet for comment management |
| `like_server` | TEXT | | Like bot server identifier |
| `comment_server` | TEXT | | Comment bot server identifier |
| `minimum_engagement` | INTEGER | DEFAULT 0 | Min engagement per day |
| `wait_time_seconds` | INTEGER | DEFAULT 0 | Delay between actions |
| `sheet_tier` | TEXT | | Google Sheet tier level |
| `desired_daily` | INTEGER | DEFAULT 0 | Target daily views |
| `technical_setup_complete` | BOOLEAN | DEFAULT false | Setup validation flag |
| **Status Flags** | | | |
| `views_stalled` | BOOLEAN | DEFAULT false | Is growth stalled? |
| `in_fixer` | BOOLEAN | DEFAULT false | In ratio fixer queue? |
| `needs_update` | BOOLEAN | DEFAULT false | Needs manual review? |
| `ask_for_access` | BOOLEAN | DEFAULT false | Need YouTube access? |
| `confirm_start_date` | BOOLEAN | DEFAULT false | Need start date confirmation? |
| `paid_reach` | BOOLEAN | DEFAULT false | Using paid advertising? |
| `invoice_status` | youtube_invoice_status | DEFAULT 'tbd' | Client invoice status |
| **YouTube API Integration** | | | |
| `youtube_api_enabled` | BOOLEAN | DEFAULT false | Auto-fetch stats via API? |
| `youtube_api_error` | TEXT | | Last API error message |
| `last_youtube_api_fetch` | TIMESTAMPTZ | | Last successful API fetch |
| **Weekly Updates** | | | |
| `weekly_updates_enabled` | BOOLEAN | DEFAULT false | Send weekly email reports? |
| `last_weekly_update_sent` | TIMESTAMPTZ | | Last report sent |
| **Metadata** | | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Service Types Array Structure:**
```json
[
  {
    "service_type": "ww_website",
    "custom_service_type": null,
    "goal_views": 500000,
    "current_views": 350000
  },
  {
    "service_type": "us_display",
    "custom_service_type": null,
    "goal_views": 200000,
    "current_views": 150000
  }
]
```

**Campaign Status Flow:**
`pending` → `active` → `complete` (or `paused`)

**Indexes:**
- `idx_youtube_campaigns_client_id` on (client_id)
- `idx_youtube_campaigns_salesperson_id` on (salesperson_id)
- `idx_youtube_campaigns_status` on (status)
- `idx_youtube_campaigns_start_date` on (start_date)
- `idx_youtube_campaigns_service_types` (GIN) on (service_types)
- `idx_youtube_campaigns_weekly_updates` on (weekly_updates_enabled) WHERE weekly_updates_enabled = true
- `idx_youtube_campaigns_status_tracking` on (status, youtube_api_enabled) WHERE youtube_api_enabled = true
- `idx_youtube_campaigns_youtube_tracking` on (youtube_api_enabled, video_id, status) WHERE youtube_api_enabled = true AND video_id IS NOT NULL

**Triggers:**
- `update_youtube_campaigns_updated_at` - Auto-update updated_at
- `validate_campaign_activation_trigger` - Enforce technical setup before activation

---

## Analytics & Tracking

### `youtube_campaign_stats_daily`
**Purpose:** Historical daily performance metrics (collected 3x per day)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES youtube_campaigns(id) | Campaign reference |
| `date` | DATE | NOT NULL | Stats date |
| `time_of_day` | TEXT | CHECK (morning, afternoon, evening) | Collection time |
| **Metrics** | | | |
| `views` | INTEGER | DEFAULT 0 | Total views |
| `likes` | INTEGER | DEFAULT 0 | Total likes |
| `comments` | INTEGER | DEFAULT 0 | Total comments |
| `subscribers` | INTEGER | DEFAULT 0 | New subscribers |
| `watch_time_minutes` | INTEGER | DEFAULT 0 | Watch time |
| `impression_ctr` | DECIMAL(5,2) | DEFAULT 0.00 | Click-through rate |
| `avg_view_duration` | INTEGER | DEFAULT 0 | Average view duration (seconds) |
| **Metadata** | | | |
| `collected_at` | TIMESTAMPTZ | DEFAULT now() | Collection timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Unique Constraint:** (campaign_id, date, time_of_day)

**Indexes:**
- `idx_youtube_campaign_stats_daily_campaign_id` on (campaign_id)
- `idx_youtube_campaign_stats_daily_date` on (date)
- `idx_youtube_campaign_stats_daily_campaign_date_time` on (campaign_id, date, time_of_day)

**Purpose:** Used for:
- Trend analysis (view growth over time)
- Weekly report generation
- Detecting stalled campaigns
- Calculating daily deltas

---

### `youtube_performance_logs`
**Purpose:** Granular metric change tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES youtube_campaigns(id) | Campaign reference |
| `metric_type` | TEXT | NOT NULL | views, likes, comments, subscribers |
| `value` | INTEGER | NOT NULL | Metric value |
| `recorded_at` | TIMESTAMPTZ | DEFAULT now() | Recording timestamp |

**Indexes:**
- `idx_youtube_performance_logs_campaign_id` on (campaign_id)
- `idx_youtube_performance_logs_recorded_at` on (recorded_at DESC)

**Purpose:** High-resolution tracking for debugging and audit trail

---

### `youtube_campaign_milestones`
**Purpose:** Track when campaigns reach view milestones

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES youtube_campaigns(id) | Campaign reference |
| `milestone_views` | INTEGER | NOT NULL | Milestone threshold |
| `reached_at` | TIMESTAMPTZ | | When milestone reached |
| `notification_sent` | BOOLEAN | DEFAULT false | Email sent to client? |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_youtube_campaign_milestones_campaign_id` on (campaign_id)

**Common Milestones:** 100K, 250K, 500K, 750K, 1M, 2M, 5M, 10M views

---

## Pricing & Payments

### `youtube_pricing_tiers`
**Purpose:** Vendor cost per 1K views by service type and volume

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `service_type` | youtube_service_type | NOT NULL | Service type |
| `tier_min_views` | INTEGER | DEFAULT 0 | Minimum views for tier |
| `tier_max_views` | INTEGER | | Maximum views for tier (NULL = infinity) |
| `cost_per_1k_views` | DECIMAL(10,4) | NOT NULL | Cost per 1,000 views |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_youtube_pricing_tiers_service_type` on (service_type)
- `idx_youtube_pricing_tiers_org_id` on (org_id)

**Sample Pricing Data:**

| Service Type | View Range | Cost per 1K |
|-------------|------------|-------------|
| **Free Services** | | |
| `engagements_only` | All | $0.00 |
| `custom` | All | $0.00 |
| **Low Cost** | | |
| `latam_display/website/skip` | All | $2.80 |
| `asia_website` | All | $3.00 |
| `mena_display` | All | $3.50 |
| **Mid Cost** | | |
| `eur_display/website/skip` | All | $6.50 |
| `us_display/website/skip` | All | $6.50 |
| `aus_display/website/skip` | All | $6.50 |
| `cad_display/website/skip` | All | $6.50 |
| **Tiered Pricing** | | |
| `ww_skip` | 0 - 499K | $1.40 |
| `ww_skip` | 500K - 999K | $1.40 |
| `ww_skip` | 1M+ | $1.20 |
| `ww_website` | 0 - 99K | $1.20 |
| `ww_website` | 100K - 999K | $1.20 |
| `ww_website` | 1M+ | $1.00 |
| `ww_display` | All | $1.20 |

---

### `youtube_vendor_payments`
**Purpose:** Track vendor payment history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES youtube_campaigns(id) | Campaign reference |
| `payment_amount` | DECIMAL(10,2) | NOT NULL | Payment amount |
| `payment_date` | DATE | NOT NULL | Payment date |
| `views_at_payment` | INTEGER | | View count at payment |
| `payment_calculation` | JSONB | | Breakdown of cost calculation |
| `notes` | TEXT | | Payment notes |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_youtube_vendor_payments_campaign_id` on (campaign_id)
- `idx_youtube_vendor_payments_payment_date` on (payment_date)

---

## Automation & Monitoring

### `youtube_ratio_fixer_queue`
**Purpose:** Queue for fixing engagement ratio issues (views too high vs likes/comments)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES youtube_campaigns(id) | Campaign reference |
| `priority` | youtube_priority_level | DEFAULT 'medium' | Queue priority |
| `status` | youtube_queue_status | DEFAULT 'waiting' | Processing status |
| `issue_type` | TEXT | | likes_low, comments_low, etc. |
| `target_ratio` | JSONB | | Desired ratio configuration |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_youtube_ratio_fixer_queue_campaign_id` on (campaign_id)
- `idx_youtube_ratio_fixer_queue_status` on (status)
- `idx_youtube_ratio_fixer_queue_priority` on (priority)

**Status Flow:** `waiting` → `processing` → `completed` (or `failed`)

---

### `youtube_server_configs`
**Purpose:** Configuration for like/comment bot servers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `server_name` | TEXT | NOT NULL UNIQUE | Server identifier |
| `server_type` | TEXT | CHECK (like, comment) | Server purpose |
| `capacity` | INTEGER | DEFAULT 0 | Max daily actions |
| `current_load` | INTEGER | DEFAULT 0 | Current daily actions |
| `status` | TEXT | DEFAULT 'active' | active, maintenance, offline |
| `endpoint_url` | TEXT | | Server API endpoint |
| `api_key` | TEXT | | Authentication key |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_youtube_server_configs_server_name` on (server_name)
- `idx_youtube_server_configs_status` on (status)

---

### `youtube_weekly_updates_log`
**Purpose:** Track sent weekly campaign update emails

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES youtube_campaigns(id) | Campaign reference |
| `week_ending` | DATE | NOT NULL | Week end date |
| `views_delta` | INTEGER | | View change for week |
| `likes_delta` | INTEGER | | Like change for week |
| `comments_delta` | INTEGER | | Comment change for week |
| `sent_at` | TIMESTAMPTZ | DEFAULT now() | Email sent timestamp |
| `email_provider_id` | TEXT | | Email provider message ID |
| `recipient_email` | TEXT | | Client email |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_youtube_weekly_updates_log_campaign_id` on (campaign_id)
- `idx_youtube_weekly_updates_log_week_ending` on (week_ending)

---

## Enums & Types

### `youtube_campaign_status`
Campaign lifecycle states
```sql
CREATE TYPE youtube_campaign_status AS ENUM ('pending', 'active', 'paused', 'complete');
```

### `youtube_service_type`
Geographic/targeting service types
```sql
CREATE TYPE youtube_service_type AS ENUM (
  -- Worldwide
  'worldwide', 'ww_display', 'ww_website', 'ww_website_ads', 'ww_skip',
  
  -- USA
  'usa', 'us_display', 'us_website', 'us_website_ads', 'us_skip', 'us_eur_website',
  
  -- UK
  'uk',
  
  -- Canada
  'canada', 'cad_display', 'cad_website', 'cad_skip',
  
  -- Australia
  'australia', 'aus_display', 'aus_website', 'aus_skip',
  
  -- Latin America
  'latam_display', 'latam_website', 'latam_skip',
  
  -- Europe
  'eur_display', 'eur_website', 'eur_skip',
  
  -- Asia
  'asia_website',
  
  -- MENA (Middle East & North Africa)
  'mena_display',
  
  -- Special Services
  'organic_push', 'playlist_push', 'youtube_eng_ad', 'engagements_only', 'custom'
);
```

### `youtube_invoice_status`
Client billing status
```sql
CREATE TYPE youtube_invoice_status AS ENUM ('tbd', 'sent', 'paid');
```

### `youtube_priority_level`
Queue priority levels
```sql
CREATE TYPE youtube_priority_level AS ENUM ('low', 'medium', 'high');
```

### `youtube_queue_status`
Queue processing states
```sql
CREATE TYPE youtube_queue_status AS ENUM ('waiting', 'processing', 'completed', 'failed');
```

---

## Functions & Triggers

### `update_updated_at_column()`
**Returns:** TRIGGER  
**Purpose:** Automatically update updated_at timestamp  

Applied to all tables with updated_at columns

---

### `calculate_total_goal_views(service_types_json JSONB)`
**Returns:** INTEGER  
**Purpose:** Sum goal_views from service_types array  

```sql
SELECT calculate_total_goal_views(campaigns.service_types);
```

**Example:**
```sql
-- Input: [{"goal_views": 500000}, {"goal_views": 200000}]
-- Output: 700000
```

---

### `calculate_vendor_payment(campaign_uuid UUID)`
**Returns:** JSONB  
**Purpose:** Calculate vendor cost based on current views and pricing tiers  

```sql
SELECT calculate_vendor_payment('campaign-uuid-here');
```

**Output:**
```json
{
  "total_cost": 1650.00,
  "breakdown": [
    {
      "service_type": "ww_website",
      "views": 500000,
      "rate_per_1k": 1.20,
      "cost": 600.00
    },
    {
      "service_type": "us_display",
      "views": 200000,
      "rate_per_1k": 6.50,
      "cost": 1300.00
    }
  ],
  "campaign_id": "campaign-uuid-here"
}
```

---

### `validate_campaign_activation()`
**Returns:** TRIGGER  
**Purpose:** Enforce technical setup before activating campaign  

```sql
-- Raises exception if:
-- - Status changing to 'active'
-- - technical_setup_complete = false
```

---

## RLS Policies

### Clients
- ✅ Authenticated users can view all clients
- ✅ Admins can manage clients

### Salespersons
- ✅ Authenticated users can view all salespersons
- ✅ Admins can manage salespersons

### Campaigns
- ✅ All authenticated users can view/manage campaigns (can be refined later)
- ⚠️ **TODO:** Implement role-based access (salesperson can only see their campaigns)

### Pricing Tiers
- ✅ Authenticated users can view pricing tiers
- ✅ Admins can manage pricing tiers

### Performance Logs
- ✅ All authenticated users can view performance logs

### Ratio Fixer Queue
- ✅ All authenticated users can view/manage queue

### All Other Tables
- ✅ Org-level isolation via `org_id`
- ✅ RLS policies filter by org membership

---

## Indexes

### Performance-Critical Indexes

**GIN Indexes (JSONB fields):**
- `youtube_campaigns.service_types` - Fast service type queries

**Composite Indexes:**
- `(campaign_id, date, time_of_day)` on campaign_stats_daily - Fast daily stats queries
- `(youtube_api_enabled, video_id, status)` on campaigns - Fast API sync queries
- `(status, youtube_api_enabled)` on campaigns - Active campaign tracking

**Status Indexes:**
- All tables with `status` columns have indexes for filtering

**Foreign Key Indexes:**
- All foreign key columns have indexes for JOIN performance

**Date/Time Indexes:**
- `campaign_stats_daily.date` - Date range queries
- `campaigns.start_date` - Campaign scheduling
- `performance_logs.recorded_at DESC` - Recent log queries

**Partial Indexes:**
- `idx_youtube_campaigns_weekly_updates` WHERE weekly_updates_enabled = true
- `idx_youtube_campaigns_status_tracking` WHERE youtube_api_enabled = true AND status != 'complete'

---

## Data Flow Diagrams

### Campaign Creation & Setup Flow

```
1. Client requests campaign → youtube_campaigns (status: 'pending')
2. Salesperson creates campaign → Assign client_id, salesperson_id
3. Set service types & goals → service_types JSONB array
4. Configure technical setup → comments_sheet_url, servers, desired_daily
5. Mark technical_setup_complete = true
6. Activate campaign → status: 'active' (trigger validates setup)
7. Start daily stats collection → youtube_campaign_stats_daily
```

### Daily Stats Collection Flow (3x per day)

```
1. Cron job triggers (6 AM, 2 PM, 10 PM)
2. For each active campaign with youtube_api_enabled = true:
   a. Fetch stats from YouTube API
   b. Update youtube_campaigns (current_views, current_likes, etc.)
   c. Insert into youtube_campaign_stats_daily (with time_of_day)
   d. Insert into youtube_performance_logs (granular tracking)
   e. Check if milestone reached → youtube_campaign_milestones
3. Check for stalled campaigns → Set views_stalled = true
4. Check engagement ratios → Add to youtube_ratio_fixer_queue if needed
```

### Vendor Payment Calculation Flow

```
1. Admin clicks "Calculate Payment" → Call calculate_vendor_payment(campaign_id)
2. Function fetches campaign data
3. For each service type in service_types array:
   a. Get current_views for that service
   b. Find matching pricing_tier (by service_type and view range)
   c. Calculate: (views / 1000) * cost_per_1k_views
   d. Add to breakdown array
4. Sum all service costs → total_cost
5. Update youtube_campaigns.calculated_vendor_payment
6. Insert into youtube_vendor_payments (payment record)
7. Return breakdown JSON
```

### Weekly Update Email Flow

```
1. Weekly cron job runs (Monday 9 AM)
2. For each campaign with weekly_updates_enabled = true:
   a. Get stats from 7 days ago → youtube_campaign_stats_daily
   b. Get current stats → youtube_campaigns
   c. Calculate deltas (views_delta, likes_delta, etc.)
   d. Generate email from template
   e. Send email to client (client.email)
   f. Insert into youtube_weekly_updates_log
   g. Update campaigns.last_weekly_update_sent
```

### Ratio Fixer Queue Flow

```
1. Daily check runs after stats collection
2. For each active campaign:
   a. Calculate like_ratio = current_likes / current_views
   b. Calculate comment_ratio = current_comments / current_views
   c. If ratio below threshold (e.g., < 0.02 for likes):
      - Check if not already in queue
      - Insert into youtube_ratio_fixer_queue
      - Set campaigns.in_fixer = true
3. Ratio fixer bot processes queue:
   a. Get campaigns with status = 'waiting'
   b. For each campaign:
      - Get like_server / comment_server from campaigns
      - Submit engagement order to server
      - Update queue status = 'processing'
4. On completion:
   a. Update queue status = 'completed'
   b. Set campaigns.in_fixer = false
   c. Update campaign engagement metrics
```

---

## Summary Statistics

### Tables: 10
- Core: 3 (clients, salespersons, campaigns)
- Analytics: 3 (campaign_stats_daily, performance_logs, campaign_milestones)
- Pricing: 2 (pricing_tiers, vendor_payments)
- Automation: 2 (ratio_fixer_queue, weekly_updates_log, server_configs)

### Enums: 5
- campaign_status, service_type, invoice_status, priority_level, queue_status

### Functions: 4
- update_updated_at_column, calculate_total_goal_views, calculate_vendor_payment, validate_campaign_activation

### Indexes: 25+
- GIN indexes on JSONB columns
- Composite indexes for complex queries
- Partial indexes for active campaigns
- B-tree indexes on foreign keys, dates, status

### RLS Policies: 10+
- Org-level isolation on all tables
- Role-based access (admin vs salesperson)
- Full access for now (can be refined)

---

## Key Relationships

```
clients
  └─> campaigns (1:many) - Campaigns for this client

salespersons
  └─> campaigns (1:many) - Campaigns managed by this salesperson

campaigns
  ├─> campaign_stats_daily (1:many) - Historical performance data
  ├─> performance_logs (1:many) - Granular metric tracking
  ├─> campaign_milestones (1:many) - View milestone tracking
  ├─> vendor_payments (1:many) - Payment history
  ├─> ratio_fixer_queue (1:1) - Engagement fix queue
  └─> weekly_updates_log (1:many) - Email history

pricing_tiers
  └─> (no direct FKs, used in calculations)
```

---

## Migration to Unified Database

### Adapted Tables (Prefixed with `youtube_`)
All original tables were prefixed with `youtube_` to avoid naming conflicts in the unified database.

### Added Columns
- `org_id UUID REFERENCES orgs(id)` - Added to all tables for multi-tenancy

### RLS Policies Updated
All RLS policies updated to include org-level isolation:
```sql
org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
```

### Original → Unified Mapping
- `campaigns` → `youtube_campaigns`
- `clients` → `youtube_clients`
- `salespersons` → `youtube_salespersons`
- `campaign_stats_daily` → `youtube_campaign_stats_daily`
- `pricing_tiers` → `youtube_pricing_tiers`
- etc.

---

## Business Logic Notes

### Service Type Selection
- **Worldwide Services:** Cheapest per view, highest volume required
- **USA/EUR Services:** Premium pricing, targeted audience
- **Display vs Skip vs Website:** Different targeting methods
- **Engagements Only:** Free service (likes/comments without paid views)
- **Custom:** Negotiated pricing

### Pricing Tiers
- **Flat Rate:** Most services have single price per 1K views
- **Tiered Pricing:** WW services get cheaper at higher volumes
  - `ww_skip`: $1.40 → $1.20 at 1M+ views
  - `ww_website`: $1.20 → $1.00 at 1M+ views

### Multi-Service Campaigns
- Single campaign can have multiple service types
- Each service tracks views independently
- Total vendor cost = sum of all service costs
- Goal views = sum of all service goal_views

### Technical Setup Validation
- **Required fields:**
  - comments_sheet_url
  - like_server
  - comment_server
  - desired_daily > 0
- **Validation trigger:** Prevents activation without setup
- **Override:** Admin can manually set technical_setup_complete = true

### Stats Collection Strategy
- **3x Daily:** Morning, Afternoon, Evening
- **Purpose:** Catch view acceleration/deceleration
- **API Rate Limits:** Delay between campaigns to avoid throttling
- **Error Handling:** Log youtube_api_error, continue with next campaign

### Engagement Ratios
- **Healthy Ratios:**
  - Like ratio: 2-5% of views
  - Comment ratio: 0.5-2% of views
- **Automatic Detection:** Daily check flags low ratios
- **Ratio Fixer:** Adds campaigns to queue for engagement boost

### Weekly Updates
- **Opt-in:** Clients must enable weekly_updates_enabled
- **Schedule:** Monday morning (9 AM)
- **Content:**
  - Week-over-week view growth
  - New likes and comments
  - Progress toward goal
  - Milestones reached
- **Tracking:** Log email sends to prevent duplicates

---

## Common Queries

### Get Active Campaigns with Current Stats
```sql
SELECT 
  c.*,
  cl.name as client_name,
  sp.name as salesperson_name
FROM youtube_campaigns c
LEFT JOIN youtube_clients cl ON c.client_id = cl.id
LEFT JOIN youtube_salespersons sp ON c.salesperson_id = sp.id
WHERE c.status = 'active'
ORDER BY c.created_at DESC;
```

### Get Campaign Performance Over Time
```sql
SELECT 
  date,
  time_of_day,
  views,
  likes,
  comments
FROM youtube_campaign_stats_daily
WHERE campaign_id = :campaign_id
ORDER BY date, 
  CASE time_of_day 
    WHEN 'morning' THEN 1
    WHEN 'afternoon' THEN 2
    WHEN 'evening' THEN 3
  END;
```

### Calculate Daily View Growth
```sql
WITH daily_totals AS (
  SELECT 
    date,
    MAX(views) as max_views_for_day
  FROM youtube_campaign_stats_daily
  WHERE campaign_id = :campaign_id
  GROUP BY date
),
growth AS (
  SELECT 
    date,
    max_views_for_day as views,
    LAG(max_views_for_day) OVER (ORDER BY date) as prev_views
  FROM daily_totals
)
SELECT 
  date,
  views,
  views - COALESCE(prev_views, 0) as daily_growth
FROM growth
ORDER BY date DESC;
```

### Get Vendor Payment Breakdown
```sql
SELECT calculate_vendor_payment(:campaign_id) as payment_breakdown;
```

### Find Campaigns Needing Attention
```sql
SELECT 
  campaign_name,
  youtube_url,
  status,
  views_stalled,
  in_fixer,
  needs_update,
  ask_for_access
FROM youtube_campaigns
WHERE (views_stalled = true 
   OR in_fixer = true 
   OR needs_update = true 
   OR ask_for_access = true)
  AND status != 'complete'
ORDER BY created_at DESC;
```

### Get Campaigns by Service Type
```sql
SELECT 
  campaign_name,
  service_types,
  current_views,
  goal_views
FROM youtube_campaigns
WHERE service_types @> '[{"service_type": "ww_website"}]'::jsonb
ORDER BY current_views DESC;
```

---

## Next Steps

1. ✅ **Schema Deployed** - All tables created in unified database
2. ⏳ **Data Migration** - Migrate existing data from original database (if needed)
3. ⏳ **Frontend Integration** - Connect React components to new tables
4. ⏳ **API Routes** - Build API endpoints for CRUD operations
5. ⏳ **YouTube API Integration** - Set up automated stats fetching
6. ⏳ **Cron Jobs** - Configure daily stats collection and weekly updates
7. ⏳ **Pricing Management** - Admin UI for managing pricing tiers

---

**End of YouTube Database Schema Documentation**

