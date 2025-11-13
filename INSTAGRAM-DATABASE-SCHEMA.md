# Instagram Database Schema - Complete Documentation

**Platform:** Seedstorm Builder (Instagram & Spotify Campaign Management)  
**Source:** `seedstorm-builder` repository (25 migrations analyzed)  
**Status:** ✅ **Deployed to Unified Database** (migration 035)  
**Last Updated:** November 13, 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Campaign Management](#campaign-management)
4. [Creator Management](#creator-management)
5. [Post & Analytics Tracking](#post--analytics-tracking)
6. [Spotify Integration](#spotify-integration)
7. [Algorithm & A/B Testing](#algorithm--ab-testing)
8. [Functions & Triggers](#functions--triggers)
9. [RLS Policies](#rls-policies)
10. [Indexes](#indexes)
11. [Data Flow Diagrams](#data-flow-diagrams)

---

## Overview

The Instagram app (Seedstorm Builder) is a **dual-platform campaign management tool** that handles:

### Instagram Campaigns
- **Creator selection** (Instagram influencers based on engagement, followers, content type)
- **Campaign targeting** (music genres, territories, content types, post types)
- **Post tracking** (reels, carousels, stories with performance metrics)
- **Payment management** (creator payments, approval workflows)
- **Performance analytics** (views, likes, comments, shares, saves)

### Spotify Campaigns
- **Playlist placement** (place tracks on Spotify playlists via vendors)
- **Vendor management** (playlist curators with capacity and pricing)
- **Stream tracking** (daily streams per playlist)
- **Cost calculations** (cost per 1K streams)
- **Weekly reports** (stream growth tracking)

### Advanced Features
- **Public campaign sharing** (shareable links with tokens)
- **A/B testing framework** (test algorithm versions)
- **Algorithm learning log** (track AI decision-making)
- **Scoring system** (campaign fit scores, performance scores)

---

## Core Tables

### `creators`
**Purpose:** Instagram influencers/content creators (NOT prefixed - shared across campaigns)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| **Profile** | | | |
| `instagram_handle` | TEXT | NOT NULL | Instagram username |
| `email` | TEXT | | Contact email |
| `base_country` | TEXT | NOT NULL | Creator's home country |
| **Audience** | | | |
| `followers` | BIGINT | DEFAULT 0 | Follower count |
| `median_views_per_video` | BIGINT | DEFAULT 0 | Typical view count |
| `engagement_rate` | DECIMAL(5,2) | DEFAULT 0 | Engagement rate % |
| **Pricing** | | | |
| `reel_rate` | INTEGER | DEFAULT 0 | Price per reel (USD) |
| `carousel_rate` | INTEGER | DEFAULT 0 | Price per carousel (USD) |
| `story_rate` | INTEGER | DEFAULT 0 | Price per story (USD) |
| **Content & Audience** | | | |
| `content_types` | TEXT[] | DEFAULT '{}' | Content categories |
| `music_genres` | TEXT[] | DEFAULT '{}' | Music genres covered |
| `audience_territories` | TEXT[] | DEFAULT '{}' | Audience locations |
| **Scoring** | | | |
| `avg_performance_score` | DECIMAL(5,2) | DEFAULT 0 | Historical performance |
| `campaign_fit_score` | DECIMAL(5,2) | DEFAULT 0 | Suitability for current campaigns |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Purpose:** Shared resource for both Instagram and Spotify campaigns

**Indexes:**
- `idx_creators_instagram_handle` on (instagram_handle)
- `idx_creators_followers` on (followers DESC)
- `idx_creators_engagement_rate` on (engagement_rate DESC)

**RLS:** Authenticated users only (contains sensitive email and pricing data)

---

## Campaign Management

### `instagram_campaigns`
**Purpose:** Instagram influencer campaigns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| **Campaign Basics** | | | |
| `name` | TEXT | NOT NULL | Campaign name |
| `brand_name` | TEXT | NOT NULL | Brand/client name |
| `budget` | DECIMAL(12,2) | NOT NULL | Total campaign budget |
| `description` | TEXT | | Campaign description |
| **Targeting** | | | |
| `music_genres` | TEXT[] | DEFAULT '{}' | Target music genres |
| `content_types` | TEXT[] | DEFAULT '{}' | Desired content types |
| `territory_preferences` | TEXT[] | DEFAULT '{}' | Geographic targeting |
| `post_types` | TEXT[] | DEFAULT '{}' | reel, carousel, story |
| `creator_count` | INTEGER | DEFAULT 1 | Number of creators needed |
| **Status & Results** | | | |
| `status` | TEXT | DEFAULT 'draft' | draft, active, completed, cancelled |
| `selected_creators` | JSONB | DEFAULT '[]' | Selected creator IDs |
| `totals` | JSONB | DEFAULT '{}' | Aggregated metrics |
| `results` | JSONB | DEFAULT '{}' | Campaign results |
| **Public Sharing** | | | |
| `public_access_enabled` | BOOLEAN | DEFAULT false | Enable public link? |
| `public_token` | TEXT | UNIQUE | Public access token |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**JSONB Structures:**

**selected_creators:**
```json
[
  {
    "creator_id": "uuid",
    "instagram_handle": "@creatorname",
    "followers": 50000,
    "engagement_rate": 3.5,
    "estimated_reach": 25000,
    "cost": 500
  }
]
```

**totals:**
```json
{
  "total_cost": 5000,
  "estimated_reach": 250000,
  "actual_views": 320000,
  "total_engagement": 48000
}
```

**Indexes:**
- `idx_instagram_campaigns_org_id` on (org_id)
- `idx_instagram_campaigns_status` on (status)
- `idx_instagram_campaigns_public_token` on (public_token)

---

### `instagram_campaign_creators`
**Purpose:** Junction table linking campaigns to creators with workflow status

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES instagram_campaigns(id) | Campaign reference |
| `creator_id` | UUID | REFERENCES creators(id) | Creator reference |
| **Payment** | | | |
| `payment_status` | TEXT | DEFAULT 'unpaid' | unpaid, paid, processing |
| `payment_amount` | DECIMAL(10,2) | | Payment amount |
| **Content Status** | | | |
| `post_status` | TEXT | DEFAULT 'not_posted' | not_posted, scheduled, posted, removed |
| `approval_status` | TEXT | DEFAULT 'pending' | pending, approved, rejected, revision_needed |
| **Scheduling** | | | |
| `scheduled_date` | DATE | | Planned post date |
| `due_date` | DATE | | Content deadline |
| `posted_at` | TIMESTAMPTZ | | Actual post timestamp |
| `notes` | TEXT | | Internal notes |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Unique Constraint:** (campaign_id, creator_id) - Creator can only be assigned once per campaign

**Indexes:**
- `idx_instagram_campaign_creators_campaign_id` on (campaign_id)
- `idx_instagram_campaign_creators_creator_id` on (creator_id)
- `idx_instagram_campaign_creators_payment_status` on (payment_status)
- `idx_instagram_campaign_creators_approval_status` on (approval_status)

---

## Creator Management

### `instagram_tags`
**Purpose:** Taxonomy for organizing content, genres, and territories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL | Tag name |
| `type` | TEXT | CHECK (music_genre, content_type, territory) | Tag category |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Unique Constraint:** (org_id, name, type)

**Sample Tags:**

**music_genre:**
- Pop, Rock, Hip Hop, Electronic, R&B, Country, Jazz, Classical, Reggae, Folk

**content_type:**
- Music Reviews, Artist Interviews, Live Performances, Behind the Scenes, Music News, Tutorials, Reaction Videos, Collaborations, Cover Songs, Music Production

**territory:**
- United States, Canada, United Kingdom, Australia, Germany, France, Spain, Italy, Brazil, Mexico

**Indexes:**
- `idx_instagram_tags_type` on (type)
- `idx_instagram_tags_name` on (name)

---

## Post & Analytics Tracking

### `instagram_campaign_posts`
**Purpose:** Individual Instagram posts for campaigns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES instagram_campaigns(id) | Campaign reference |
| `creator_id` | UUID | REFERENCES creators(id) | Creator reference |
| **Post Details** | | | |
| `instagram_handle` | TEXT | NOT NULL | Creator's Instagram handle |
| `post_url` | TEXT | NOT NULL | Instagram post URL |
| `post_type` | TEXT | DEFAULT 'reel' | reel, carousel, story |
| `content_description` | TEXT | | Post caption/description |
| `thumbnail_url` | TEXT | | Post thumbnail image |
| **Status** | | | |
| `posted_at` | TIMESTAMPTZ | | Publication timestamp |
| `status` | TEXT | DEFAULT 'live' | live, removed, archived |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_instagram_campaign_posts_campaign_id` on (campaign_id)
- `idx_instagram_campaign_posts_creator_id` on (creator_id)
- `idx_instagram_campaign_posts_posted_at` on (posted_at DESC)

---

### `instagram_post_analytics`
**Purpose:** Performance metrics for Instagram posts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `post_id` | UUID | REFERENCES instagram_campaign_posts(id) | Post reference |
| **Metrics** | | | |
| `views` | INTEGER | DEFAULT 0 | Total views |
| `likes` | INTEGER | DEFAULT 0 | Total likes |
| `comments` | INTEGER | DEFAULT 0 | Total comments |
| `shares` | INTEGER | DEFAULT 0 | Total shares |
| `saves` | INTEGER | DEFAULT 0 | Total saves |
| `engagement_rate` | DECIMAL(5,4) | DEFAULT 0 | Calculated engagement rate |
| **Metadata** | | | |
| `recorded_at` | TIMESTAMPTZ | DEFAULT now() | Metric recording time |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Engagement Rate Calculation:**
```
engagement_rate = (likes + comments + shares + saves) / views
```

**Indexes:**
- `idx_instagram_post_analytics_post_id` on (post_id)
- `idx_instagram_post_analytics_recorded_at` on (recorded_at DESC)

**Purpose:** Historical tracking - new record inserted each time metrics are updated

---

## Spotify Integration

### `vendors`
**Purpose:** Spotify playlist curators/vendors (NOT prefixed - shared resource)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| **Vendor Details** | | | |
| `name` | TEXT | NOT NULL | Vendor name |
| **Capacity & Pricing** | | | |
| `max_daily_streams` | INTEGER | DEFAULT 0 | Max streams per day |
| `cost_per_1k_streams` | DECIMAL(10,4) | DEFAULT 0.00 | Cost per 1,000 streams |
| `max_concurrent_campaigns` | INTEGER | DEFAULT 5 | Max active campaigns |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**RLS:** Authenticated users only (contains sensitive pricing data)

---

### `playlists`
**Purpose:** Spotify playlists managed by vendors (NOT prefixed - shared resource)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| **Playlist Details** | | | |
| `name` | TEXT | NOT NULL | Playlist name |
| `url` | TEXT | NOT NULL | Spotify playlist URL |
| `genres` | TEXT[] | DEFAULT '{}' | Music genres |
| **Metrics** | | | |
| `follower_count` | INTEGER | DEFAULT 0 | Playlist followers |
| `avg_daily_streams` | INTEGER | DEFAULT 0 | Average streams per day |
| **Vendor** | | | |
| `vendor_id` | UUID | REFERENCES vendors(id) | Vendor reference |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_playlists_vendor_id` on (vendor_id)
- `idx_playlists_genres` (GIN) on (genres)

---

### `performance_entries`
**Purpose:** Daily stream performance for playlists

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `playlist_id` | UUID | REFERENCES playlists(id) | Playlist reference |
| `campaign_id` | UUID | | Campaign reference (if applicable) |
| `daily_streams` | INTEGER | NOT NULL | Streams for this day |
| `date_recorded` | DATE | DEFAULT CURRENT_DATE | Recording date |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_performance_entries_playlist_id` on (playlist_id)
- `idx_performance_entries_campaign_id` on (campaign_id)
- `idx_performance_entries_date` on (date_recorded DESC)

**Triggers:**
- `trigger_update_playlist_avg` - Auto-update `playlists.avg_daily_streams` on INSERT/UPDATE/DELETE

---

### `weekly_updates`
**Purpose:** Weekly campaign reports (for Spotify campaigns)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `campaign_id` | UUID | NOT NULL | Campaign reference |
| `streams` | INTEGER | DEFAULT 0 | Weekly stream count |
| `notes` | TEXT | | Update notes |
| `imported_on` | DATE | DEFAULT CURRENT_DATE | Import date |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_weekly_updates_campaign_id` on (campaign_id)
- `idx_weekly_updates_imported_on` on (imported_on DESC)

---

## Algorithm & A/B Testing

### `instagram_algorithm_learning_log`
**Purpose:** Track AI/algorithm decisions for continuous improvement

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `campaign_id` | UUID | REFERENCES instagram_campaigns(id) | Campaign reference |
| **Decision Tracking** | | | |
| `decision_type` | TEXT | NOT NULL | creator_selection, budget_allocation, etc. |
| `input_data` | JSONB | | Input parameters for decision |
| `decision_data` | JSONB | | Algorithm output/decision |
| `algorithm_version` | TEXT | | Algorithm version used |
| **Performance** | | | |
| `confidence_score` | DECIMAL(3,2) | | Algorithm confidence (0.00-1.00) |
| `performance_impact` | DECIMAL(5,2) | | Actual performance vs predicted |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Decision timestamp |

**Sample decision_type values:**
- `creator_selection` - Which creators were selected
- `budget_allocation` - How budget was distributed
- `timing_optimization` - When posts were scheduled
- `content_type_selection` - Which post types were chosen

**Indexes:**
- `idx_instagram_algorithm_learning_log_campaign_id` on (campaign_id)
- `idx_instagram_algorithm_learning_log_decision_type` on (decision_type)
- `idx_instagram_algorithm_learning_log_created_at` on (created_at DESC)

**Purpose:** Machine learning improvement loop - analyze what worked/didn't work

---

### `instagram_ab_tests`
**Purpose:** A/B testing framework for algorithm versions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| **Test Setup** | | | |
| `test_name` | TEXT | NOT NULL | Test identifier |
| `hypothesis` | TEXT | NOT NULL | What are we testing? |
| `algorithm_version_control` | TEXT | NOT NULL | Control algorithm version |
| `algorithm_version_test` | TEXT | NOT NULL | Test algorithm version |
| **Campaign Assignment** | | | |
| `control_campaigns` | UUID[] | | Campaigns using control |
| `test_campaigns` | UUID[] | | Campaigns using test version |
| **Status & Timing** | | | |
| `status` | TEXT | DEFAULT 'planning' | planning, running, analyzing, completed |
| `test_start_date` | TIMESTAMPTZ | | Test start timestamp |
| `test_end_date` | TIMESTAMPTZ | | Test end timestamp |
| `sample_size_target` | INTEGER | | Target campaign count |
| **Metrics** | | | |
| `control_metrics` | JSONB | | Control group results |
| `test_metrics` | JSONB | | Test group results |
| **Statistical Analysis** | | | |
| `statistical_power` | DECIMAL(3,2) | | Test statistical power |
| `p_value` | DECIMAL(5,4) | | P-value for significance |
| `effect_size` | DECIMAL(5,2) | | Effect size (Cohen's d) |
| `confidence_interval` | JSONB | | 95% confidence interval |
| **Results** | | | |
| `winner` | TEXT | | control, test, or inconclusive |
| `conclusion` | TEXT | | Test conclusion/learnings |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**JSONB Structures:**

**control_metrics / test_metrics:**
```json
{
  "campaigns_count": 50,
  "avg_engagement_rate": 3.5,
  "avg_views_per_post": 25000,
  "avg_cost_per_1k_views": 12.50,
  "avg_campaign_roi": 2.3
}
```

**confidence_interval:**
```json
{
  "metric": "engagement_rate",
  "lower_bound": 3.2,
  "upper_bound": 3.8,
  "confidence_level": 0.95
}
```

**Indexes:**
- `idx_instagram_ab_tests_status` on (status)
- `idx_instagram_ab_tests_org_id` on (org_id)

---

## Functions & Triggers

### `update_updated_at_column()`
**Returns:** TRIGGER  
**Purpose:** Automatically update updated_at timestamp  

Applied to all tables with updated_at columns

---

### `get_spotify_token()`
**Returns:** JSON  
**Purpose:** Retrieve Spotify API access token from secrets vault  

```sql
SELECT get_spotify_token();
-- Returns: {"token": "BQC..."}
```

**Security:** DEFINER (accesses vault.decrypted_secrets)

---

### `update_playlist_avg_streams(playlist_uuid UUID)`
**Returns:** VOID  
**Purpose:** Recalculate average daily streams for a playlist  

```sql
SELECT update_playlist_avg_streams('playlist-uuid-here');
```

**Calculation:**
```sql
avg_daily_streams = AVG(daily_streams) FROM performance_entries WHERE playlist_id = playlist_uuid
```

---

### `trigger_update_playlist_avg()`
**Returns:** TRIGGER  
**Purpose:** Auto-update playlist avg_daily_streams on performance_entries INSERT/UPDATE/DELETE  

Applied to `performance_entries` table

---

## RLS Policies

### Instagram Campaigns
- ✅ Users can view campaigns in their org
- ✅ Admin/manager can manage campaigns
- ✅ Public access to campaigns via token (if public_access_enabled = true)

### Instagram Campaign Creators
- ✅ Users can view creator assignments in their org
- ✅ Admin/manager can manage assignments

### Instagram Campaign Posts
- ✅ Users can view posts in their org
- ✅ Admin/manager can manage posts

### Instagram Post Analytics
- ✅ Users can view analytics in their org
- ✅ Admin/manager can manage analytics

### Instagram Tags
- ✅ Users can view tags in their org
- ✅ Admin/manager can manage tags

### Algorithm Learning Log
- ✅ Users can view logs in their org
- ✅ System can create logs (for algorithm automation)

### A/B Tests
- ✅ Users can view tests in their org
- ✅ Admin/manager can manage tests

### Creators
- ✅ **Authenticated users only** (contains sensitive email and pricing data)
- ❌ No public access

### Vendors
- ✅ **Authenticated users only** (contains sensitive cost per stream data)
- ❌ No public access

### Playlists
- ✅ Authenticated users can view playlists
- ✅ Admin/manager can manage playlists

### Performance Entries
- ✅ Authenticated users can view performance data
- ✅ System can insert performance data

### Weekly Updates
- ✅ Authenticated users can view weekly reports
- ✅ Admin/manager can manage reports

---

## Indexes

### Performance-Critical Indexes

**Array/JSONB Indexes (GIN):**
- `creators.content_types`
- `creators.music_genres`
- `creators.audience_territories`
- `instagram_campaigns.music_genres`
- `instagram_campaigns.content_types`
- `playlists.genres`

**Composite Indexes:**
- None specific (rely on individual column indexes)

**Status/Type Indexes:**
- `instagram_campaigns.status`
- `instagram_campaign_creators.payment_status`
- `instagram_campaign_creators.approval_status`
- `instagram_campaign_posts.status`
- `instagram_tags.type`
- `instagram_ab_tests.status`

**Foreign Key Indexes:**
- All foreign key columns have indexes for JOIN performance

**Date/Time Indexes:**
- `instagram_campaign_posts.posted_at DESC`
- `instagram_post_analytics.recorded_at DESC`
- `performance_entries.date_recorded DESC`
- `weekly_updates.imported_on DESC`

**Sorting/Ranking Indexes:**
- `creators.followers DESC`
- `creators.engagement_rate DESC`

---

## Data Flow Diagrams

### Instagram Campaign Creation Flow

```
1. Create campaign → instagram_campaigns (status: 'draft')
2. Define targeting → Set music_genres, content_types, territories, post_types
3. Set budget & creator_count
4. Algorithm runs → Select matching creators
5. Review & finalize → Update selected_creators JSONB
6. Assign creators → Insert into instagram_campaign_creators
7. Set payment amounts → Update payment_amount
8. Activate campaign → status: 'active'
```

### Creator Assignment & Payment Flow

```
1. Campaign active → Creators assigned via instagram_campaign_creators
2. Initial state:
   - payment_status: 'unpaid'
   - post_status: 'not_posted'
   - approval_status: 'pending'
3. Creator creates content
4. Submit for approval → approval_status: 'approved' or 'revision_needed'
5. Content posted → post_status: 'posted', posted_at set
6. Insert into instagram_campaign_posts
7. Payment processed → payment_status: 'paid'
```

### Post Analytics Collection Flow

```
1. Post created → instagram_campaign_posts
2. Instagram Scraper/API runs (scheduled job)
3. Fetch metrics → views, likes, comments, shares, saves
4. Calculate engagement_rate → (likes + comments + shares + saves) / views
5. Insert into instagram_post_analytics
6. Update campaign totals → Aggregate all posts
7. Update creator avg_performance_score
```

### Spotify Campaign Flow

```
1. Create campaign → campaigns (campaign_type: 'spotify')
2. Select track → track_name, track_url
3. Set stream_goal & budget
4. Algorithm selects playlists → selected_playlists JSONB
5. Allocate to vendors → vendor_allocations JSONB
6. Vendors add track to playlists
7. Daily scraper → performance_entries (daily_streams)
8. Trigger fires → update_playlist_avg_streams()
9. Weekly report → weekly_updates
```

### A/B Testing Flow

```
1. Create test → instagram_ab_tests (status: 'planning')
2. Define hypothesis → What are we testing?
3. Set algorithm versions → control vs test
4. Launch test → status: 'running', test_start_date set
5. Assign campaigns → Half to control, half to test
6. Run campaigns normally
7. End test → test_end_date set, status: 'analyzing'
8. Collect metrics → control_metrics, test_metrics
9. Run statistical analysis → p_value, effect_size, confidence_interval
10. Declare winner → winner, conclusion
11. Status: 'completed'
12. Roll out winning algorithm
```

### Algorithm Learning Loop

```
1. Campaign starts → Algorithm makes decisions
2. Log each decision → instagram_algorithm_learning_log
   - decision_type, input_data, decision_data, confidence_score
3. Campaign completes → Calculate performance_impact
   - performance_impact = (actual - predicted) / predicted
4. Analyze logs → Which decisions had positive impact?
5. Retrain algorithm → Use logs as training data
6. Deploy new version → algorithm_version updated
7. Repeat cycle
```

---

## Summary Statistics

### Tables: 14
- Core: 3 (creators, vendors, playlists - shared resources)
- Instagram Campaign: 7 (campaigns, campaign_creators, campaign_posts, post_analytics, tags, algorithm_learning_log, ab_tests)
- Spotify Integration: 2 (performance_entries, weekly_updates)
- Shared: 2 (vendors, playlists - used by both Instagram and Spotify)

### Enums: 0
(Uses TEXT with CHECK constraints instead)

### Functions: 3
- update_updated_at_column, get_spotify_token, update_playlist_avg_streams, trigger_update_playlist_avg

### Indexes: 30+
- GIN indexes on array/JSONB columns
- B-tree indexes on foreign keys, dates, status
- Unique indexes on handles, tokens

### RLS Policies: 25+
- Org-level isolation on all tables
- Public access via tokens (optional)
- Authenticated-only for sensitive pricing data

---

## Key Relationships

```
instagram_campaigns
  ├─> instagram_campaign_creators (1:many) - Assigned creators
  ├─> instagram_campaign_posts (1:many) - Created posts
  └─> instagram_algorithm_learning_log (1:many) - Algorithm decisions

instagram_campaign_creators
  ├─> creators (many:1) - Creator details
  └─> instagram_campaigns (many:1) - Campaign reference

instagram_campaign_posts
  ├─> creators (many:1) - Creator who posted
  ├─> instagram_campaigns (many:1) - Campaign reference
  └─> instagram_post_analytics (1:many) - Performance metrics

creators
  ├─> instagram_campaign_creators (1:many) - Campaign assignments
  └─> instagram_campaign_posts (1:many) - Posts created

playlists
  ├─> vendors (many:1) - Playlist owner
  └─> performance_entries (1:many) - Daily performance

vendors
  └─> playlists (1:many) - Owned playlists

instagram_ab_tests
  └─> instagram_campaigns (via control_campaigns, test_campaigns arrays)
```

---

## Migration to Unified Database

### Adapted Tables (Prefixed with `instagram_`)
Most tables were prefixed with `instagram_` to avoid naming conflicts:
- `campaigns` → `instagram_campaigns`
- `campaign_creators` → `instagram_campaign_creators`
- `campaign_posts` → `instagram_campaign_posts`
- `post_analytics` → `instagram_post_analytics`
- `tags` → `instagram_tags`
- `algorithm_learning_log` → `instagram_algorithm_learning_log`
- `ab_tests` → `instagram_ab_tests`

### Unprefixed Shared Tables
These tables remain unprefixed as shared resources:
- `creators` - Shared across Instagram and potentially other platforms
- `vendors` - Shared across Spotify integrations
- `playlists` - Shared across Spotify integrations
- `performance_entries` - Shared performance tracking
- `weekly_updates` - Shared reporting

### Added Columns
- `org_id UUID REFERENCES orgs(id)` - Added to all tables for multi-tenancy

### RLS Policies Updated
All RLS policies updated to include org-level isolation:
```sql
org_id = auth.jwt() -> 'app_metadata' ->> 'org_id'::text
```

---

## Business Logic Notes

### Creator Selection Algorithm
- **Inputs:**
  - Campaign targeting (genres, territories, content types)
  - Budget constraints
  - Creator count needed
- **Scoring:**
  - Match score (how well does creator fit targeting?)
  - Performance score (historical performance)
  - Cost efficiency (engagement per dollar)
- **Output:**
  - Ranked list of creators with estimated reach
  - Total cost calculation
  - Expected engagement metrics

### Payment Workflow
1. Creator assigned to campaign → `payment_status: 'unpaid'`
2. Content created and approved → `approval_status: 'approved'`
3. Content posted → `post_status: 'posted'`
4. Payment processed → `payment_status: 'paid'`
5. Track in external accounting system

### Public Campaign Sharing
- **Enable:** Set `public_access_enabled = true`
- **Generate token:** Create unique `public_token`
- **Share URL:** `https://app.example.com/campaigns/public/{public_token}`
- **Access:** No authentication required, read-only
- **Use case:** Share campaign progress with clients

### Spotify vs Instagram Campaigns
Both campaign types can coexist in the same system:
- **Instagram:** Creator posts, engagement metrics
- **Spotify:** Playlist placements, stream metrics
- **Shared:** Budget tracking, client management, reporting

### Algorithm Versioning
- Each algorithm decision logged with `algorithm_version`
- A/B tests compare versions
- Winning versions deployed
- Historical logs retained for analysis

---

## Common Queries

### Get Campaign Performance Summary
```sql
SELECT 
  c.name,
  c.budget,
  COUNT(DISTINCT cc.creator_id) as creator_count,
  COUNT(DISTINCT cp.id) as post_count,
  SUM(pa.views) as total_views,
  SUM(pa.likes + pa.comments + pa.shares + pa.saves) as total_engagement,
  AVG(pa.engagement_rate) as avg_engagement_rate
FROM instagram_campaigns c
LEFT JOIN instagram_campaign_creators cc ON c.id = cc.campaign_id
LEFT JOIN instagram_campaign_posts cp ON c.id = cp.campaign_id
LEFT JOIN instagram_post_analytics pa ON cp.id = pa.post_id
WHERE c.id = :campaign_id
GROUP BY c.id;
```

### Find Best Performing Creators
```sql
SELECT 
  cr.instagram_handle,
  cr.followers,
  cr.engagement_rate,
  AVG(pa.views) as avg_views,
  AVG(pa.engagement_rate) as avg_post_engagement
FROM creators cr
JOIN instagram_campaign_posts cp ON cr.id = cp.creator_id
JOIN instagram_post_analytics pa ON cp.id = pa.post_id
GROUP BY cr.id
ORDER BY avg_post_engagement DESC
LIMIT 10;
```

### Get Campaign Creator Status
```sql
SELECT 
  cr.instagram_handle,
  cc.payment_status,
  cc.post_status,
  cc.approval_status,
  cc.scheduled_date,
  cc.payment_amount
FROM instagram_campaign_creators cc
JOIN creators cr ON cc.creator_id = cr.id
WHERE cc.campaign_id = :campaign_id
ORDER BY cc.created_at;
```

### Calculate Spotify Playlist ROI
```sql
WITH playlist_streams AS (
  SELECT 
    pl.id,
    pl.name,
    pl.vendor_id,
    SUM(pe.daily_streams) as total_streams
  FROM playlists pl
  JOIN performance_entries pe ON pl.id = pe.playlist_id
  WHERE pe.campaign_id = :campaign_id
  GROUP BY pl.id
),
vendor_costs AS (
  SELECT 
    v.id,
    v.cost_per_1k_streams
  FROM vendors v
)
SELECT 
  ps.*,
  vc.cost_per_1k_streams,
  (ps.total_streams / 1000.0) * vc.cost_per_1k_streams as total_cost
FROM playlist_streams ps
JOIN vendor_costs vc ON ps.vendor_id = vc.id
ORDER BY total_streams DESC;
```

---

## Next Steps

1. ✅ **Schema Deployed** - All tables created in unified database
2. ⏳ **Data Migration** - Migrate existing data from original database (if needed)
3. ⏳ **Frontend Integration** - Connect React components to new tables
4. ⏳ **API Routes** - Build API endpoints for CRUD operations
5. ⏳ **Instagram Scraper** - Set up automated analytics collection
6. ⏳ **Spotify API** - Integrate Spotify Web API for playlist management
7. ⏳ **Algorithm Deployment** - Implement creator selection algorithm
8. ⏳ **A/B Testing Framework** - Build testing infrastructure

---

**End of Instagram Database Schema Documentation**

