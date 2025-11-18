# YouTube Campaign Intake UX - Complete Documentation

**Last Updated:** November 18, 2025  
**Component:** `CreateCampaignModal.tsx`  
**User Flow:** Campaign Creation & Onboarding

---

## Overview

The campaign intake process is a **4-step wizard** that guides users through creating a new YouTube campaign with comprehensive validation, auto-population, and client management features.

### Key Features
- ✅ 4-step progressive wizard with visual progress indicator
- ✅ Real-time YouTube URL validation
- ✅ Automatic video title extraction
- ✅ Duplicate campaign detection
- ✅ Inline client creation (no need to leave the modal)
- ✅ Multi-service type support (e.g., organic + paid views)
- ✅ Auto-calculation of daily goals based on dates
- ✅ Comprehensive validation with helpful error messages

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────┐
│         STEP 1: Basic Information              │
│  • YouTube URL (validates & extracts title)    │
│  • Campaign Name (auto-filled from video)      │
│  • Artist Tier (1-3)                           │
│  • Client (searchable dropdown + quick add)    │
│  • Service Types (multi-select with goals)     │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         STEP 2: Campaign Settings              │
│  • Sale Price                                   │
│  • Genre (predefined options)                   │
│  • Start/End Date (calendar pickers)            │
│  • Desired Daily Views (auto-calculated)        │
│  • Campaign Status (pending/active)             │
│  • Salesperson (dropdown)                       │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         STEP 3: Technical Setup                 │
│  • Comments Sheet URL                           │
│  • Like Server (predefined options)             │
│  • Comment Server (predefined options)          │
│  • Wait Time (seconds)                          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         STEP 4: Review & Launch                 │
│  • Summary of all entered data                  │
│  • Final validation                             │
│  • Create button                                │
└─────────────────────────────────────────────────┘
                     ↓
                  SUCCESS!
         Campaign created & redirected
```

---

## Step-by-Step Breakdown

### Step 1: Basic Information
**Purpose:** Capture the essential campaign details and set up the client relationship.

#### Fields

**1. YouTube URL** (Required)
- **Input Type:** Text input with real-time validation
- **Features:**
  - Validates YouTube URL format (supports multiple formats: `youtube.com/watch?v=`, `youtu.be/`, etc.)
  - Shows loading spinner during validation
  - Auto-extracts video ID
  - Attempts to fetch video title from YouTube API
  - Auto-populates campaign name if empty
- **Validation:**
  - Must be a valid YouTube URL
  - Checks for duplicates (same video + same client)
  - Shows specific error messages for validation failures
- **User Experience:**
  - Paste URL → System validates → Extracts title → Pre-fills campaign name
  - Real-time feedback with visual indicators (spinner, checkmark, error icon)

**2. Campaign Name** (Required)
- **Input Type:** Text input
- **Features:**
  - Auto-populated from video title (if API succeeds)
  - Falls back to "Campaign for [video_id]" if API fails
  - User can override auto-filled name
- **Validation:** Must not be empty

**3. Artist Tier** (Optional)
- **Input Type:** Dropdown select
- **Options:** Tier 1, Tier 2, Tier 3
- **Purpose:** Categorize artist by reach/popularity

**4. Client** (Optional but Recommended)
- **Input Type:** Searchable dropdown with inline creation
- **Features:**
  - **Search functionality:**
    - Type to filter clients by name or company
    - Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
    - Shows client name + company in results
    - Highlights selected client
  - **Inline client creation:**
    - "Add [name] as new client" button appears when searching
    - Click to expand inline form
    - Fields: Name (required), Email, Company
    - Creates client and auto-selects without leaving modal
  - **Selected client display:**
    - Shows selected client name + company
    - "Clear" button to deselect
- **User Experience:**
  - Start typing → See filtered results → Select or create new
  - No need to navigate away from campaign creation
  - Seamless flow for new clients

**5. Service Types** (Required - At Least 1)
- **Input Type:** Multi-service selector component
- **Features:**
  - Add multiple service types per campaign
  - Each service type has:
    - Service type dropdown (Organic Views, Paid Promotion, Likes Only, etc.)
    - Goal views input (except for "engagements_only")
    - Custom service type input (if "Other" selected)
  - Add/remove service types dynamically
  - Calculates total goal views across all services
- **Validation:**
  - At least one service type required
  - Each service type must have a type selected
  - Goal views required (unless "engagements_only")
- **User Experience:**
  - Example: "Organic Views (50,000) + Paid Promotion (100,000) = 150,000 total"

#### Step Validation
- All required fields must be filled
- YouTube URL must be valid and not duplicate
- At least one service type with goal views

---

### Step 2: Campaign Settings
**Purpose:** Configure pricing, timeline, and campaign parameters.

#### Fields

**1. Sale Price** (Optional)
- **Input Type:** Number input (decimal, $)
- **Purpose:** Revenue tracking

**2. Genre** (Optional)
- **Input Type:** Dropdown select
- **Options:** Predefined list (Hip Hop, Pop, Rock, EDM, Country, etc.)
- **Purpose:** Campaign categorization and analytics

**3. Start Date** (Optional)
- **Input Type:** Calendar picker (date-fns)
- **Features:**
  - Click to open calendar overlay
  - Visual calendar interface
  - Auto-calculates desired daily views when both start/end dates set
- **User Experience:** Click → Calendar pops up → Select date → Auto-closes

**4. End Date** (Optional)
- **Input Type:** Calendar picker
- **Features:** Same as Start Date
- **Business Logic:** Used with start date to calculate campaign duration

**5. Desired Daily Views** (Auto-Calculated / Optional)
- **Input Type:** Number input (read-only if auto-calculated)
- **Calculation:** `Total Goal Views / Days Between Start & End`
- **Features:**
  - Auto-fills when dates and goals are set
  - Can manually override if auto-calc not applicable
  - Disabled if auto-calculation is active
- **Example:** 150,000 views over 30 days = 5,000 views/day

**6. Campaign Status** (Optional, Defaults to Pending)
- **Input Type:** Dropdown select
- **Options:**
  - **Pending** - Song not yet released, awaiting launch
  - **Active** - Song is live, campaign actively running
- **Business Logic:**
  - Pending campaigns wait for video release
  - Active campaigns get immediate stats tracking
  - If set to Active, marks `technical_setup_complete = true`

**7. Salesperson** (Optional)
- **Input Type:** Dropdown select
- **Data Source:** List of salespersons from database
- **Purpose:** Commission tracking and accountability

#### Step Validation
- No required fields (all optional)
- Date logic: End date should be after start date (not enforced but warned)

---

### Step 3: Technical Setup
**Purpose:** Configure technical parameters for automation systems (ratio fixer, engagement bots).

#### Fields

**1. Comments Sheet URL** (Optional)
- **Input Type:** Text input (URL)
- **Purpose:** Link to Google Sheet with pre-written comments for bot posting
- **Use Case:** Automated comment campaigns

**2. Like Server** (Optional)
- **Input Type:** Dropdown select
- **Options:** Predefined like bot servers (server names/IDs)
- **Purpose:** Select which like bot service to use

**3. Comment Server** (Optional)
- **Input Type:** Dropdown select
- **Options:** Predefined comment bot servers
- **Purpose:** Select which comment bot service to use

**4. Wait Time (seconds)** (Optional)
- **Input Type:** Number input
- **Purpose:** Delay between bot actions (anti-detection)
- **Example:** 120 seconds = 2 minutes between likes/comments

#### Step Validation
- No required fields
- All fields are optional technical configurations

---

### Step 4: Review & Launch
**Purpose:** Final review before creation, allow user to verify all data.

#### Display
- **Card-based summary** showing:
  - Campaign Name
  - YouTube URL
  - Service Types with goals (e.g., "Organic Views (50,000 views)")
  - Total Goal Views (sum of all services)
  - Desired Daily Views
  - Sale Price (if set)
  - Start Date (if set)
  - All other configured fields

#### Actions
- **Previous Button** - Go back to Step 3
- **Cancel Button** - Discard and close modal
- **Create Campaign Button** - Final submission

#### Submission Process
1. **Final Validation:**
   - Re-validates all required fields
   - Checks business rules (dates, URLs, etc.)
   - Returns warnings if non-critical issues found
2. **Data Transformation:**
   - Sanitizes YouTube URL
   - Converts service types array to JSON
   - Formats dates to `yyyy-MM-dd`
   - Sets `technical_setup_complete` if status = active
3. **Database Insertion:**
   - Calls `createCampaign()` hook
   - Inserts campaign into `youtube_campaigns` table
   - Links to client, salesperson, service types
4. **Success Handling:**
   - Toast notification: "Campaign created successfully!"
   - Note: "Initial YouTube data will be collected automatically"
   - Closes modal
   - Resets form to initial state
   - Redirects focus to campaign list (auto-refreshed)
5. **Error Handling:**
   - Catches specific errors (duplicate, constraint violations)
   - Shows user-friendly error messages
   - Allows user to correct and retry
   - Does not close modal on error

---

## Validation System

### Real-Time Validation

**YouTube URL Validation** (`validateYouTubeUrl`)
- **Triggers:** On blur, on change (debounced)
- **Checks:**
  1. Valid YouTube URL format
  2. Extracts video ID
  3. Checks if video exists (via API)
  4. Returns structured validation result
- **Feedback:**
  - ✅ Green checkmark if valid
  - 🔄 Spinner while validating
  - ❌ Red error message if invalid

**Duplicate Campaign Check** (`checkDuplicateCampaign`)
- **Triggers:** After URL validation, when client selected
- **Checks:**
  - Same video ID + same client ID
  - Warns if duplicate found (doesn't block, just warns)
- **Purpose:** Prevent accidental duplicate orders

**Campaign Data Validation** (`validateCampaignData`)
- **Triggers:** Before final submission
- **Checks:**
  - All required fields present
  - Data types correct
  - Business logic rules met
- **Returns:**
  - `isValid`: Boolean
  - `error`: String (critical errors)
  - `warnings`: String[] (non-blocking warnings)

### Validation Display

**Error Messages** (Red border + text)
- Display location: Below input field
- Auto-clear when field is corrected
- Specific, actionable messages
- Example: "Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)"

**Warnings** (Yellow banner)
- Display location: Top of modal
- Non-blocking (user can proceed)
- Example: "No start date set - campaign won't auto-schedule"

**Success Indicators**
- Green checkmark icons
- "✓" in step progress indicator
- "Selected: Client Name" confirmation text

---

## Auto-Population & Smart Features

### 1. Video Title Extraction
- **Trigger:** Valid YouTube URL entered
- **Process:**
  1. Validate URL format
  2. Extract video ID
  3. Call Supabase function `get_video_info`
  4. Parse video title from API response
  5. Auto-fill campaign name field (if empty)
- **Fallback:** If API fails, use "Campaign for [video_id]"
- **User Override:** User can change auto-filled name

### 2. Daily Goals Calculation
- **Trigger:** Start date OR end date OR service type goals change
- **Formula:** `SUM(all service_types.goal_views) / DAYS(end_date - start_date)`
- **Auto-Updates:** Real-time as dates change
- **Manual Override:** User can disable auto-calc and enter manually

### 3. Client Quick-Add
- **Trigger:** "Add [name] as new client" button clicked
- **Process:**
  1. Pre-fills client name from search term
  2. Expands inline form
  3. User fills email/company (optional)
  4. Submits → Creates client in database
  5. Auto-selects new client
  6. Closes inline form
  7. Returns focus to campaign creation
- **Benefit:** No context switching, seamless flow

### 4. Keyboard Navigation
- **Client Search:**
  - ↑/↓ arrows: Navigate results
  - Enter: Select highlighted client
  - Esc: Close dropdown
- **Form Fields:**
  - Tab/Shift+Tab: Navigate between fields
  - Enter (on buttons): Trigger action
- **Calendar:**
  - Arrows: Navigate dates
  - Enter: Select date

---

## Error Handling & User Feedback

### Submission Errors

**Network/API Errors**
- **Display:** Toast notification (destructive variant)
- **Message:** "Failed to create campaign. Please try again."
- **Action:** Keep modal open, allow retry
- **Logging:** Console error with full details

**Duplicate Campaign**
- **Display:** Red error banner + specific field error
- **Message:** "A campaign for this video already exists for this client"
- **Action:** Allow user to change client or confirm intentional duplicate
- **Note:** Duplicate detection runs before submission

**Constraint Violations**
- **Display:** Field-specific error message
- **Examples:**
  - "Campaign name already exists"
  - "Invalid client ID"
  - "Service type required"
- **Action:** Highlight field, show specific fix needed

### Loading States

**URL Validation**
- Spinner icon in input field
- Input slightly faded
- "Validating..." tooltip

**Client Creation**
- Button shows "Creating..."
- Button disabled during creation
- Success: Auto-selects client, shows toast

**Campaign Submission**
- "Create Campaign" button → "Creating..."
- Modal overlay (prevent double-submit)
- Progress indicator (optional enhancement)
- Success: Toast + modal closes

---

## Access Control & Permissions

### Who Can Create Campaigns?
- **Admins:** Full access
- **Managers:** Full access
- **Viewers:** No access (button hidden)

**Implementation:** `useAuth()` hook checks `isAdmin || isManager`

**UI Behavior:**
- If no permission: "New Campaign" button not rendered
- If has permission: Button visible and functional

---

## Data Flow

### Campaign Creation Process

```
┌──────────────────────────────────────────────────────────┐
│  User Enters Data in Modal (4 steps)                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Real-time Validation (URL, duplicates, required fields) │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Step 4: User Reviews Summary                            │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  User Clicks "Create Campaign"                           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Frontend: Final Validation & Data Transformation        │
│  - Sanitize YouTube URL                                  │
│  - Convert service_types to JSON                         │
│  - Format dates                                          │
│  - Calculate total goal views                            │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  API Call: useCampaigns().createCampaign(campaignData)   │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Backend: Supabase RPC / Direct Insert                   │
│  Table: youtube_campaigns                                │
│  Columns: campaign_name, youtube_url, client_id, etc.    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Database Triggers (if any):                             │
│  - Set created_at, updated_at timestamps                 │
│  - Generate campaign ID (UUID)                           │
│  - Set default values                                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Success Response Returned to Frontend                   │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Frontend: React Query Invalidation                      │
│  - Invalidates ['youtube-campaigns'] query               │
│  - Triggers automatic refetch of campaign list           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  UI Updates:                                             │
│  - Toast notification shown                              │
│  - Modal closes                                          │
│  - Campaign appears in table (auto-refreshed)            │
│  - Stats fetch scheduled (cron job picks up next cycle)  │
└──────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Component Structure
```typescript
CreateCampaignModal
├── State Management
│   ├── formData (all input fields)
│   ├── serviceTypes (multi-service array)
│   ├── step (current wizard step 1-4)
│   ├── validationErrors (field errors)
│   ├── validationWarnings (non-blocking warnings)
│   ├── loading (submission state)
│   ├── clientSearch (search input)
│   ├── showClientDropdown (dropdown visibility)
│   └── showNewClientForm (inline form visibility)
├── Hooks
│   ├── useCampaigns() - data operations
│   ├── useValidation() - validation logic
│   ├── useToast() - notifications
│   └── useRef() - DOM references
├── Functions
│   ├── handleInputChange() - form updates
│   ├── extractVideoInfo() - YouTube API call
│   ├── handleSubmit() - final submission
│   ├── isStepValid() - step validation
│   ├── handleNext/Previous() - navigation
│   └── handleClientKeyDown() - keyboard nav
└── Render
    ├── Progress Indicator (steps 1-4)
    ├── Validation Messages
    ├── Step Content (conditional render)
    └── Navigation Buttons
```

### Key Hooks Used

**`useCampaigns()`** - Main data hook
- `createCampaign(data)` - Insert campaign
- `createClient(data)` - Inline client creation
- `clients` - Client list for dropdown
- `salespersons` - Salesperson list for dropdown

**`useValidation()`** - Validation logic
- `validateYouTubeUrl(url)` - URL format & existence
- `checkDuplicateCampaign()` - Duplicate detection
- `validateCampaignData()` - Final pre-submission validation

**`useToast()`** - User notifications
- Success: "Campaign created successfully!"
- Error: "Failed to create campaign"
- Info: "Client created and selected"

---

## UX Best Practices Implemented

### ✅ Progressive Disclosure
- 4 steps instead of overwhelming single form
- Only show relevant fields per step
- Previous data preserved when navigating

### ✅ Intelligent Defaults
- Auto-populates from video title
- Calculates daily goals automatically
- Pre-selects "pending" status (safest default)

### ✅ Error Prevention
- Real-time validation catches issues early
- Duplicate detection before submission
- Required field indicators (*)

### ✅ Helpful Feedback
- Clear error messages with solutions
- Success confirmations
- Loading states for async operations

### ✅ Efficiency Features
- Inline client creation (no context switching)
- Keyboard navigation
- Search-as-you-type client finder
- Auto-save capability (future enhancement)

### ✅ Accessibility
- Keyboard navigation
- ARIA labels (via shadcn/ui)
- Clear focus indicators
- Error announcements

---

## Future Enhancements

### High Priority
1. **Auto-save draft campaigns** - Save progress if user closes modal accidentally
2. **Bulk campaign import** - CSV upload for multiple campaigns
3. **Template system** - Save common configurations as templates
4. **Video preview** - Show YouTube thumbnail + basic info in modal

### Medium Priority
5. **Smart genre detection** - Auto-detect genre from video title/description
6. **Client suggestions** - ML-based client recommendations
7. **Pricing calculator** - Suggest sale price based on goals + services
8. **Campaign duplication** - "Clone this campaign" for similar setups

### Low Priority
9. **Multi-language support** - i18n for campaign names
10. **Advanced scheduling** - Specific start times, not just dates
11. **Budget tracking** - Set budget caps and alerts
12. **A/B testing setup** - Create variant campaigns for testing

---

## Troubleshooting Common Issues

### "YouTube URL validation keeps failing"
- **Cause:** Video might be private, deleted, or region-restricted
- **Solution:** Verify video is publicly accessible, try different URL format
- **Workaround:** Manual entry of video ID (future enhancement)

### "Can't find client in dropdown"
- **Cause:** Client not yet created, or search term too specific
- **Solution:** Use "Add as new client" button, or broaden search term
- **Tip:** Search by company name if you don't remember client name

### "Desired daily views not calculating"
- **Cause:** Missing start date, end date, or service type goals
- **Solution:** Ensure all three are filled: start date + end date + at least one service with goals
- **Workaround:** Manually enter desired daily views (overrides auto-calc)

### "Campaign created but not showing in list"
- **Cause:** React Query cache hasn't invalidated yet
- **Solution:** Click "Refresh" button in campaigns page
- **Prevention:** Automatic refresh should happen (check for errors in console)

---

## Related Documentation
- [YOUTUBE-APP-CURRENT-STATUS.md](./YOUTUBE-APP-CURRENT-STATUS.md) - Overall app status
- [YOUTUBE-DATABASE-SCHEMA.md](./YOUTUBE-DATABASE-SCHEMA.md) - Database structure
- [YOUTUBE-CLIENT-CAMPAIGN-RELATIONSHIPS.md](./YOUTUBE-CLIENT-CAMPAIGN-RELATIONSHIPS.md) - Data relationships

---

**Status:** ✅ Fully Documented  
**Component File:** `apps/frontend/app/(dashboard)/youtube/vidi-health-flow/components/campaigns/CreateCampaignModal.tsx`  
**User Feedback:** Generally positive, UX flow is intuitive and efficient  
**Known Issues:** None critical, see Future Enhancements for improvements

