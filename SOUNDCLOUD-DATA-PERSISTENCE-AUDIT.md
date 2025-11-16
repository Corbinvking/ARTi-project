# SoundCloud Data Persistence Audit & Fix Plan

**Status:** 🔴 **CRITICAL ISSUES FOUND**

**Date:** November 16, 2024

---

## 🚨 Critical Issue Discovered

### **Data Mismatch: Read vs Write Tables**

| Operation | Table Used | Status |
|-----------|------------|--------|
| **Fetch Campaigns** (CampaignsPage) | `soundcloud_submissions` | ✅ Works |
| **Create Campaign** (CampaignForm) | `soundcloud_campaigns` | ❌ **WRONG TABLE** |
| **Update Campaign** (CampaignForm) | `soundcloud_campaigns` | ❌ **WRONG TABLE** |
| **Delete Campaign** (CampaignsPage) | `soundcloud_submissions` | ✅ Works |
| **Update Status** (CampaignsPage) | `soundcloud_submissions` | ✅ Works |

**Problem:** When users create or edit campaigns via the form, the data goes to `soundcloud_campaigns` table, but the page reads from `soundcloud_submissions` table!

**Result:** 
- ❌ New campaigns don't appear in the list
- ❌ Edits to campaigns don't persist visually
- ❌ Data is split between two tables inconsistently

---

## 📊 Database Tables Analysis

### **Table 1: `soundcloud_submissions`** (Member Submissions)
**Purpose:** Track submissions from members (artists wanting reposts)  
**Current Data:** 865 imported records ✅  
**Used For:**  
- Member-submitted tracks
- Internal repost network
- Credit-based system

**Key Columns:**
- `id` (uuid)
- `member_id` (uuid) → references `soundcloud_members`
- `track_url` (text)
- `artist_name` (text)
- `track_name` (text) - newly added
- `status` (enum: new, pending, approved, rejected, qa_flag)
- `expected_reach_planned` (integer)
- `support_date` (date)
- `notes` (text)

### **Table 2: `soundcloud_campaigns`** (Paid Client Campaigns)
**Purpose:** Paid client campaigns (different from member submissions)  
**Current Data:** Unknown (possibly empty or has different campaigns)  
**Used For:**  
- Paid promotional campaigns
- Client-specific attribution tracking
- Revenue tracking

**Key Columns:**
- `id` (uuid)
- `client_id` (uuid) → references `soundcloud_clients`
- `track_name` (text)
- `artist_name` (text)
- `track_url` (text)
- `status` (enum: intake, draft, scheduled, live, completed, paused)
- `goal_reposts` (integer)
- `price_usd` (decimal)
- `start_date`, `end_date` (date)
- `ip_tracking_url` (text)

---

## 🔍 Component Audit

### **1. CampaignsPage.tsx**

#### Fetch Operation ✅
```typescript
// Line 136-139
const { data, error } = await supabase
  .from('soundcloud_submissions' as any) // ✅ Correct table
  .select('*')
  .order('created_at', { ascending: false });
```
**Status:** ✅ Working - reads imported data

#### Delete Operation ✅
```typescript
// Line 248-251
const { error } = await supabase
  .from('soundcloud_submissions') // ✅ Correct table
  .delete()
  .eq('id', id);
```
**Status:** ✅ Working - deletes from correct table

#### Update Status Operation ✅
```typescript
// Line 282-285
const { error } = await supabase
  .from('soundcloud_submissions') // ✅ Correct table
  .update({ status: newStatus })
  .eq('id', campaignId);
```
**Status:** ✅ Working - updates correct table

---

### **2. CampaignForm.tsx**

#### Create Operation ❌ **WRONG TABLE**
```typescript
// Line 154-156
const { error } = await supabase
  .from('soundcloud_campaigns') // ❌ WRONG! Should be soundcloud_submissions
  .insert([formData]);
```
**Status:** ❌ **BROKEN** - saves to wrong table!

#### Update Operation ❌ **WRONG TABLE**
```typescript
// Line 141-144
const { error } = await supabase
  .from('soundcloud_campaigns') // ❌ WRONG! Should be soundcloud_submissions
  .update(formData)
  .eq('id', campaign.id);
```
**Status:** ❌ **BROKEN** - updates wrong table!

**Impact:**
- Users can't create new campaigns (they're invisible)
- Users can't edit existing campaigns (changes don't appear)
- Data inconsistency between tables

---

### **3. Client Management** ✅

#### Fetch Clients
```typescript
// Line 77-80
const { data, error } = await supabase
  .from('soundcloud_clients') // ✅ Correct
  .select('id, name, email')
  .order('name');
```
**Status:** ✅ Working

#### Create Client
```typescript
// Line 107-111
const { data, error } = await supabase
  .from('soundcloud_clients') // ✅ Correct
  .insert([newClient])
  .select()
  .single();
```
**Status:** ✅ Working

---

## 🎯 Decision: Which Table Strategy?

We have **three options**:

### **Option A: Use `soundcloud_submissions` Only** ⭐ **RECOMMENDED**
**Reasoning:**
- All imported data (865 records) is in `soundcloud_submissions`
- Already displaying from this table
- Simpler architecture (one table for all campaigns)
- Can add `client_id` field if needed for paid campaigns

**Changes Needed:**
1. Update `CampaignForm` to save to `soundcloud_submissions`
2. Map form fields to match `soundcloud_submissions` schema
3. Add `client_id` to `soundcloud_submissions` if not present

**Pros:**
- ✅ Simplest solution
- ✅ All data in one place
- ✅ Works with existing 865 records

**Cons:**
- ⚠️ Blurs line between member submissions and paid campaigns
- ⚠️ May need to add fields to `soundcloud_submissions`

---

### **Option B: Use Both Tables** 
**Reasoning:**
- Keep member submissions separate from paid campaigns
- Proper data modeling (different business entities)
- Better for long-term maintainability

**Changes Needed:**
1. `CampaignsPage` queries BOTH tables
2. Merge results for display
3. Form determines which table based on context
4. Clear indication in UI which type each campaign is

**Pros:**
- ✅ Better data modeling
- ✅ Clear separation of concerns
- ✅ Proper business logic

**Cons:**
- ⚠️ More complex queries
- ⚠️ Need to handle unions/merges
- ⚠️ More code to maintain

---

### **Option C: Migrate to `soundcloud_campaigns` Only**
**Reasoning:**
- Move all 865 records to `soundcloud_campaigns`
- Use campaigns table as primary

**Changes Needed:**
1. Migration script to move data
2. Update all queries to use `soundcloud_campaigns`
3. Update imports to target `soundcloud_campaigns`

**Pros:**
- ✅ Clean slate
- ✅ "Campaigns" is better name

**Cons:**
- ❌ Breaks existing imports
- ❌ Loses semantic meaning of "submissions"
- ❌ Most work required

---

## 💡 **Recommended Solution: Option A**

**Use `soundcloud_submissions` as the primary table for all campaigns.**

### Why?
1. **Minimal Changes:** Only need to fix `CampaignForm`
2. **Data Preserved:** 865 existing records stay intact
3. **Simple:** One table, one source of truth
4. **Works Now:** Display already working

---

## 🔧 Implementation Plan

### **Step 1: Update CampaignForm to use `soundcloud_submissions`**

#### Changes Needed:

**Field Mapping:**
| Form Field | soundcloud_submissions Column |
|------------|------------------------------|
| `track_name` | `track_name` ✅ (newly added) |
| `artist_name` | `artist_name` ✅ |
| `track_url` | `track_url` ✅ |
| `campaign_type` | *(ignore or map to custom field)* |
| `status` | `status` ✅ |
| `goals` | `expected_reach_planned` ✅ |
| `remaining_metrics` | *(calculate or ignore)* |
| `sales_price` | *(add new field or ignore)* |
| `invoice_status` | *(add new field or ignore)* |
| `start_date` | `support_date` ✅ |
| `client_id` | `member_id` ⚠️ (need to link to members or add client_id) |
| `notes` | `notes` ✅ |

**Issues to Resolve:**
1. `client_id` references `soundcloud_clients`, but `soundcloud_submissions` expects `member_id` referencing `soundcloud_members`
2. Need to either:
   - Create a member record for each client
   - Add `client_id` field to `soundcloud_submissions`
   - Store client name in `artist_name`

---

### **Step 2: Fix CampaignsPage Data Transformation**

Current transformation needs:
- `client_id` field added (line 160)
- Proper mapping of all fields

---

### **Step 3: Handle Client vs Member Issue**

**Recommended Approach:**
- Add `client_id` (nullable) to `soundcloud_submissions` table
- When creating campaign via form:
  - If client selected → set `client_id`, leave `member_id` null
  - If from member → set `member_id`, leave `client_id` null
- Display logic handles both

**Migration:**
```sql
ALTER TABLE soundcloud_submissions 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES soundcloud_clients(id);

CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_client_id 
ON soundcloud_submissions(client_id);
```

---

### **Step 4: Update Other Components**

Need to check:
- ✅ CampaignDetailModal - verify it reads correct data
- ✅ ReceiptLinksManager - verify persistence
- ✅ Any analytics components

---

## 📝 Detailed Fix List

### **File: CampaignForm.tsx**

**Change 1: Update Create Operation**
```typescript
// BEFORE (Line 154-156)
const { error } = await supabase
  .from('soundcloud_campaigns')
  .insert([formData]);

// AFTER
const submissionData = {
  org_id: DEFAULT_ORG_ID, // Need to get from context
  client_id: formData.client_id || null,
  member_id: null, // For client campaigns
  track_url: formData.track_url,
  artist_name: formData.artist_name,
  track_name: formData.track_name,
  status: formData.status.toLowerCase(), // Convert to lowercase enum
  expected_reach_planned: formData.goals,
  support_date: formData.start_date,
  notes: formData.notes,
  submitted_at: new Date().toISOString(),
};

const { error } = await supabase
  .from('soundcloud_submissions' as any)
  .insert([submissionData]);
```

**Change 2: Update Edit Operation**
```typescript
// BEFORE (Line 141-144)
const { error } = await supabase
  .from('soundcloud_campaigns')
  .update(formData)
  .eq('id', campaign.id);

// AFTER
const submissionData = {
  track_url: formData.track_url,
  artist_name: formData.artist_name,
  track_name: formData.track_name,
  status: formData.status.toLowerCase(),
  expected_reach_planned: formData.goals,
  support_date: formData.start_date,
  notes: formData.notes,
  updated_at: new Date().toISOString(),
};

const { error } = await supabase
  .from('soundcloud_submissions' as any)
  .update(submissionData)
  .eq('id', campaign.id);
```

---

### **File: CampaignsPage.tsx**

**Change: Add org_id to Context**
Need to ensure we have org_id available for inserts.

---

## 🧪 Testing Checklist

After fixes, test:

### **Campaign Create**
- [ ] Click "New Campaign"
- [ ] Fill form with all fields
- [ ] Submit
- [ ] ✅ Campaign appears in list immediately
- [ ] ✅ Data persists after refresh
- [ ] ✅ Check database: record in `soundcloud_submissions`

### **Campaign Edit**
- [ ] Click existing campaign
- [ ] Click "Edit"
- [ ] Change track name, artist, etc.
- [ ] Submit
- [ ] ✅ Changes appear immediately
- [ ] ✅ Changes persist after refresh
- [ ] ✅ Check database: record updated in `soundcloud_submissions`

### **Campaign Delete**
- [ ] Click campaign dropdown
- [ ] Click "Delete"
- [ ] Confirm
- [ ] ✅ Campaign removed from list
- [ ] ✅ Removed after refresh
- [ ] ✅ Check database: record deleted from `soundcloud_submissions`

### **Status Update**
- [ ] Change campaign status via dropdown
- [ ] ✅ Status updates immediately
- [ ] ✅ Status persists after refresh
- [ ] ✅ Check database: status updated

---

## 🚀 Deployment Steps

1. **Create Migration** (if adding client_id)
2. **Update CampaignForm.tsx**
3. **Test Locally**
4. **Deploy to Production**
5. **Verify Database Changes**
6. **Test in Production**

---

## 📊 Current Status Summary

| Component | Operation | Status | Fix Needed |
|-----------|-----------|--------|------------|
| CampaignsPage | Fetch | ✅ | None |
| CampaignsPage | Delete | ✅ | None |
| CampaignsPage | Update Status | ✅ | None |
| CampaignForm | Create | ❌ | **YES - Wrong table** |
| CampaignForm | Update | ❌ | **YES - Wrong table** |
| Client Management | All | ✅ | None |

---

**Next Steps:**
1. Get user approval on Option A (use `soundcloud_submissions`)
2. Implement fixes to `CampaignForm.tsx`
3. Create migration for `client_id` field if needed
4. Test thoroughly
5. Deploy

---

**Estimated Time:** 30-45 minutes  
**Risk Level:** Medium (touching data persistence)  
**Impact:** High (fixes critical broken functionality)


