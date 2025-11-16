# Instagram App - Data Persistence Audit & Implementation Plan

**Goal:** Ensure all data operations (Create, Read, Update, Delete) properly interact with the Supabase database and persist across sessions.

---

## 🔍 Current State Analysis

### ✅ What's Working (READ Operations)

1. **Campaigns Page** (`/instagram/campaigns`)
   - ✅ Fetches campaigns from `instagram_campaigns` table
   - ✅ Displays campaign cards
   - ✅ View details modal
   - ❌ No create/edit/delete functionality

2. **Creators Page** (`/instagram/creators`)
   - ✅ Fetches creators from `creators` table
   - ✅ Displays creator table
   - ⚠️ Has Add/Import/Export buttons (NOT wired to database)
   - ❌ No actual create/edit/delete functionality

### ❌ What's Missing (CREATE, UPDATE, DELETE)

1. **Campaigns:**
   - ❌ Create new campaign
   - ❌ Edit existing campaign
   - ❌ Delete campaign
   - ❌ Update campaign status
   - ❌ Update financial data (spend, remaining)

2. **Creators:**
   - ❌ Add new creator
   - ❌ Edit creator details
   - ❌ Delete creator
   - ❌ Import creators from CSV
   - ❌ Export creators to CSV

3. **Campaign-Creator Relationship:**
   - ❌ Assign creators to campaigns
   - ❌ Track creator performance per campaign

---

## 📋 Implementation Plan

### Phase 1: Campaign CRUD Operations

#### 1.1 Create Campaign
- [ ] Add "New Campaign" button functionality
- [ ] Create campaign form modal
- [ ] Form fields match `instagram_campaigns` schema
- [ ] Insert into database with proper `org_id`
- [ ] Invalidate React Query cache
- [ ] Success/error toast notifications

#### 1.2 Edit Campaign
- [ ] Add edit button to campaign cards/details
- [ ] Pre-populate form with existing data
- [ ] Update campaign in database
- [ ] Refresh UI after update

#### 1.3 Delete Campaign
- [ ] Add delete button with confirmation dialog
- [ ] Remove from database
- [ ] Update UI immediately

#### 1.4 Update Campaign Fields
- [ ] Quick update status dropdown
- [ ] Update financial fields inline
- [ ] Mark tracker/report as sent
- [ ] All updates persist to database

### Phase 2: Creator CRUD Operations

#### 2.1 Create Creator
- [ ] Wire up "Add Creator" button
- [ ] Create form for new creators
- [ ] Include all fields (handle, email, followers, rates, etc.)
- [ ] Insert with proper `org_id`
- [ ] Refresh creator list

#### 2.2 Edit Creator
- [ ] Add edit button to creator rows
- [ ] Edit form modal
- [ ] Update all creator fields
- [ ] Persist changes

#### 2.3 Delete Creator
- [ ] Add delete action
- [ ] Confirmation dialog
- [ ] Check if creator is used in campaigns (warn)
- [ ] Remove from database

#### 2.4 Import/Export
- [ ] CSV import functionality
- [ ] Validate CSV data
- [ ] Bulk insert creators
- [ ] Export creators to CSV

### Phase 3: Campaign-Creator Relationships

#### 3.1 Link Structure
- [ ] Create/verify `campaign_creators` table
- [ ] Link campaigns to creators (many-to-many)
- [ ] Store creator performance per campaign

#### 3.2 Campaign Builder
- [ ] Add creators to campaign
- [ ] Remove creators from campaign
- [ ] Set custom rates per creator
- [ ] Track posts/performance

### Phase 4: Real-time Updates

#### 4.1 Supabase Subscriptions
- [ ] Subscribe to campaign changes
- [ ] Subscribe to creator changes
- [ ] Auto-refresh UI on changes
- [ ] Show "Updated by another user" notifications

#### 4.2 Optimistic Updates
- [ ] Update UI immediately
- [ ] Rollback on error
- [ ] Show loading states

---

## 🗂️ Database Schema Verification

### Tables Needed

1. **instagram_campaigns** ✅ EXISTS
   - Current schema: Migration 011 (TEXT-based)
   - Future: Migration 035 (proper types)

2. **creators** ✅ EXISTS
   - Has proper schema
   - RLS enabled (org_id filter)

3. **campaign_creators** ⚠️ NEEDS VERIFICATION
   - Links campaigns to creators
   - Stores per-creator performance

### Required Columns

**instagram_campaigns:**
```sql
- id (INTEGER PRIMARY KEY)
- org_id (UUID) ← CRITICAL for RLS
- campaign (TEXT) - campaign name
- clients (TEXT) - client/brand name
- start_date (TEXT)
- price (TEXT)
- spend (TEXT)
- remaining (TEXT)
- sound_url (TEXT)
- status (TEXT)
- tracker (TEXT)
- send_tracker (TEXT)
- send_final_report (TEXT)
- invoice (TEXT)
- salespeople (TEXT)
- report_notes (TEXT)
- client_notes (TEXT)
- paid_ops (TEXT)
- created_at, updated_at
```

**creators:**
```sql
- id (UUID PRIMARY KEY)
- org_id (UUID) ← CRITICAL for RLS
- instagram_handle (TEXT UNIQUE)
- email (TEXT)
- base_country (TEXT)
- followers (INTEGER)
- median_views_per_video (INTEGER)
- engagement_rate (DECIMAL)
- reel_rate, carousel_rate, story_rate (DECIMAL)
- content_types (TEXT[])
- music_genres (TEXT[])
- audience_territories (TEXT[])
- created_at, updated_at
```

---

## 🔧 Implementation Order

### Step 1: Add org_id to instagram_campaigns (CRITICAL)
**Why:** Without org_id, RLS will block all data
**Action:** Migration to add org_id column and update existing records

### Step 2: Campaign Edit/Delete
**Why:** Most immediate need - users need to update existing data
**Action:** Add edit and delete functionality to campaign details modal

### Step 3: Creator Edit/Delete
**Why:** Enable creator management
**Action:** Wire up creator table actions

### Step 4: Campaign Create
**Why:** Users need to add new campaigns
**Action:** Campaign builder form

### Step 5: Creator Create/Import
**Why:** Grow creator database
**Action:** Add creator form and CSV import

### Step 6: Campaign-Creator Linking
**Why:** Track which creators are in which campaigns
**Action:** Campaign builder with creator selection

---

## 🧪 Testing Checklist

For each operation, verify:
- [ ] Data persists after browser refresh
- [ ] Changes visible immediately in UI
- [ ] Database actually updated (check via SQL query)
- [ ] RLS policies allow operation
- [ ] org_id correctly set on new records
- [ ] Error handling works
- [ ] Success/error toasts appear
- [ ] React Query cache invalidated
- [ ] Multiple tabs/users see updates

---

## 🚨 Critical Issues to Address First

### Issue 1: instagram_campaigns Missing org_id ⚠️ HIGH PRIORITY
**Problem:** Table doesn't have org_id column
**Impact:** RLS will block all queries once enabled
**Solution:** Add migration to add column and update existing records

### Issue 2: Forms Not Wired to Database
**Problem:** Add/Edit buttons exist but don't save to database
**Impact:** Users can't create/modify data
**Solution:** Connect forms to Supabase mutations

### Issue 3: No Delete Functionality
**Problem:** No way to remove campaigns or creators
**Impact:** Data cleanup impossible
**Solution:** Add delete actions with confirmations

---

## 📁 Files to Modify

### Campaigns
- `apps/frontend/app/(dashboard)/instagram/campaigns/page.tsx` - Add CRUD
- Create: `components/CreateCampaignDialog.tsx` - New file
- Create: `components/EditCampaignDialog.tsx` - New file

### Creators  
- `apps/frontend/app/(dashboard)/instagram/creators/page.tsx` - Wire up actions
- Create: `components/CreateCreatorDialog.tsx` - New file
- Create: `components/EditCreatorDialog.tsx` - New file
- Create: `components/ImportCreatorsDialog.tsx` - New file

### Hooks
- Create: `hooks/useInstagramCampaignMutations.ts` - CRUD operations
- Create: `hooks/useInstagramCreatorMutations.ts` - CRUD operations

### Migrations
- Create: `supabase/migrations/049_add_org_id_to_instagram_campaigns.sql`

---

## 🎯 Success Criteria

✅ **Campaign Management:**
- Create new campaigns via form
- Edit all campaign fields
- Delete campaigns with confirmation
- Updates persist across refresh

✅ **Creator Management:**
- Add creators manually
- Import from CSV
- Edit creator profiles
- Delete creators
- Export to CSV

✅ **Data Integrity:**
- All records have proper org_id
- RLS policies enforce data isolation
- No data lost on refresh
- Concurrent edits handled gracefully

✅ **User Experience:**
- Loading states for all operations
- Success/error feedback
- Optimistic UI updates
- Real-time data sync

---

## 📊 Current Database Status

**Production Database:**
- ✅ 102 campaigns (but missing org_id)
- ✅ 68 creators (with org_id)
- ❌ No campaign-creator links
- ❌ RLS not enforced on campaigns

**Next Action:** Start with Step 1 - Add org_id to campaigns table

