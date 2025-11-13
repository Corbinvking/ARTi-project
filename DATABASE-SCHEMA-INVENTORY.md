# Database Schema Inventory - Original Repositories

**Generated**: November 13, 2025  
**Purpose**: Catalog all database schemas from original repos before integration  
**Status**: 🔄 In Progress

---

## 📊 **Summary**

| Platform | Migrations | Has org_id? | Has RLS? | Prefix Needed? | Status |
|----------|-----------|-------------|----------|----------------|--------|
| **SoundCloud** (artist-spark) | 72 files | ❌ No | ✅ Yes | ✅ Yes | 🔄 Needs org_id |
| **Instagram** (seedstorm-builder) | 25 files | ❌ No | ✅ Yes | ✅ Yes | 🔄 Needs org_id |
| **YouTube** (vidi-health-flow) | 65 files | ❌ No | ✅ Yes | ✅ Yes | 🔄 Needs org_id |

---

## 🎧 **SOUNDCLOUD (artist-spark) Schema**

### Source Location
```
C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-source-repos\artist-spark\supabase\migrations\
```

### Migration Count
**72 migration files** (from 2025-08-19 to 2025-09-23)

### Key Tables (First Migration Analysis)

#### Core Tables
1. **`user_roles`** - RBAC system
   - user_id (UUID, FK to auth.users)
   - role (enum: 'admin', 'moderator', 'member')
   - ⚠️ **NO org_id**

2. **`genre_families`** - Genre taxonomy (top-level)
   - id (UUID)
   - name (TEXT, UNIQUE)
   - active (BOOLEAN)
   - ⚠️ **NO org_id**

3. **`subgenres`** - Genre taxonomy (nested)
   - id (UUID)
   - family_id (UUID, FK to genre_families)
   - name (TEXT)
   - patterns (TEXT[])
   - active (BOOLEAN)
   - order_index (INTEGER)
   - ⚠️ **NO org_id**

4. **`members`** - SoundCloud reposting artists (CORE TABLE)
   ```sql
   - id UUID PRIMARY KEY
   - name TEXT NOT NULL
   - followers INTEGER DEFAULT 0
   - size_tier size_tier DEFAULT 'T1'  -- ENUM: T1, T2, T3, T4
   - families TEXT[] DEFAULT '{}'
   - subgenres TEXT[] DEFAULT '{}'
   - emails TEXT[] CHECK (array_length(emails, 1) <= 5)
   - primary_email TEXT
   - status member_status DEFAULT 'active'  -- ENUM: active, needs_reconnect
   - last_submission_at TIMESTAMP
   - monthly_submission_limit INTEGER DEFAULT 4
   - submissions_this_month INTEGER DEFAULT 0
   - monthly_credit_limit INTEGER DEFAULT 1000
   - reach_factor DECIMAL(4,3) DEFAULT 0.060
   - credits_given INTEGER DEFAULT 0
   - credits_used INTEGER DEFAULT 0
   - net_credits INTEGER DEFAULT 0
   ```
   - ⚠️ **NO org_id** - CRITICAL: Needs multi-tenancy

5. **`submissions`** - Track submissions from artists
   ```sql
   - id UUID PRIMARY KEY
   - member_id UUID REFERENCES members(id)
   - track_url TEXT NOT NULL
   - artist_name TEXT
   - subgenres TEXT[]
   - family TEXT
   - status submission_status  -- ENUM: new, approved, rejected
   - support_date DATE
   - support_url TEXT
   - need_live_link BOOLEAN DEFAULT false
   - suggested_supporters UUID[]
   - expected_reach_min INTEGER DEFAULT 0
   - expected_reach_max INTEGER DEFAULT 0
   - expected_reach_planned INTEGER DEFAULT 0
   - qa_flag BOOLEAN DEFAULT false
   - qa_reason TEXT
   - notes TEXT
   - submitted_at TIMESTAMP
   - owner_id UUID REFERENCES auth.users(id)
   - resend_message_ids TEXT[]
   ```
   - ⚠️ **NO org_id**

6. **`inquiries`** - Membership applications
   ```sql
   - id UUID PRIMARY KEY
   - name TEXT NOT NULL
   - email TEXT NOT NULL
   - soundcloud_url TEXT
   - (additional fields in migration)
   ```
   - ⚠️ **NO org_id**

### Enums Defined
```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE member_status AS ENUM ('active', 'needs_reconnect');
CREATE TYPE size_tier AS ENUM ('T1', 'T2', 'T3', 'T4');
CREATE TYPE submission_status AS ENUM ('new', 'approved', 'rejected');
CREATE TYPE inquiry_status AS ENUM ('undecided', 'admitted', 'rejected');
CREATE TYPE complaint_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE target_band_mode AS ENUM ('balance', 'size');
```

### Additional Tables (Need to Read Remaining 71 Migrations)
- complaints
- supporters (repost channels)
- families (genre groups)
- influence_planner_schedules
- attribution_snapshots
- analytics_events
- automation_rules
- notifications
- credit_transactions
- *(57 total tables mentioned in SOUNDCLOUD-PLATFORM-COMPLETE-GUIDE.md)*

### Multi-Tenancy Status
❌ **NOT MULTI-TENANT** - All tables need `org_id UUID REFERENCES orgs(id) ON DELETE CASCADE`

### RLS Status
✅ **RLS ENABLED** - But policies need updating for org isolation

### Prefix Strategy
```
members → soundcloud_members
submissions → soundcloud_submissions
inquiries → soundcloud_inquiries
genre_families → soundcloud_genre_families
subgenres → soundcloud_subgenres
```

---

## 📸 **INSTAGRAM (seedstorm-builder) Schema**

### Source Location
```
C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-source-repos\seedstorm-builder\supabase\migrations\
```

### Migration Count
**25 migration files** (from 2025-08-01 to 2025-09-12)

### Key Tables (First Migration Analysis)

#### Core Tables
1. **`creators`** - Instagram influencers
   ```sql
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - instagram_handle TEXT NOT NULL UNIQUE
   - email TEXT
   - followers BIGINT NOT NULL DEFAULT 0
   - median_views_per_video BIGINT NOT NULL DEFAULT 0
   - engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0
   - base_country TEXT NOT NULL
   - content_types TEXT[] NOT NULL DEFAULT '{}'
   - music_genres TEXT[] NOT NULL DEFAULT '{}'
   - audience_territories TEXT[] NOT NULL DEFAULT '{}'
   - reel_rate INTEGER DEFAULT 0
   - carousel_rate INTEGER DEFAULT 0
   - story_rate INTEGER DEFAULT 0
   - avg_performance_score DECIMAL(5,2) DEFAULT 0
   - campaign_fit_score DECIMAL(5,2) DEFAULT 0
   ```
   - ⚠️ **NO org_id**

2. **`campaigns`** - Instagram campaigns
   ```sql
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - name TEXT NOT NULL
   - brand_name TEXT NOT NULL
   - budget DECIMAL(12,2) NOT NULL
   - description TEXT
   - music_genres TEXT[] NOT NULL DEFAULT '{}'
   - content_types TEXT[] NOT NULL DEFAULT '{}'
   - territory_preferences TEXT[] NOT NULL DEFAULT '{}'
   - post_types TEXT[] NOT NULL DEFAULT '{}'
   - creator_count INTEGER NOT NULL DEFAULT 1
   - status TEXT NOT NULL DEFAULT 'draft'
   - selected_creators JSONB DEFAULT '[]'
   - totals JSONB DEFAULT '{}'
   - results JSONB DEFAULT '{}'
   ```
   - ⚠️ **NO org_id**

3. **`tags`** - Tag management
   ```sql
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - name TEXT NOT NULL
   - type TEXT CHECK (type IN ('music_genre', 'content_type', 'territory'))
   - UNIQUE(name, type)
   ```
   - ⚠️ **NO org_id**

### Additional Tables (Need to Read Remaining 24 Migrations)
- campaign_creators (junction table)
- campaign_posts
- post_analytics
- algorithm_learning_log
- ab_tests
- workflow_rules

### Multi-Tenancy Status
❌ **NOT MULTI-TENANT** - All tables need `org_id`

### RLS Status
✅ **RLS ENABLED** - Policies: "Allow all operations" (needs org isolation)

### Prefix Strategy
```
creators → instagram_creators
campaigns → instagram_campaigns  
tags → instagram_tags
```

**CONFLICT NOTE**: Our unified DB already has `instagram_campaigns` (migration 035), but it's different from this!

---

## 📺 **YOUTUBE (vidi-health-flow) Schema**

### Source Location
```
C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-source-repos\vidi-health-flow\supabase\migrations\
```

### Migration Count
**65 migration files** (from 2025-09-09 to 2025-10-01)

### Key Tables (First Migration Analysis)

#### Core Tables
1. **`clients`** - Client entities
   ```sql
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - name TEXT NOT NULL
   - email TEXT
   - company TEXT
   ```
   - ⚠️ **NO org_id**
   - ⚠️ **CONFLICT**: Shared table in unified DB!

2. **`salespersons`** - Sales team
   ```sql
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - name TEXT NOT NULL
   - email TEXT
   - commission_rate DECIMAL(5,2) DEFAULT 0.00
   ```
   - ⚠️ **NO org_id**
   - ⚠️ **CONFLICT**: Shared table in unified DB!

3. **`campaigns`** - YouTube campaigns
   ```sql
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - campaign_name TEXT NOT NULL
   - youtube_url TEXT NOT NULL
   - client_id UUID REFERENCES clients(id)
   - salesperson_id UUID REFERENCES salespersons(id)
   - service_type service_type NOT NULL
   - genre TEXT
   - goal_views INTEGER DEFAULT 0
   - sale_price DECIMAL(10,2)
   - start_date DATE
   - status campaign_status DEFAULT 'pending'
   
   -- Performance Metrics
   - current_views INTEGER DEFAULT 0
   - views_7_days INTEGER DEFAULT 0
   - current_likes INTEGER DEFAULT 0
   - likes_7_days INTEGER DEFAULT 0
   - current_comments INTEGER DEFAULT 0
   - comments_7_days INTEGER DEFAULT 0
   - subscribers_gained INTEGER DEFAULT 0
   - watch_time INTEGER DEFAULT 0
   - impression_ctr DECIMAL(5,2) DEFAULT 0.00
   
   -- Operational Fields
   - comments_sheet_url TEXT
   - like_server TEXT
   - comment_server TEXT
   - minimum_engagement INTEGER DEFAULT 0
   - wait_time_seconds INTEGER DEFAULT 0
   - sheet_tier TEXT
   - desired_daily INTEGER DEFAULT 0
   
   -- Status Flags
   - views_stalled BOOLEAN DEFAULT FALSE
   - in_fixer BOOLEAN DEFAULT FALSE
   - needs_update BOOLEAN DEFAULT FALSE
   - ask_for_access BOOLEAN DEFAULT FALSE
   - confirm_start_date BOOLEAN DEFAULT FALSE
   - paid_reach BOOLEAN DEFAULT FALSE
   - invoice_status invoice_status DEFAULT 'tbd'
   ```
   - ⚠️ **NO org_id**

4. **`performance_logs`** - Daily performance tracking
   ```sql
   - id UUID PRIMARY KEY
   - campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE
   - metric_type TEXT NOT NULL
   - value INTEGER NOT NULL
   - recorded_at TIMESTAMP
   ```
   - ⚠️ **NO org_id**

5. **`ratio_fixer_queue`** - Queue for fixing engagement ratios
   ```sql
   - id UUID PRIMARY KEY
   - campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE
   - priority priority_level DEFAULT 'medium'
   - status queue_status DEFAULT 'waiting'
   ```
   - ⚠️ **NO org_id**

### Enums Defined
```sql
CREATE TYPE campaign_status AS ENUM ('pending', 'active', 'paused', 'complete');
CREATE TYPE service_type AS ENUM ('worldwide', 'usa', 'uk', 'canada', 'australia', 'organic_push', 'playlist_push');
CREATE TYPE invoice_status AS ENUM ('tbd', 'sent', 'paid');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE queue_status AS ENUM ('waiting', 'processing', 'completed', 'failed');
```

### Additional Tables (Need to Read Remaining 64 Migrations)
- campaign_milestones
- campaign_stats_daily
- server_configs
- vendor_payments
- email_logs
- automation_rules

### Multi-Tenancy Status
❌ **NOT MULTI-TENANT** - All tables need `org_id`

### RLS Status
✅ **RLS ENABLED** - Policies: "Enable all operations for authenticated users"

### Prefix Strategy
```
campaigns → youtube_campaigns
performance_logs → youtube_performance_logs
ratio_fixer_queue → youtube_ratio_fixer_queue
```

**CONFLICT NOTES**:
- `clients` - Shared table, DON'T prefix
- `salespersons` - Shared table, DON'T prefix

### Enum Conflicts
⚠️ **ENUM NAMING CONFLICTS**:
- `campaign_status` - Conflicts with potential SoundCloud enums
- `service_type` - YouTube-specific, needs prefix
- `invoice_status` - Could conflict, needs prefix

**Solution**: Prefix all enums with platform name:
```sql
CREATE TYPE youtube_campaign_status AS ENUM (...)
CREATE TYPE youtube_service_type AS ENUM (...)
CREATE TYPE youtube_invoice_status AS ENUM (...)
```

---

## 🔍 **Critical Issues Found**

### 1. **NO Multi-Tenancy Support**
All 3 platforms lack `org_id` on tables. **MUST ADD** for unified database.

### 2. **Table Name Conflicts**
- ❌ `campaigns` - All 3 platforms use this name
- ❌ `clients` - YouTube uses (but should be shared)
- ❌ `salespersons` - YouTube uses (but should be shared)
- ❌ `tags` - Instagram uses (but could be shared?)

### 3. **Enum Conflicts**
- `campaign_status` - Multiple platforms
- `app_role` - SoundCloud (but we have this in unified DB?)
- `invoice_status` - Multiple platforms

### 4. **Missing in Unified DB**
Current unified DB (migration 011) has BASIC CSV import tables:
```sql
-- Current unified DB
instagram_campaigns (SERIAL id, basic TEXT fields)
youtube_campaigns (SERIAL id, basic TEXT fields)
soundcloud_campaigns (SERIAL id, basic TEXT fields)
```

But original repos have FULL SCHEMAS with:
- UUID ids
- Rich enums
- Performance tracking
- Junction tables
- Analytics
- Automation

**We need to import the FULL schemas, not just the basic CSV tables!**

---

## 📋 **Next Steps**

### Step 1: Read ALL Migrations
- [ ] Parse all 72 SoundCloud migrations
- [ ] Parse all 25 Instagram migrations
- [ ] Parse all 65 YouTube migrations
- [ ] Create complete table inventory per platform

### Step 2: Create Comparison Document
- [ ] Compare original schemas vs current unified DB
- [ ] Identify gaps and differences
- [ ] Plan migration strategy

### Step 3: Create Adapted Migrations
- [ ] Add `org_id` to all tables
- [ ] Prefix platform-specific tables
- [ ] Prefix conflicting enums
- [ ] Update RLS policies for org isolation

### Step 4: Test & Deploy
- [ ] Create validation script
- [ ] Test migrations on local instance
- [ ] Apply to production

---

## 🎯 **Adaptation Rules Summary**

### Rule 1: Add org_id to ALL tables
```sql
org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
```

### Rule 2: Prefix platform-specific tables
```
members → soundcloud_members
campaigns → {platform}_campaigns
```

### Rule 3: Keep shared tables unprefixed
```
clients → clients (no prefix)
vendors → vendors (no prefix)
orgs → orgs (no prefix)
```

### Rule 4: Prefix conflicting enums
```
campaign_status → youtube_campaign_status
service_type → youtube_service_type
```

### Rule 5: Update RLS policies for org isolation
```sql
CREATE POLICY "org_isolation" ON {table}
  FOR ALL USING (org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid()
  ));
```

---

**Generated by Database Schema Agent**  
**Next: Create DATABASE-SCHEMA-COMPARISON.md**

