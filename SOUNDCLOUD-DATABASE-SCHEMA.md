# SoundCloud Database Schema - Complete Documentation

**Platform:** Artist Spark (SoundCloud Repost Network)  
**Source:** `artist-spark` repository (72 migrations analyzed)  
**Status:** ✅ **Deployed to Unified Database** (migration 043)  
**Last Updated:** November 13, 2024

---

## 🎉 Current Status & Import Statistics

**Database Status:** ✅ **OPERATIONAL**  
**CSV Data Import:** ✅ **COMPLETED** (November 13, 2024)

### Import Results

| Metric | Value |
|--------|-------|
| **CSV File** | `SoundCloud-All Campaigns.csv` |
| **Total Rows** | 2,149 submissions |
| **Successfully Imported** | 865 submissions (40.2% success rate) |
| **Errors** | 0 submissions |
| **Skipped** | 1,284 submissions (60% - missing URLs or invalid data) |
| **Database Total** | 2,083 submissions (865 new + 1,218 existing) |

### Import Statistics Breakdown

**Why low success rate?**
The CSV contains many rows with:
- Empty "Track URL" fields (required)
- Non-SoundCloud URLs
- Duplicate entries
- Test/draft submissions

This is normal for operational data - the 865 valid submissions represent real campaigns that were processed.

### Schema Notes

**Current Tables:**
1. ✅ `soundcloud_submissions` - Track submission requests
2. ✅ `soundcloud_members` - T1-T4 channel owners
3. ✅ `soundcloud_clients` - Artists requesting promotion
4. ✅ `soundcloud_salespersons` - Sales team members

**Multi-Tier System:**
The platform uses a credit-based tiering system (T1-T4) where members earn credits for reposting, which determines their tier level and access to higher-value campaigns.

### Import Script

**Location:** `scripts/import-soundcloud-submissions.ts`

**Features:**
- Maps CSV "Track URL" to SoundCloud URLs
- Extracts track titles from URLs
- Creates client records from CSV data
- Creates salesperson records
- Maps genres and service types
- Handles date parsing for start/end dates
- Validates SoundCloud URLs (must contain "soundcloud.com")

**Service Type Mapping:**
- "Submit to Roster" → `roster_placement`
- "Repost Network" → `repost_network`
- "Plays Playlist" → `playlist_placement`

**Import Validation:**
- ✅ Validates required fields (track_url)
- ✅ Ensures proper URL format
- ✅ Filters out test/draft entries
- ✅ Deduplicates by track URL + client name

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Member Management](#member-management)
4. [Campaign & Queue System](#campaign--queue-system)
5. [Credit System](#credit-system)
6. [Automation & Notifications](#automation--notifications)
7. [Analytics & Attribution](#analytics--attribution)
8. [Enums & Types](#enums--types)
9. [Functions & Triggers](#functions--triggers)
10. [RLS Policies](#rls-policies)
11. [Indexes](#indexes)
12. [Data Flow Diagrams](#data-flow-diagrams)

---

## Overview

The SoundCloud app (Artist Spark) is a **SoundCloud repost network management platform** that connects artists who want promotion with supporters who have repost channels. It manages:

- **Member tier system** (T1-T4 based on follower count)
- **Credit-based repost economy** (members earn/spend credits)
- **Track submission workflow** (artists submit → ops approve → supporters repost)
- **Daily queue generation** (automated matching of tracks to supporters)
- **Paid campaign management** (client campaigns with attribution tracking)
- **Integration with Influence Planner** (external scheduling tool)

---

## Core Tables

### `soundcloud_user_roles` 
**Purpose:** Role-Based Access Control (RBAC)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `user_id` | UUID | REFERENCES auth.users(id) | Auth user ID |
| `role` | soundcloud_app_role | NOT NULL | admin, moderator, or member |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_soundcloud_user_roles_user_id` on (user_id)
- `idx_soundcloud_user_roles_org_id` on (org_id)

**RLS:** Users can view their own roles

---

### `soundcloud_genre_families`
**Purpose:** Top-level genre taxonomy (Electronic, Hip-Hop, Rock, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL UNIQUE | Genre family name |
| `active` | BOOLEAN | DEFAULT true | Is genre active? |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Sample Data:**
- Electronic
- Hip-Hop
- Rock
- Pop
- R&B

---

### `soundcloud_subgenres`
**Purpose:** Detailed subgenre taxonomy with pattern matching

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `family_id` | UUID | REFERENCES soundcloud_genre_families(id) | Parent genre family |
| `name` | TEXT | NOT NULL | Subgenre name |
| `patterns` | TEXT[] | DEFAULT '{}' | Matching patterns for auto-classification |
| `active` | BOOLEAN | DEFAULT true | Is subgenre active? |
| `order_index` | INTEGER | DEFAULT 0 | Display order |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Sample Subgenres:**
- Electronic → Dubstep, Future Bass, Trance, House, Techno
- Hip-Hop → Trap, Boom Bap, Cloud Rap, Drill
- Rock → Alternative Rock, Post Rock, Progressive Rock, Indie Rock

**Indexes:**
- `idx_soundcloud_subgenres_family_id` on (family_id)

---

## Member Management

### `soundcloud_members`
**Purpose:** Artists & supporters in the repost network

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL | Member display name |
| `emails` | TEXT[] | DEFAULT '{}' | Array of emails (max 5) |
| `primary_email` | TEXT | | Primary contact email |
| `status` | soundcloud_member_status | DEFAULT 'active' | active, needs_reconnect |
| **Tier & Followers** | | | |
| `followers` | INTEGER | DEFAULT 0 | DEPRECATED: Use member_accounts |
| `soundcloud_followers` | INTEGER | DEFAULT 0 | SoundCloud follower count |
| `size_tier` | soundcloud_size_tier | DEFAULT 'T1' | T1, T2, T3, or T4 |
| `tier_updated_at` | TIMESTAMPTZ | | Last tier update timestamp |
| **URLs & Handles** | | | |
| `soundcloud_url` | TEXT | | SoundCloud profile URL |
| `soundcloud_handle` | TEXT | | SoundCloud username |
| `spotify_handle` | TEXT | | Spotify artist handle |
| **Genre Classification** | | | |
| `families` | TEXT[] | DEFAULT '{}' | DEPRECATED: Use member_genres |
| `subgenres` | TEXT[] | DEFAULT '{}' | DEPRECATED: Use member_genres |
| `genre_family_id` | UUID | REFERENCES genre_families(id) | Primary genre family |
| `manual_genres` | TEXT[] | DEFAULT '{}' | Manually assigned genres |
| `genre_notes` | TEXT | | Notes on genre classification |
| **Credit System** | | | |
| `monthly_submission_limit` | INTEGER | DEFAULT 4 | Max submissions per month |
| `submissions_this_month` | INTEGER | DEFAULT 0 | Current month submission count |
| `monthly_credit_limit` | INTEGER | DEFAULT 1000 | DEPRECATED: Use repost_credit_wallet |
| `reach_factor` | DECIMAL(4,3) | DEFAULT 0.060 | Credit earning multiplier |
| `credits_given` | INTEGER | DEFAULT 0 | Total credits earned |
| `credits_used` | INTEGER | DEFAULT 0 | Total credits spent |
| `net_credits` | INTEGER | DEFAULT 0 | Current credit balance |
| `credits_monthly_grant` | INTEGER | DEFAULT 1 | Monthly credit grant |
| `credits_balance` | INTEGER | DEFAULT 1 | Current credit balance |
| `credits_cap` | INTEGER | DEFAULT 3 | Maximum credit balance |
| `last_grant_at` | TIMESTAMPTZ | | Last credit grant timestamp |
| **Activity Tracking** | | | |
| `last_submission_at` | TIMESTAMPTZ | | Last submission timestamp |
| `last_activity_at` | TIMESTAMPTZ | DEFAULT now() | Last activity timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Tier System:**
- **T1:** 0 - 1,000 followers → 1 credit/month
- **T2:** 1,000 - 10,000 followers → 1 credit/month
- **T3:** 10,000 - 100,000 followers → 2 credits/month
- **T4:** 100,000+ followers → 3 credits/month

**Indexes:**
- `idx_soundcloud_members_emails` (GIN index on emails array)
- `idx_soundcloud_members_status` on (status)
- `idx_soundcloud_members_org_id` on (org_id)

---

### `soundcloud_member_accounts`
**Purpose:** Platform connections for multi-platform support

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `member_id` | UUID | REFERENCES soundcloud_members(id) | Member reference |
| `platform` | TEXT | CHECK (soundcloud, spotify) | Platform type |
| `handle` | TEXT | NOT NULL | Platform username |
| `follower_count` | INTEGER | DEFAULT 0 | Current follower count |
| `status` | soundcloud_connection_status | DEFAULT 'linked' | Connection health status |
| `last_synced_at` | TIMESTAMPTZ | | Last sync timestamp |
| `connection_data` | JSONB | DEFAULT '{}' | Platform-specific data |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Unique Constraint:** (member_id, platform)

---

### `soundcloud_member_genres`
**Purpose:** Many-to-many relationship between members and genres

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `member_id` | UUID | REFERENCES soundcloud_members(id) | Member reference |
| `genre_family_id` | UUID | REFERENCES genre_families(id) | Genre family reference |
| `subgenre_id` | UUID | REFERENCES subgenres(id) | Subgenre reference |
| `assigned_by` | UUID | REFERENCES auth.users(id) | Who assigned this genre |
| `assigned_at` | TIMESTAMPTZ | DEFAULT now() | Assignment timestamp |

**Unique Constraint:** (member_id, genre_family_id, subgenre_id)

---

### `soundcloud_avoid_list_items`
**Purpose:** Per-member exclusions (don't match with these accounts)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `member_id` | UUID | REFERENCES soundcloud_members(id) | Member reference |
| `avoided_handle` | TEXT | NOT NULL | Handle to avoid |
| `platform` | TEXT | DEFAULT 'soundcloud' | Platform type |
| `reason` | TEXT | | Reason for avoidance |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Unique Constraint:** (member_id, avoided_handle, platform)

---

### `soundcloud_member_import_history`
**Purpose:** Track bulk member imports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `imported_by` | UUID | REFERENCES auth.users(id) | Who performed import |
| `filename` | TEXT | | Source filename |
| `total_records` | INTEGER | DEFAULT 0 | Total records in file |
| `successful_imports` | INTEGER | DEFAULT 0 | Successfully imported |
| `failed_imports` | INTEGER | DEFAULT 0 | Failed imports |
| `import_data` | JSONB | DEFAULT '{}' | Import metadata |
| `errors` | JSONB | DEFAULT '[]' | Error details |
| `status` | TEXT | | pending, processing, completed, failed |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Import start time |
| `completed_at` | TIMESTAMPTZ | | Import completion time |

---

## Campaign & Queue System

### `soundcloud_submissions`
**Purpose:** Track submissions from members (artists wanting reposts)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `member_id` | UUID | REFERENCES soundcloud_members(id) | Submitting member |
| **Track Info** | | | |
| `track_url` | TEXT | NOT NULL | SoundCloud track URL |
| `artist_name` | TEXT | | Artist name |
| `family` | TEXT | | Primary genre family |
| `subgenres` | TEXT[] | DEFAULT '{}' | Subgenre tags |
| **Status & Workflow** | | | |
| `status` | soundcloud_submission_status | DEFAULT 'new' | new, pending, approved, rejected, qa_flag |
| `submitted_at` | TIMESTAMPTZ | DEFAULT now() | Submission timestamp |
| `support_date` | DATE | | Scheduled repost date |
| `support_url` | TEXT | | Proof of repost URL |
| `scheduled_date` | DATE | | IP schedule date |
| `auto_shifted` | BOOLEAN | DEFAULT false | Was automatically rescheduled? |
| `shift_reason` | TEXT | | Reason for rescheduling |
| **Reach Planning** | | | |
| `expected_reach_min` | INTEGER | DEFAULT 0 | Minimum expected reach |
| `expected_reach_max` | INTEGER | DEFAULT 0 | Maximum expected reach |
| `expected_reach_planned` | INTEGER | DEFAULT 0 | Planned reach |
| `suggested_supporters` | UUID[] | DEFAULT '{}' | Suggested member IDs |
| `credits_consumed` | INTEGER | DEFAULT 0 | Credits spent on this submission |
| **Quality Assurance** | | | |
| `need_live_link` | BOOLEAN | DEFAULT false | Does track need live link? |
| `qa_flag` | BOOLEAN | DEFAULT false | DEPRECATED: Use status |
| `qa_reason` | TEXT | | Reason for QA flag |
| `notes` | TEXT | | Internal notes |
| **Integration** | | | |
| `ip_tracking_url` | TEXT | | Influence Planner tracking URL |
| `ip_schedule_ids` | TEXT[] | DEFAULT '{}' | IP schedule IDs |
| **Metadata** | | | |
| `owner_id` | UUID | REFERENCES auth.users(id) | Assigned ops person |
| `resend_message_ids` | TEXT[] | DEFAULT '{}' | Email tracking IDs |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_soundcloud_submissions_status` on (status)
- `idx_soundcloud_submissions_member_id` on (member_id)
- `idx_soundcloud_submissions_support_date` on (support_date)
- `idx_soundcloud_submissions_org_id` on (org_id)

---

### `soundcloud_campaigns`
**Purpose:** Paid client campaigns (different from member submissions)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `client_id` | UUID | REFERENCES clients(id) | Client reference |
| **Track Info** | | | |
| `artist_name` | TEXT | NOT NULL | Artist name |
| `track_name` | TEXT | NOT NULL | Track title |
| `track_url` | TEXT | NOT NULL | SoundCloud track URL |
| **Campaign Details** | | | |
| `goal_reposts` | INTEGER | DEFAULT 0 | Target repost count |
| `price_usd` | DECIMAL(10,2) | | Campaign price |
| `status` | soundcloud_campaign_status | DEFAULT 'intake' | Campaign status |
| `start_date` | DATE | | Campaign start date |
| `end_date` | DATE | | Campaign end date |
| **Attribution & Tracking** | | | |
| `ip_tracking_url` | TEXT | | Influence Planner tracking |
| `baseline_captured_at` | TIMESTAMPTZ | | When baseline metrics captured |
| `attribution_end_date` | DATE | | Stop attribution tracking |
| **Metadata** | | | |
| `created_by` | UUID | REFERENCES auth.users(id) | Campaign creator |
| `approved_by` | UUID | REFERENCES auth.users(id) | Campaign approver |
| `approved_at` | TIMESTAMPTZ | | Approval timestamp |
| `notes` | TEXT | | Internal notes |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Campaign Status Flow:**
`intake` → `draft` → `scheduled` → `live` → `completed` (or `paused`)

---

### `soundcloud_queues`
**Purpose:** Daily generated queues of repost assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `date` | DATE | NOT NULL | Queue date |
| `status` | TEXT | DEFAULT 'draft' | draft, approved, published |
| `total_slots` | INTEGER | DEFAULT 0 | Total available slots |
| `filled_slots` | INTEGER | DEFAULT 0 | Slots with assignments |
| **Workflow** | | | |
| `created_by_id` | UUID | REFERENCES auth.users(id) | Queue creator |
| `approved_by_id` | UUID | REFERENCES auth.users(id) | Queue approver |
| `approved_at` | TIMESTAMPTZ | | Approval timestamp |
| `published_at` | TIMESTAMPTZ | | Publication timestamp |
| `notes` | TEXT | | Queue notes |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_soundcloud_queues_date` on (date)
- `idx_soundcloud_queues_status` on (status)

---

### `soundcloud_queue_assignments`
**Purpose:** Individual repost assignments within a queue

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `queue_id` | UUID | REFERENCES soundcloud_queues(id) | Parent queue |
| `submission_id` | UUID | REFERENCES soundcloud_submissions(id) | Track to repost |
| `supporter_id` | UUID | REFERENCES soundcloud_members(id) | Member doing repost |
| `position` | INTEGER | NOT NULL | Position in queue |
| `credits_allocated` | INTEGER | DEFAULT 0 | Credits assigned |
| **Status & Proof** | | | |
| `status` | TEXT | DEFAULT 'assigned' | assigned, completed, skipped, failed |
| `completed_at` | TIMESTAMPTZ | | Completion timestamp |
| `proof_url` | TEXT | | Proof of repost URL |
| `proof_submitted_at` | TIMESTAMPTZ | | Proof submission time |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Unique Constraints:**
- (queue_id, position)
- (queue_id, submission_id, supporter_id)

**Indexes:**
- `idx_soundcloud_queue_assignments_queue_id` on (queue_id)
- `idx_soundcloud_queue_assignments_supporter_id` on (supporter_id)
- `idx_soundcloud_queue_assignments_submission_id` on (submission_id)
- `idx_soundcloud_queue_assignments_status` on (status)

---

### `soundcloud_target_proposals`
**Purpose:** Store target builder results (suggested supporters for tracks)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `parent_type` | TEXT | CHECK (campaign, submission) | Parent object type |
| `parent_id` | UUID | NOT NULL | Parent object ID |
| `criteria` | JSONB | DEFAULT '{}' | Matching criteria used |
| `proposed_targets` | JSONB | DEFAULT '[]' | Array of suggested members |
| `total_capacity` | INTEGER | DEFAULT 0 | Total reach capacity |
| `estimated_credits` | INTEGER | DEFAULT 0 | Estimated credit cost |
| `conflicts` | JSONB | DEFAULT '[]' | Conflicting assignments |
| `created_by` | UUID | REFERENCES auth.users(id) | Proposal creator |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `expires_at` | TIMESTAMPTZ | DEFAULT now() + 24h | Expiration timestamp |

---

### `soundcloud_schedules`
**Purpose:** Track individual Influence Planner schedule items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `ip_schedule_id` | TEXT | UNIQUE | Influence Planner schedule ID |
| `parent_type` | TEXT | CHECK (campaign, submission) | Parent object type |
| `parent_id` | UUID | NOT NULL | Parent object ID |
| `target_handle` | TEXT | NOT NULL | SoundCloud handle to repost from |
| `member_account_id` | UUID | REFERENCES soundcloud_member_accounts(id) | Member account reference |
| **Scheduling** | | | |
| `scheduled_at` | TIMESTAMPTZ | | Scheduled execution time |
| `completed_at` | TIMESTAMPTZ | | Actual completion time |
| `status` | soundcloud_schedule_status | DEFAULT 'pending' | pending, scheduled, completed, failed, cancelled |
| **Proof & Credits** | | | |
| `proof_url` | TEXT | | Proof of repost URL |
| `credits_allocated` | INTEGER | DEFAULT 0 | Credits allocated |
| **Error Handling** | | | |
| `error_message` | TEXT | | Error details if failed |
| `retry_count` | INTEGER | DEFAULT 0 | Number of retry attempts |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

---

## Credit System

### `soundcloud_repost_credit_wallet`
**Purpose:** Member credit balances (replaces old member credit columns)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `member_id` | UUID | REFERENCES soundcloud_members(id) UNIQUE | Member reference |
| `balance` | INTEGER | NOT NULL, >= 0 | Current credit balance |
| `monthly_grant` | INTEGER | NOT NULL | Monthly credit grant |
| `cap` | INTEGER | NOT NULL | Maximum balance |
| `last_granted_at` | TIMESTAMPTZ | DEFAULT date_trunc('month', now()) | Last grant timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Constraints:**
- `positive_balance`: balance >= 0
- `valid_cap`: cap >= monthly_grant
- `balance_within_cap`: balance <= cap

---

### `soundcloud_repost_credit_ledger`
**Purpose:** Full audit trail of all credit transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `member_id` | UUID | REFERENCES soundcloud_members(id) | Member reference |
| `change_amount` | INTEGER | NOT NULL | Credit change (+/-) |
| `balance_after` | INTEGER | NOT NULL | Balance after transaction |
| `reason` | TEXT | NOT NULL | Transaction reason |
| `reference_type` | TEXT | | schedule, manual, monthly_grant, refund |
| `reference_id` | UUID | | Reference to related object |
| `created_by` | UUID | REFERENCES auth.users(id) | Who made the change |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Transaction timestamp |
| `metadata` | JSONB | DEFAULT '{}' | Additional transaction data |

**Indexes:**
- `idx_soundcloud_repost_credit_ledger_member_id` on (member_id)
- `idx_soundcloud_repost_credit_ledger_created_at` on (created_at DESC)

---

## Automation & Notifications

### `soundcloud_inquiries`
**Purpose:** New member applications/membership requests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL | Applicant name |
| `email` | TEXT | NOT NULL | Applicant email |
| `soundcloud_url` | TEXT | | SoundCloud profile URL |
| `status` | soundcloud_inquiry_status | DEFAULT 'undecided' | undecided, admitted, rejected |
| `admitted_group` | TEXT | | Group they were admitted to |
| `admitted_at` | TIMESTAMPTZ | | Admission timestamp |
| `member_id` | UUID | REFERENCES soundcloud_members(id) | Created member ID (if admitted) |
| `ip_join_confirmed` | BOOLEAN | DEFAULT false | Confirmed Influence Planner join |
| `notes` | TEXT | | Internal notes |
| `owner_id` | UUID | REFERENCES auth.users(id) | Assigned ops person |
| `resend_message_ids` | TEXT[] | DEFAULT '{}' | Email tracking IDs |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_soundcloud_inquiries_status` on (status)

---

### `soundcloud_complaints`
**Purpose:** Track member complaints and issues

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `email` | TEXT | NOT NULL | Complainant email |
| `song_url` | TEXT | | Related song URL |
| `notes` | TEXT | | Complaint details |
| `status` | soundcloud_complaint_status | DEFAULT 'todo' | todo, in_progress, done |
| `owner_id` | UUID | REFERENCES auth.users(id) | Assigned ops person |
| `ack_sent_at` | TIMESTAMPTZ | | Acknowledgment email sent |
| `resend_message_ids` | TEXT[] | DEFAULT '{}' | Email tracking IDs |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_soundcloud_complaints_status` on (status)

---

### `soundcloud_mail_events`
**Purpose:** Track email delivery events (webhooks from email provider)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `message_id` | TEXT | NOT NULL | Email message ID |
| `object_type` | TEXT | CHECK (submission, inquiry, complaint, member) | Related object type |
| `object_id` | UUID | NOT NULL | Related object ID |
| `event_type` | TEXT | NOT NULL | sent, delivered, opened, bounced, etc. |
| `timestamp` | TIMESTAMPTZ | DEFAULT now() | Event timestamp |
| `meta` | JSONB | DEFAULT '{}' | Event metadata |

**Indexes:**
- `idx_soundcloud_mail_events_message_id` on (message_id)
- `idx_soundcloud_mail_events_object` on (object_type, object_id)

---

### `soundcloud_email_templates`
**Purpose:** Reusable email templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `name` | TEXT | NOT NULL UNIQUE | Template name/key |
| `subject` | TEXT | NOT NULL | Email subject line |
| `body_html` | TEXT | NOT NULL | HTML email body |
| `body_text` | TEXT | | Plain text email body |
| `variables` | JSONB | DEFAULT '{}' | Available variables |
| `active` | BOOLEAN | DEFAULT true | Is template active? |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_soundcloud_email_templates_name` on (name)

---

### `soundcloud_email_logs`
**Purpose:** Track sent emails with detailed metrics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `template_name` | TEXT | NOT NULL | Template used |
| `recipient_email` | TEXT | NOT NULL | Recipient email |
| `subject` | TEXT | | Email subject |
| `status` | TEXT | DEFAULT 'pending' | pending, sent, failed, bounced, delivered, opened |
| `error_message` | TEXT | | Error details if failed |
| `resend_message_id` | TEXT | | Email provider message ID |
| `related_object_type` | TEXT | | submission, inquiry, notification |
| `related_object_id` | UUID | | Related object ID |
| `user_id` | UUID | REFERENCES auth.users(id) | Related user |
| `template_data` | JSONB | DEFAULT '{}' | Variables used |
| `metadata` | JSONB | DEFAULT '{}' | Additional metadata |
| **Timestamps** | | | |
| `sent_at` | TIMESTAMPTZ | | Sent timestamp |
| `delivered_at` | TIMESTAMPTZ | | Delivered timestamp |
| `opened_at` | TIMESTAMPTZ | | Opened timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_soundcloud_email_logs_status` on (status)
- `idx_soundcloud_email_logs_template` on (template_name)
- `idx_soundcloud_email_logs_recipient` on (recipient_email)
- `idx_soundcloud_email_logs_created_at` on (created_at DESC)
- `idx_soundcloud_email_logs_related_object` on (related_object_type, related_object_id)

---

### `soundcloud_notifications`
**Purpose:** In-app notifications for users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `user_id` | UUID | NOT NULL REFERENCES auth.users(id) | Recipient user |
| `title` | TEXT | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification message |
| `type` | soundcloud_notification_type | DEFAULT 'info' | Notification type |
| `read` | BOOLEAN | DEFAULT false | Has been read? |
| `action_url` | TEXT | | URL for action button |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Notification Types:** info, success, warning, error, submission, inquiry, queue, support

**Indexes:**
- `idx_soundcloud_notifications_user_id_created_at` on (user_id, created_at DESC)
- `idx_soundcloud_notifications_read` on (read)

**Realtime:** Enabled for push notifications

---

### `soundcloud_automation_templates`
**Purpose:** Email automation templates with triggers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `template_key` | TEXT | NOT NULL UNIQUE | Template identifier |
| `name` | TEXT | NOT NULL | Template display name |
| `subject` | TEXT | NOT NULL | Email subject |
| `body_html` | TEXT | NOT NULL | HTML email body |
| `body_text` | TEXT | | Plain text email body |
| `variables` | JSONB | DEFAULT '{}' | Variable definitions |
| `enabled` | BOOLEAN | DEFAULT true | Is template enabled? |
| `trigger_events` | TEXT[] | DEFAULT '{}' | Events that trigger this |
| `created_by` | UUID | REFERENCES auth.users(id) | Template creator |
| `updated_by` | UUID | REFERENCES auth.users(id) | Last editor |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Default Templates:**
- `reconnect_prompt` - Account reconnection required
- `tier_promotion` - Member tier upgrade notification
- `campaign_tracking` - Campaign launch notification
- `weekly_performance_digest` - Weekly campaign update

---

### `soundcloud_automation_logs`
**Purpose:** Track all automated emails sent

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `template_key` | TEXT | NOT NULL | Template used |
| `recipient_email` | TEXT | NOT NULL | Recipient email |
| `recipient_member_id` | UUID | REFERENCES soundcloud_members(id) | Recipient member |
| `parent_type` | TEXT | | campaign, submission, member |
| `parent_id` | UUID | | Parent object ID |
| `status` | soundcloud_automation_status | DEFAULT 'sent' | Email delivery status |
| `provider_message_id` | TEXT | | Email provider ID |
| `subject` | TEXT | | Email subject |
| `variables_used` | JSONB | DEFAULT '{}' | Variables used in template |
| **Timestamps** | | | |
| `sent_at` | TIMESTAMPTZ | DEFAULT now() | Sent timestamp |
| `delivered_at` | TIMESTAMPTZ | | Delivered timestamp |
| `opened_at` | TIMESTAMPTZ | | Opened timestamp |
| `clicked_at` | TIMESTAMPTZ | | Clicked timestamp |
| `bounced_at` | TIMESTAMPTZ | | Bounced timestamp |
| `error_message` | TEXT | | Error details |
| `retry_count` | INTEGER | DEFAULT 0 | Retry attempts |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

---

### `soundcloud_automation_health`
**Purpose:** Monitor automation system health

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `automation_name` | TEXT | NOT NULL UNIQUE | Automation identifier |
| `status` | TEXT | DEFAULT 'healthy' | healthy, warning, error, disabled |
| **Execution Tracking** | | | |
| `last_run_at` | TIMESTAMPTZ | | Last execution time |
| `last_success_at` | TIMESTAMPTZ | | Last successful run |
| `last_error_at` | TIMESTAMPTZ | | Last error time |
| `last_error_message` | TEXT | | Last error details |
| **Statistics** | | | |
| `success_count` | INTEGER | DEFAULT 0 | Total successful runs |
| `error_count` | INTEGER | DEFAULT 0 | Total errors |
| `total_runs` | INTEGER | DEFAULT 0 | Total executions |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Default Automations:**
- `submission-status-emails`
- `inquiry-status-emails`
- `notification-emails`
- `queue-assignment-emails`

---

## Analytics & Attribution

### `soundcloud_attribution_snapshots`
**Purpose:** Daily metrics for campaigns and submissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `parent_type` | TEXT | CHECK (campaign, submission) | Parent object type |
| `parent_id` | UUID | NOT NULL | Parent object ID |
| `day_index` | INTEGER | NOT NULL | Day number (0 = baseline) |
| `snapshot_date` | DATE | NOT NULL | Snapshot date |
| **Metrics** | | | |
| `plays` | INTEGER | DEFAULT 0 | Total plays |
| `likes` | INTEGER | DEFAULT 0 | Total likes |
| `reposts` | INTEGER | DEFAULT 0 | Total reposts |
| `comments` | INTEGER | DEFAULT 0 | Total comments |
| `followers` | INTEGER | DEFAULT 0 | Artist followers (if tracked) |
| **Metadata** | | | |
| `collected_at` | TIMESTAMPTZ | DEFAULT now() | Collection timestamp |
| `collection_source` | TEXT | DEFAULT 'scraper' | Data source |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |

**Unique Constraint:** (parent_type, parent_id, day_index)

**Purpose:** Used to calculate daily deltas and track campaign performance

---

### `soundcloud_integration_status`
**Purpose:** Monitor health of member account connections

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| `account_handle` | TEXT | NOT NULL | Account handle |
| `platform` | TEXT | DEFAULT 'soundcloud' | Platform type |
| `member_account_id` | UUID | REFERENCES soundcloud_member_accounts(id) | Member account reference |
| `status` | soundcloud_connection_status | DEFAULT 'linked' | Connection health |
| **Health Tracking** | | | |
| `last_check_at` | TIMESTAMPTZ | DEFAULT now() | Last health check |
| `last_success_at` | TIMESTAMPTZ | | Last successful action |
| `error_count` | INTEGER | DEFAULT 0 | Consecutive error count |
| `last_error_message` | TEXT | | Last error details |
| `reconnect_sent_at` | TIMESTAMPTZ | | Reconnect email sent |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Unique Constraint:** (account_handle, platform)

---

### `soundcloud_settings`
**Purpose:** System-wide configuration (singleton table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `org_id` | UUID | REFERENCES orgs(id) | Multi-tenant org isolation |
| **SLA Settings** | | | |
| `decision_sla_hours` | INTEGER | DEFAULT 24 | Hours to review submission |
| `proof_sla_hours` | INTEGER | DEFAULT 24 | Hours to submit proof |
| `inactivity_days` | INTEGER | DEFAULT 90 | Days before marking inactive |
| `preview_cache_days` | INTEGER | DEFAULT 30 | Cache duration for previews |
| **Credit System** | | | |
| `default_reach_factor` | DECIMAL(4,3) | DEFAULT 0.060 | Default credit multiplier |
| `target_band_mode` | soundcloud_target_band_mode | DEFAULT 'balance' | balance or size |
| `size_tier_thresholds` | JSONB | | Tier follower thresholds |
| `adjacency_matrix` | JSONB | DEFAULT '{}' | Genre matching rules |
| **Integrations** | | | |
| `slack_enabled` | BOOLEAN | DEFAULT false | Enable Slack notifications |
| `slack_webhook` | TEXT | | Slack webhook URL |
| `slack_channel` | TEXT | DEFAULT '#soundcloud-groups' | Slack channel |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Default Tier Thresholds:**
```json
{
  "T1": {"min": 0, "max": 1000},
  "T2": {"min": 1000, "max": 10000},
  "T3": {"min": 10000, "max": 100000},
  "T4": {"min": 100000, "max": 999999999}
}
```

---

## Enums & Types

### `soundcloud_app_role`
User roles in the system
```sql
CREATE TYPE soundcloud_app_role AS ENUM ('admin', 'moderator', 'member');
```

### `soundcloud_member_status`
Member account health
```sql
CREATE TYPE soundcloud_member_status AS ENUM ('active', 'needs_reconnect');
```

### `soundcloud_size_tier`
Member tier based on followers
```sql
CREATE TYPE soundcloud_size_tier AS ENUM ('T1', 'T2', 'T3', 'T4');
```

### `soundcloud_submission_status`
Submission workflow states
```sql
CREATE TYPE soundcloud_submission_status AS ENUM ('new', 'pending', 'approved', 'rejected', 'qa_flag');
```

### `soundcloud_inquiry_status`
Inquiry workflow states
```sql
CREATE TYPE soundcloud_inquiry_status AS ENUM ('undecided', 'admitted', 'rejected');
```

### `soundcloud_complaint_status`
Complaint workflow states
```sql
CREATE TYPE soundcloud_complaint_status AS ENUM ('todo', 'in_progress', 'done');
```

### `soundcloud_target_band_mode`
Target selection strategy
```sql
CREATE TYPE soundcloud_target_band_mode AS ENUM ('balance', 'size');
```

### `soundcloud_notification_type`
Notification categories
```sql
CREATE TYPE soundcloud_notification_type AS ENUM ('info', 'success', 'warning', 'error', 'submission', 'inquiry', 'queue', 'support');
```

### `soundcloud_campaign_status`
Campaign lifecycle states
```sql
CREATE TYPE soundcloud_campaign_status AS ENUM ('intake', 'draft', 'scheduled', 'live', 'completed', 'paused');
```

### `soundcloud_schedule_status`
IP schedule execution states
```sql
CREATE TYPE soundcloud_schedule_status AS ENUM ('pending', 'scheduled', 'completed', 'failed', 'cancelled');
```

### `soundcloud_connection_status`
Account connection health
```sql
CREATE TYPE soundcloud_connection_status AS ENUM ('linked', 'reconnect', 'disconnected', 'error');
```

### `soundcloud_automation_status`
Email delivery states
```sql
CREATE TYPE soundcloud_automation_status AS ENUM ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');
```

---

## Functions & Triggers

### `has_role(_user_id UUID, _role soundcloud_app_role)`
**Returns:** BOOLEAN  
**Purpose:** Check if user has a specific role  
**Security:** DEFINER  

```sql
SELECT has_role(auth.uid(), 'admin');
```

### `get_member_id_for_user(_user_id UUID)`
**Returns:** UUID  
**Purpose:** Get member ID for authenticated user  
**Security:** DEFINER  

```sql
SELECT get_member_id_for_user(auth.uid());
```

### `check_user_is_member(_user_email TEXT)`
**Returns:** BOOLEAN  
**Purpose:** Check if email belongs to a member  
**Security:** DEFINER  

```sql
SELECT check_user_is_member('artist@example.com');
```

### `get_user_roles(_user_id UUID)`
**Returns:** TABLE(role soundcloud_app_role)  
**Purpose:** Get all roles for a user  
**Security:** DEFINER  

```sql
SELECT * FROM get_user_roles(auth.uid());
```

### `get_member_for_user(_user_email TEXT)`
**Returns:** TABLE(member data)  
**Purpose:** Get full member details by email  
**Security:** DEFINER  

```sql
SELECT * FROM get_member_for_user('artist@example.com');
```

### `update_automation_health(...)`
**Purpose:** Update automation system health status  
**Security:** DEFINER  

```sql
SELECT update_automation_health('submission-status-emails', true, NULL);
```

### `update_updated_at_column()`
**Returns:** TRIGGER  
**Purpose:** Automatically update updated_at timestamp  

Applied to all tables with updated_at columns

---

## RLS Policies

### User Roles
- ✅ Users can view their own roles
- ✅ Admins can manage all roles

### Genre Families & Subgenres
- ✅ All authenticated users can view
- ✅ Admins can manage

### Members
- ✅ Members can view their own data (matched by email)
- ✅ Ops (admin/moderator) can view/manage all members

### Submissions
- ✅ Members can view their own submissions
- ✅ Members can create submissions for themselves
- ✅ Ops can manage all submissions

### Inquiries
- ✅ Ops can manage all inquiries

### Complaints
- ✅ Ops can manage all complaints

### Mail Events
- ✅ Ops can view all mail events (read-only)

### Settings
- ✅ Admins can view/manage settings

### Queues
- ✅ Ops can manage all queues
- ✅ Members can view published queues

### Queue Assignments
- ✅ Ops can manage all assignments
- ✅ Members can view their own assignments
- ✅ Members can update their own assignment status/proof

### Notifications
- ✅ Users can view/update their own notifications
- ✅ Ops can manage all notifications

### Email Templates
- ✅ Admins can manage templates
- ✅ Moderators can view templates

### All Other Tables
- ✅ Org-level isolation via `org_id`
- ✅ RLS policies filter by org membership

---

## Indexes

### Performance-Critical Indexes

**GIN Indexes (Array fields):**
- `soundcloud_members.emails`
- `soundcloud_subgenres.patterns`

**Composite Indexes:**
- `soundcloud_notifications(user_id, created_at DESC)` - Fast user notification queries
- `soundcloud_mail_events(object_type, object_id)` - Fast event lookups

**Status Indexes:**
- All tables with `status` columns have indexes for filtering

**Foreign Key Indexes:**
- All foreign key columns have indexes for JOIN performance

**Date/Time Indexes:**
- `soundcloud_queues.date`
- `soundcloud_submissions.support_date`
- `soundcloud_email_logs.created_at DESC`

---

## Data Flow Diagrams

### Member Submission Flow

```
1. Member submits track → soundcloud_submissions (status: 'new')
2. Ops reviews → status: 'pending' or 'approved'
3. Target Builder runs → soundcloud_target_proposals created
4. Queue Generator runs → soundcloud_queues + soundcloud_queue_assignments
5. Supporters repost → proof_url submitted
6. Credits deducted → soundcloud_repost_credit_ledger
```

### Paid Campaign Flow

```
1. Client requests campaign → soundcloud_campaigns (status: 'intake')
2. Ops creates campaign → status: 'draft'
3. Target Builder runs → soundcloud_target_proposals
4. Baseline captured → soundcloud_attribution_snapshots (day_index: 0)
5. Schedule created → soundcloud_schedules (via Influence Planner)
6. Campaign goes live → status: 'live'
7. Daily scraper → soundcloud_attribution_snapshots (day_index: 1, 2, 3...)
8. Campaign ends → status: 'completed'
```

### Credit System Flow

```
1. New member → soundcloud_repost_credit_wallet created
2. Monthly grant → soundcloud_repost_credit_ledger (reason: 'monthly_grant')
3. Member submits track → soundcloud_submissions
4. Track gets support → soundcloud_queue_assignments (credits_allocated)
5. Credits deducted → soundcloud_repost_credit_ledger (reason: 'schedule')
6. Balance updated → soundcloud_repost_credit_wallet.balance
```

### Email Automation Flow

```
1. Trigger event → e.g., submission approved
2. Template selected → soundcloud_automation_templates
3. Email sent → soundcloud_automation_logs (status: 'sent')
4. Webhook received → soundcloud_mail_events (event_type: 'delivered')
5. Email opened → soundcloud_automation_logs (opened_at set)
6. Health tracked → soundcloud_automation_health updated
```

---

## Summary Statistics

### Tables: 28
- Core: 8 (users, roles, genres, members, settings)
- Workflow: 7 (submissions, inquiries, complaints, campaigns, queues, assignments, proposals)
- Credit System: 2 (wallet, ledger)
- Automation: 7 (notifications, email templates/logs, automation templates/logs/health, mail events)
- Integration: 5 (member accounts, member genres, avoid list, schedules, integration status, attribution snapshots, import history)

### Enums: 11
- app_role, member_status, size_tier, submission_status, inquiry_status, complaint_status, target_band_mode, notification_type, campaign_status, schedule_status, connection_status, automation_status

### Functions: 6
- has_role, get_member_id_for_user, check_user_is_member, get_user_roles, get_member_for_user, update_automation_health

### Indexes: 30+
- GIN indexes on array columns
- B-tree indexes on foreign keys, status columns, dates

### RLS Policies: 25+
- Org-level isolation on all tables
- Role-based access (admin, moderator, member)
- Self-service for members (view own data, submit tracks)

---

## Key Relationships

```
members
  ├─> member_accounts (1:many) - Platform connections
  ├─> member_genres (1:many) - Genre classification
  ├─> avoid_list_items (1:many) - Exclusion list
  ├─> repost_credit_wallet (1:1) - Credit balance
  ├─> repost_credit_ledger (1:many) - Transaction history
  ├─> submissions (1:many) - Track submissions
  ├─> inquiries (1:1) - Original application
  └─> queue_assignments (1:many) - Support tasks

submissions
  ├─> target_proposals (1:1) - Suggested supporters
  ├─> queue_assignments (1:many) - Daily queue slots
  ├─> schedules (1:many) - IP schedule items
  └─> attribution_snapshots (1:many) - Daily metrics

campaigns
  ├─> target_proposals (1:1) - Suggested supporters
  ├─> schedules (1:many) - IP schedule items
  └─> attribution_snapshots (1:many) - Daily metrics

queues
  └─> queue_assignments (1:many) - Individual assignments
```

---

## Migration to Unified Database

### Adapted Tables (Prefixed with `soundcloud_`)
All original tables were prefixed with `soundcloud_` to avoid naming conflicts in the unified database.

### Added Columns
- `org_id UUID REFERENCES orgs(id)` - Added to all tables for multi-tenancy

### RLS Policies Updated
All RLS policies updated to include org-level isolation:
```sql
org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
```

### Original → Unified Mapping
- `members` → `soundcloud_members`
- `submissions` → `soundcloud_submissions`
- `campaigns` → `soundcloud_campaigns`
- `queues` → `soundcloud_queues`
- etc.

---

## Business Logic Notes

### Credit Economics
- **Earning:** Supporters earn credits proportional to follower count × reach_factor
- **Spending:** Artists spend credits to get reposts (larger supporters cost more credits)
- **Balance:** Members can accumulate up to `credits_cap` (tier-dependent)
- **Monthly Grant:** Credits auto-granted at start of each month

### Tier System
- **Automatic:** Members auto-promoted/demoted based on follower count
- **Thresholds:** Configurable in `soundcloud_settings.size_tier_thresholds`
- **Benefits:** Higher tiers get more monthly credits

### Target Builder
- **Genre Matching:** Uses `soundcloud_settings.adjacency_matrix` for genre compatibility
- **Capacity:** Considers supporter reach (follower_count × reach_factor)
- **Conflicts:** Checks avoid_list_items and recent assignments
- **Balance Mode:** Distributes across all tiers
- **Size Mode:** Prioritizes larger supporters

### Queue Generation
- **Daily:** Generates queues for each day
- **Approval:** Ops review before publishing
- **Publication:** Members see assignments after publication
- **Proof Submission:** Members submit proof URLs after completing reposts

### Influence Planner Integration
- **Schedule Creation:** Creates schedules in IP via API
- **Webhook:** IP calls back on completion
- **Proof:** IP captures proof URL automatically
- **Status Sync:** Bi-directional status synchronization

---

## Common Queries

### Get Member Credit Balance
```sql
SELECT balance, monthly_grant, cap
FROM soundcloud_repost_credit_wallet
WHERE member_id = :member_id;
```

### Get Member's Recent Submissions
```sql
SELECT s.*, m.name as member_name
FROM soundcloud_submissions s
JOIN soundcloud_members m ON s.member_id = m.id
WHERE s.member_id = :member_id
ORDER BY s.created_at DESC
LIMIT 10;
```

### Get Today's Queue Assignments for Member
```sql
SELECT 
  qa.*,
  s.track_url,
  s.artist_name,
  q.date as queue_date
FROM soundcloud_queue_assignments qa
JOIN soundcloud_queues q ON qa.queue_id = q.id
JOIN soundcloud_submissions s ON qa.submission_id = s.id
WHERE qa.supporter_id = :member_id
  AND q.date = CURRENT_DATE
  AND q.status = 'published'
ORDER BY qa.position;
```

### Get Campaign Performance Metrics
```sql
SELECT 
  day_index,
  snapshot_date,
  plays,
  reposts,
  likes,
  comments
FROM soundcloud_attribution_snapshots
WHERE parent_type = 'campaign'
  AND parent_id = :campaign_id
ORDER BY day_index;
```

### Calculate Daily Deltas
```sql
WITH metrics AS (
  SELECT 
    day_index,
    plays,
    LAG(plays) OVER (ORDER BY day_index) as prev_plays
  FROM soundcloud_attribution_snapshots
  WHERE parent_type = 'campaign'
    AND parent_id = :campaign_id
)
SELECT 
  day_index,
  plays,
  plays - COALESCE(prev_plays, 0) as daily_plays
FROM metrics
WHERE day_index > 0;
```

---

## Next Steps

1. ✅ **Schema Deployed** - All tables created in unified database
2. ⏳ **Data Migration** - Migrate existing data from original database (if needed)
3. ⏳ **Frontend Integration** - Connect React components to new tables
4. ⏳ **API Routes** - Build API endpoints for CRUD operations
5. ⏳ **Automation Setup** - Configure email automations and webhooks
6. ⏳ **IP Integration** - Set up Influence Planner API integration

---

**End of SoundCloud Database Schema Documentation**

