# CSV to Database Mapping Analysis

**Date:** November 13, 2024  
**Purpose:** Map CSV columns to database tables for data import

---

## 🎯 Overview

Each platform has CSV export data that needs to be imported into the unified database. This document maps CSV columns to database columns and identifies data transformations needed.

---

## 1. SoundCloud CSV → Database Mapping

### CSV Structure (2,149 records)
```
Track Info, Client, Service Type, Goal, Remaining, Status, URL, Submit Date, Start Date, 
Receipts, Salesperson, Invoice, Sale Price, Confirm Start Date?, Notes, Send Receipt(s), 
Ask Client for Playlist, Last Modified, Salesperson Email
```

### Target Table: `soundcloud_submissions`

| CSV Column | Database Column | Type | Transformation |
|------------|----------------|------|----------------|
| **Track Info** | `track_url` + `artist_name` | TEXT | Parse into artist - track format |
| **Client** | (create/link `soundcloud_members`) | UUID | Look up or create member by name |
| **Service Type** | (meta field) | N/A | "Reposts" - standard service type |
| **Goal** | `expected_reach_planned` | INTEGER | Convert from decimal (40000000.0) |
| **Remaining** | N/A | N/A | Calculated field, not stored |
| **Status** | `status` | TEXT | Map: "Active" → 'approved', "Unreleased" → 'new' |
| **URL** | `track_url` | TEXT | Direct mapping |
| **Submit Date** | `submitted_at` | TIMESTAMPTZ | Parse "9/19/2025" format |
| **Start Date** | `support_date` | DATE | Parse date format |
| **Receipts** | N/A | N/A | Not in schema |
| **Salesperson** | `owner_id` | UUID | Create/link user by name |
| **Invoice** | N/A | N/A | Track separately |
| **Sale Price** | N/A | N/A | Not in submissions schema (campaigns only) |
| **Confirm Start Date?** | `confirm_start_date` | BOOLEAN | "checked" → true, empty → false |
| **Notes** | `notes` | TEXT | Direct mapping |
| **Send Receipt(s)** | N/A | N/A | Workflow field |
| **Ask Client for Playlist** | N/A | N/A | Workflow field |
| **Last Modified** | `updated_at` | TIMESTAMPTZ | Parse timestamp |
| **Salesperson Email** | (link to user) | N/A | Use to find/create user |

### Issues & Solutions

**❌ Problem 1:** CSV tracks are **Spotify URLs** (`https://open.spotify.com/...`) but SoundCloud schema expects SoundCloud URLs

**✅ Solution:** These are actually **cross-platform campaigns** - need to import into a different table or extend schema

**❌ Problem 2:** "Client" field contains artist names, not actual clients

**✅ Solution:** Import as member names, create `soundcloud_members` records

**❌ Problem 3:** No campaign grouping - each row is individual track

**✅ Solution:** Create individual `soundcloud_submissions` for each track

---

## 2. Instagram CSV → Database Mapping

### CSV Structure (169 records)
```
Campaign, Clients, Start Date, Price, Spend, Remaining, Sound URL, Status, Tracker, 
Campaign Started, Send Tracker, Send Final Report, Invoice, Salespeople, Report Notes, 
Client Notes, Paid Ops?
```

### Target Table: `instagram_campaigns`

| CSV Column | Database Column | Type | Transformation |
|------------|----------------|------|----------------|
| **Campaign** | `name` | TEXT | Direct mapping |
| **Clients** | `brand_name` + (link to client) | TEXT | Direct mapping |
| **Start Date** | (calculated from duration) | DATE | Parse date |
| **Price** | `budget` | DECIMAL(12,2) | Parse "$600.00" format |
| **Spend** | (track in totals JSONB) | N/A | Calculate from `budget - remaining` |
| **Remaining** | (calculate) | N/A | Derived field |
| **Sound URL** | (meta field) | TEXT | Store in description or metadata |
| **Status** | `status` | TEXT | Map: "Active" → 'active', "Unreleased" → 'draft', "Complete" → 'completed' |
| **Tracker** | (external link) | TEXT | Store in results JSONB |
| **Campaign Started** | (workflow) | BOOLEAN | "checked" → true |
| **Send Tracker** | (workflow) | BOOLEAN | Not stored |
| **Send Final Report** | (workflow) | BOOLEAN | Not stored |
| **Invoice** | (external) | TEXT | Not in schema |
| **Salespeople** | (link to user) | UUID | Create/link user |
| **Report Notes** | `description` | TEXT | Store in description |
| **Client Notes** | (append to description) | TEXT | Combine with report notes |
| **Paid Ops?** | (workflow) | BOOLEAN | Not stored |

### Issues & Solutions

**❌ Problem 1:** No creator assignments in CSV

**✅ Solution:** Import campaigns without creators initially - can be assigned later

**❌ Problem 2:** "Spend" and "Remaining" suggest this tracks actual spending

**✅ Solution:** Store in `totals` JSONB as `{"budget_spent": 245.00, "budget_remaining": 355.00}`

**❌ Problem 3:** Some campaigns are Instagram, some might be Spotify

**✅ Solution:** Determine by "Sound URL" - if it's a SoundCloud/Spotify link, it's music promotion

---

## 3. YouTube CSV → Database Mapping

### CSV Structure (816 records)
```
Campaign, Clients, Service Type, Goal, Remaining, Desired Daily, URL, Start Date, Status, 
Confirm Start Date?, Ask for Access, Ask Client for YT SS, Views Stalled?, Paid R?, 
Sale Price, Invoice, Comments, In Fixer?, Client Notes
```

### Target Table: `youtube_campaigns`

| CSV Column | Database Column | Type | Transformation |
|------------|----------------|------|----------------|
| **Campaign** | `campaign_name` | TEXT | Direct mapping |
| **Clients** | (link `youtube_clients`) | UUID | Look up or create client |
| **Service Type** | `service_type` | youtube_service_type | Map to enum (see below) |
| **Goal** | `goal_views` | INTEGER | Direct mapping |
| **Remaining** | (calculate) | N/A | `goal_views - current_views` |
| **Desired Daily** | `desired_daily` | INTEGER | Direct mapping |
| **URL** | `youtube_url` | TEXT | Direct mapping |
| **Start Date** | `start_date` | DATE | Parse date |
| **Status** | `status` | youtube_campaign_status | Map to enum |
| **Confirm Start Date?** | `confirm_start_date` | BOOLEAN | Empty → false |
| **Ask for Access** | `ask_for_access` | BOOLEAN | Empty → false |
| **Ask Client for YT SS** | (workflow) | BOOLEAN | Not stored |
| **Views Stalled?** | `views_stalled` | BOOLEAN | Empty → false |
| **Paid R?** | `paid_reach` | BOOLEAN | "Yes" → true, empty → false |
| **Sale Price** | `sale_price` | DECIMAL(10,2) | Parse "$150" format |
| **Invoice** | `invoice_status` | youtube_invoice_status | Map: "Pending" → 'tbd', "Sent" → 'sent' |
| **Comments** | (Google Sheets URL) | TEXT | Store in `comments_sheet_url` |
| **In Fixer?** | `in_fixer` | BOOLEAN | Empty → false |
| **Client Notes** | (notes) | TEXT | Store in campaign notes (not in schema) |

### Service Type Mapping

| CSV Value | Database Enum | Notes |
|-----------|--------------|-------|
| "LATAM Display" | `latam_display` | ✅ Direct match |
| "WW Display" | `ww_display` | ✅ Direct match |
| "WW Skip" | `ww_skip` | ✅ Direct match |
| "US Skip" | `us_skip` | ✅ Direct match |
| "WW Website" | `ww_website` | ✅ Direct match |
| "ENGAGEMENTS ONLY" | `engagements_only` | ✅ Direct match |

### Issues & Solutions

**❌ Problem 1:** CSV doesn't have `client_id` or `salesperson_id` (UUIDs)

**✅ Solution:** 
1. First pass: Create `youtube_clients` from unique client names
2. Second pass: Link campaigns to clients by name lookup

**❌ Problem 2:** Multiple campaigns can have same name + URL (different service types)

**✅ Solution:** These are multi-service campaigns - group by Campaign+URL, aggregate service_types into JSONB array

**❌ Problem 3:** No current performance metrics (current_views, current_likes, etc.)

**✅ Solution:** Initialize all to 0, will be updated by YouTube API later

---

## 📊 Import Strategy

### Phase 1: Create Reference Data
1. **Create users** (salespersons, owners)
2. **Create clients** (YouTube clients, Instagram clients)
3. **Create members** (SoundCloud members)
4. **Create vendors** (if needed for Instagram/Spotify)

### Phase 2: Import Campaigns
1. **YouTube:** Import campaigns, group multi-service entries
2. **Instagram:** Import campaigns
3. **SoundCloud:** Import submissions

### Phase 3: Data Enrichment
1. **Extract video IDs** from YouTube URLs
2. **Parse track info** into artist + track name
3. **Set org_id** to default org
4. **Calculate remaining fields**

### Phase 4: Validation
1. Check for duplicate entries
2. Verify foreign key relationships
3. Validate enum values
4. Check date formats

---

## 🚨 Critical Issues to Address

### Issue 1: Default Organization
**Problem:** All tables require `org_id`, but CSVs don't have org context  
**Solution:** Import all data to a default organization (e.g., "Artist Influence")

```sql
-- Get or create default org
INSERT INTO orgs (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Artist Influence', 'artist-influence')
ON CONFLICT (id) DO NOTHING;
```

### Issue 2: Missing Columns in Schema

**YouTube:** CSV has "Client Notes" but `youtube_campaigns` doesn't have a `notes` column  
**Solution:** Add to migration or store in metadata JSONB

**SoundCloud:** CSV has pricing data but `soundcloud_submissions` doesn't track sale price  
**Solution:** Pricing is tracked at member/campaign level, not submission level

**Instagram:** CSV has "Spend" tracking but schema only has budget  
**Solution:** Use `totals` JSONB field

### Issue 3: Cross-Platform Campaigns

**Problem:** SoundCloud CSV contains Spotify URLs, Instagram CSV contains both IG and Spotify campaigns  
**Solution:** Determine campaign type by URL and route to appropriate table

---

## 🔧 Recommended Schema Updates

### 1. Add `notes` column to `youtube_campaigns`
```sql
ALTER TABLE public.youtube_campaigns 
ADD COLUMN IF NOT EXISTS notes TEXT;
```

### 2. Add service type mapping for YouTube
Already exists in enum - no changes needed ✅

### 3. Consider adding campaign_type discriminator
Already exists in `instagram_campaigns` ✅

---

## 📝 Next Steps

1. ✅ **Analyze CSV structures** - DONE
2. ✅ **Map to database schemas** - DONE
3. ⏳ **Create import scripts** (Node.js/TypeScript)
4. ⏳ **Run imports on development/staging**
5. ⏳ **Validate data integrity**
6. ⏳ **Run imports on production**

---

**End of Mapping Document**

