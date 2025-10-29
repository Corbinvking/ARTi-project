# Campaign Submission System - Complete Plan

## 📋 **Current State Analysis**

### ✅ **What Exists:**
- `campaign_submissions` table with basic fields
- `campaign_groups` table for approved campaigns
- `campaign_allocations_performance` table for vendor assignments
- Campaign intake page with form
- Submission approval flow (basic)

### ❌ **What's Missing:**
1. **Client selector not working** - Can't select existing clients
2. **No Spotify for Artists (SFA) link field** - Only has track_url
3. **No vendor assignment step** - Can't connect vendors during submission
4. **Incomplete submission logic** - Missing validation and data flow
5. **No submission review UI for admins** - Can't easily approve/deny

---

## 🎯 **Complete Feature Requirements**

### **1. Campaign Submission Form (Sales/Manager)**

#### **Step 1: Client & Campaign Info**
- ✅ Salesperson selector
- 🔧 **FIX**: Client selector (dropdown with search)
  - Show existing clients
  - Option to create new client
- ✅ Campaign name
- ✅ Artist name
- 🔧 **ADD**: Spotify Track URL
- 🆕 **ADD**: Spotify for Artists URL (new field)
- ✅ Stream goal
- ✅ Budget/Price paid
- ✅ Start date
- ✅ Duration (days)

#### **Step 2: Campaign Details**
- ✅ Genre selection
- ✅ Territory preferences
- ✅ Notes/special requirements

#### **Step 3: Vendor Assignment (NEW)**
- 🆕 Select vendors for this campaign
- 🆕 Allocate stream goals per vendor
- 🆕 Allocate budget per vendor
- 🆕 Select playlists per vendor (optional at submission)

#### **Step 4: Review & Submit**
- Show all entered data
- Confirm submission
- Status: "Pending Admin Approval"

### **2. Admin Submission Review**

#### **Submissions Dashboard**
- List all pending submissions
- Show: Campaign name, client, salesperson, stream goal, budget
- Filter: Pending / Approved / Rejected
- Sort: Date submitted, salesperson, budget

#### **Submission Detail Modal**
- All campaign info
- Client details
- Vendor assignments
- Actions:
  - ✅ **Approve** → Creates campaign_group + spotify_campaigns
  - ❌ **Reject** → Add rejection reason, notify salesperson
  - 📝 **Request Changes** → Send back with notes

### **3. Data Flow**

```
Salesperson/Manager Creates Submission
    ↓
campaign_submissions (status: pending)
    ↓
Admin Reviews in Submissions Tab
    ↓
Approve → Creates:
    - campaign_groups (parent campaign)
    - spotify_campaigns (songs)
    - campaign_allocations_performance (vendor assignments)
    - campaign_vendor_requests (if vendors selected)
    ↓
Vendors see campaign in their portal
```

---

## 🗄️ **Database Schema Updates Needed**

### **campaign_submissions table - ADD:**
```sql
ALTER TABLE campaign_submissions 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS sfa_url TEXT,
ADD COLUMN IF NOT EXISTS vendor_assignments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS submission_notes TEXT;

-- vendor_assignments structure:
-- [
--   {
--     "vendor_id": "uuid",
--     "vendor_name": "Club Restricted",
--     "allocated_streams": 50000,
--     "allocated_budget": 500.00,
--     "playlist_ids": ["uuid1", "uuid2"]
--   }
-- ]
```

---

## 🛠️ **Implementation Steps**

### **Phase 1: Fix Campaign Submission Form**

1. ✅ **Fix Client Selector**
   - Debug why ClientSelector isn't working
   - Ensure useClients hook fetches data
   - Add create new client option

2. 🆕 **Add SFA URL Field**
   - Add input after track_url
   - Validation: Optional but must be valid URL if provided
   - Help text: "Spotify for Artists link for this track"

3. 🆕 **Add Vendor Assignment Step**
   - New step before final review
   - Multi-select vendors
   - For each vendor:
     - Allocated streams (number input)
     - Allocated budget (dollar input)
     - Optional: Select specific playlists
   - Validation: Total allocated streams <= campaign stream goal
   - Validation: Total allocated budget <= campaign budget

4. ✅ **Update Form Validation**
   - Client required
   - Track URL required
   - SFA URL optional but validated format
   - At least one vendor assigned (or allow admin to assign later?)

### **Phase 2: Create Submission Review UI**

1. 🆕 **Submissions List Page** (`/spotify/submissions`)
   - Table with all submissions
   - Columns: Status, Campaign, Client, Salesperson, Goal, Budget, Date
   - Filters: Status, Salesperson, Date range
   - Click row → Open detail modal

2. 🆕 **Submission Detail Modal**
   - Show all submission data
   - Show vendor assignments
   - Actions section:
     - Approve button
     - Reject button (with reason textarea)
     - Request Changes button (with notes textarea)

3. 🆕 **Approval Logic**
   - Create campaign_group with submission data
   - Create spotify_campaigns record
   - Create campaign_allocations_performance for each vendor
   - Update submission status to 'approved'
   - Notify salesperson (optional)

### **Phase 3: Update Campaign Creation Flow**

1. 🆕 **Direct Campaign Creation** (for admins)
   - Skip submission, create campaign directly
   - Same form but goes straight to active
   - Useful for quick campaign setup

2. ✅ **Link Submissions to Campaigns**
   - When approved, store submission_id in campaign_groups
   - Allows tracking back to original submission

### **Phase 4: Vendor Portal Integration**

1. ✅ **Campaign Visibility**
   - Vendors see campaigns where they have allocations
   - Show their allocated streams/budget
   - Show payment status

2. 🆕 **Campaign Request Workflow** (optional enhancement)
   - Admin can "request" vendor participation
   - Vendor can accept/decline
   - If accepted, allocations created

---

## 📝 **Updated Form Structure**

### **CampaignSubmissionForm.tsx**
```typescript
interface SubmissionFormData {
  // Step 1: Basic Info
  salesperson: string;
  client_id: string;
  campaign_name: string;
  artist_name: string;
  track_url: string;
  sfa_url: string;  // NEW
  stream_goal: number;
  budget: number;
  start_date: string;
  duration_days: number;
  
  // Step 2: Details
  music_genres: string[];
  territory_preferences: string[];
  notes: string;
  
  // Step 3: Vendor Assignments (NEW)
  vendor_assignments: Array<{
    vendor_id: string;
    vendor_name: string;
    allocated_streams: number;
    allocated_budget: number;
    playlist_ids?: string[];
  }>;
}
```

---

## ✅ **Testing Checklist**

### **Submission Flow**
- [ ] Sales can create submission
- [ ] Manager can create submission
- [ ] Client selector shows all clients
- [ ] Can create new client inline
- [ ] SFA URL validates correctly
- [ ] Vendor assignment totals validate
- [ ] Submission appears in admin view

### **Approval Flow**
- [ ] Admin can see all pending submissions
- [ ] Can approve submission
- [ ] Creates campaign_group correctly
- [ ] Creates vendor allocations
- [ ] Vendor sees campaign in portal
- [ ] Can reject with reason
- [ ] Rejected submissions marked correctly

### **Data Integrity**
- [ ] No orphaned submissions
- [ ] All approved campaigns have submission_id
- [ ] Vendor allocations match submission data
- [ ] Client data properly linked

---

## 🚀 **Deployment Strategy**

### **Local Testing**
1. Update migration for new fields
2. Run migration locally
3. Test submission flow
4. Test approval flow
5. Test vendor visibility

### **Production Deployment**
1. Run migration on production
2. Deploy frontend changes
3. Test with real data
4. Monitor for errors

---

## 📊 **Success Metrics**

- Sales/managers can create submissions in < 5 minutes
- Admins can review and approve in < 2 minutes
- 100% of submissions have proper client linkage
- 100% of approved campaigns visible to assigned vendors
- Zero data integrity issues

---

## 🎯 **Next Immediate Actions**

1. **Fix client selector** (blocking issue)
2. **Add SFA URL field** (quick win)
3. **Create vendor assignment step** (core feature)
4. **Build submission review UI** (admin side)
5. **Test end-to-end flow** (validation)

