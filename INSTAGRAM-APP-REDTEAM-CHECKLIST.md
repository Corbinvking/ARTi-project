# Instagram App (Seedstorm Builder) - Red Team Testing Checklist

**Date Created:** December 4, 2025  
**Purpose:** Comprehensive feature testing and bug identification  
**Instructions:** Test each feature, assign maturity level, and document bugs/feedback

---

## Maturity Scale

- **1** = ❌ No basic functionality, not complete
- **2** = ⚠️ Basic functionality, not complete (has issues/gaps)
- **3** = ✅ Basic functionality complete (works as expected)

---

## How to Use This Checklist

1. **Test each feature** listed below
2. **Assign a maturity level** (1, 2, or 3) in the "Status" column
3. **Document findings** in the "Notes/Issues" section
4. **Add new features** you discover that aren't listed
5. **Report critical bugs** immediately to the development team

---

## App Structure Overview

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/instagram` | Main overview with stats |
| Creators | `/instagram/creators` | Creator database management |
| Campaign Builder | `/instagram/campaign-builder` | Create new campaigns |
| Campaigns | `/instagram/campaigns` | View/manage all campaigns |
| Campaign Analytics | `/instagram/campaigns/[id]/analytics` | Detailed campaign analytics |
| QA | `/instagram/qa` | Quality assurance metrics |
| Workflow | `/instagram/workflow` | Automation rules |
| Public Share | `/share/campaign/[token]` | Public analytics dashboard |

---

## 1. Dashboard (Home Page)

### 1.1 Dashboard Stats Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display real-time stats from database
- [ ] **Test Steps:**
  - Navigate to `/instagram`
  - Verify "Total Campaigns" count matches database
  - Verify "Active Campaigns" count is accurate
  - Verify "Total Budget" and "Total Spend" display correctly
- [ ] **Data Points:**
  - Total campaigns count
  - Active campaigns count
  - Completed campaigns count
  - Total budget
  - Total spend
  - Algorithm accuracy percentage
- **Notes/Issues:**
  - 
  - 
  - 

### 1.2 Creator Stats Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display creator statistics
- [ ] **Test Steps:**
  - Verify "Total Creators" count
  - Verify "Total Reach" calculation
  - Verify "Average Engagement" percentage
- **Notes/Issues:**
  - 
  - 
  - 

### 1.3 Dashboard Loading States
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show loading indicators while fetching data
- [ ] **Test Steps:**
  - Hard refresh the page
  - Verify loading states appear
  - Verify data loads without errors
- **Notes/Issues:**
  - 
  - 
  - 

### 1.4 Navigation to Other Pages
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Quick links and feature cards work
- [ ] **Test Steps:**
  - Click each navigation item in the sub-nav
  - Click feature cards (if they link somewhere)
  - Verify correct page loads
- **Notes/Issues:**
  - 
  - 
  - 

### 1.5 Keyboard Shortcuts
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Global keyboard shortcuts work
- [ ] **Test Steps:**
  - Press keyboard shortcut to open search
  - Press keyboard shortcut to open help
  - Verify shortcuts are documented
- **Notes/Issues:**
  - 
  - 
  - 

---

## 2. Campaign List Page

### 2.1 Campaign Table Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display all campaigns in a table
- [ ] **Test Steps:**
  - Navigate to `/instagram/campaigns`
  - Verify table displays all campaigns
  - Verify columns show correct data (Name, Client, Status, KPIs)
- [ ] **Columns to Verify:**
  - Campaign name
  - Client name
  - Status badge
  - Budget/Spend/Remaining
  - Progress bar
  - Start date
- **Notes/Issues:**
  - 
  - 
  - 

### 2.2 Campaign Search
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Search campaigns by name or client
- [ ] **Test Steps:**
  - Enter campaign name in search box
  - Verify matching campaigns display
  - Enter client name in search box
  - Verify matching campaigns display
  - Clear search and verify all campaigns return
- **Notes/Issues:**
  - 
  - 
  - 

### 2.3 Status Filter Tabs
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Filter campaigns by status
- [ ] **Test Steps:**
  - Click "All" tab → all campaigns display
  - Click "Active" tab → only active campaigns
  - Click "Draft" tab → only draft campaigns
  - Click "Completed" tab → only completed campaigns
  - Verify counts in each tab are accurate
- **Notes/Issues:**
  - 
  - 
  - 

### 2.4 Campaign Row Click → Details Modal
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Click campaign row to open details modal
- [ ] **Test Steps:**
  - Click any campaign row
  - Verify details modal opens
  - Verify all campaign data is displayed correctly
  - Close modal with X or clicking outside
- **Notes/Issues:**
  - 
  - 
  - 

### 2.5 KPI Metrics Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Campaign KPIs visible in table
- [ ] **Test Steps:**
  - Verify budget displays with currency formatting
  - Verify spend displays with color coding
  - Verify remaining amount displays
  - Verify progress bar percentage is correct
- **Notes/Issues:**
  - 
  - 
  - 

### 2.6 Status Badges
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Status badges with correct colors
- [ ] **Test Cases:**
  - Active → Green badge
  - Draft → Gray badge
  - Completed → Blue badge
  - Paused → Yellow badge
  - Cancelled → Red badge
  - Unreleased → Purple badge
- **Notes/Issues:**
  - 
  - 
  - 

---

## 3. Campaign Details Modal

### 3.1 Campaign Information Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display all campaign details
- [ ] **Data Points to Verify:**
  - Campaign name
  - Client name
  - Status
  - Start date
  - Budget, Spend, Remaining
  - Sound URL (if present)
  - Tracker URL (if present)
  - Salesperson
  - Report notes
  - Client notes
- **Notes/Issues:**
  - 
  - 
  - 

### 3.2 Edit Campaign
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Edit campaign information
- [ ] **Test Steps:**
  - Open campaign details modal
  - Click "Edit" button
  - Modify campaign name
  - Modify other fields
  - Click "Save Changes"
  - Verify changes are persisted
  - Re-open modal to confirm changes saved
- **Notes/Issues:**
  - 
  - 
  - 

### 3.3 Delete Campaign
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Delete campaign with confirmation
- [ ] **Test Steps:**
  - Open campaign details modal
  - Click "Delete" button
  - Verify confirmation dialog appears
  - Click "Cancel" → campaign not deleted
  - Click "Delete" → campaign is deleted
  - Verify campaign removed from list
- **Notes/Issues:**
  - 
  - 
  - 

### 3.4 View Analytics Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Navigate to analytics dashboard
- [ ] **Test Steps:**
  - Open campaign details modal
  - Click "View Analytics" button
  - Verify navigation to `/instagram/campaigns/[id]/analytics`
  - Verify correct campaign data loads
- **Notes/Issues:**
  - 
  - 
  - 

### 3.5 Share Link Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Copy shareable link to clipboard
- [ ] **Test Steps:**
  - Open campaign details modal
  - Click "Share Link" button
  - Verify clipboard contains correct URL
  - Verify toast notification appears
  - Open link in new incognito window
  - Verify public dashboard loads without login
- **Notes/Issues:**
  - 
  - 
  - 

### 3.6 External Links
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Sound URL and Tracker links work
- [ ] **Test Steps:**
  - Click Sound URL link → opens in new tab
  - Click Tracker link → opens in new tab
  - Verify external link icon appears
- **Notes/Issues:**
  - 
  - 
  - 

---

## 4. Instagram Analytics Tracking (Scraper Integration)

### 4.1 Tracking Status Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show tracking status indicator
- [ ] **Test Cases:**
  - Campaign with URL + Active status → "Active - Tracking" badge
  - Campaign with URL + Inactive status → "Inactive - Not Tracked" badge
  - Campaign without URL → "Needs URL" badge
- **Notes/Issues:**
  - 
  - 
  - 

### 4.2 Instagram URL Input
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Add/edit Instagram URL for campaign
- [ ] **Test Steps:**
  - Open campaign modal
  - Click "Edit"
  - Enter Instagram profile URL
  - Save changes
  - Verify URL is saved
  - Verify tracking status updates
- [ ] **URL Formats to Test:**
  - `https://www.instagram.com/username`
  - `https://www.instagram.com/p/POST_ID/`
  - `username` (just the handle)
- **Notes/Issues:**
  - 
  - 
  - 

### 4.3 Manual Scrape Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Trigger manual scrape for campaign
- [ ] **Test Steps:**
  - Set Instagram URL for campaign
  - Click "Scrape Now" button
  - Verify loading state appears
  - Wait for scrape to complete
  - Verify success toast appears
  - Navigate to analytics page
  - Verify data is populated
- **Notes/Issues:**
  - 
  - 
  - 

### 4.4 Last Scraped Timestamp
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display when campaign was last scraped
- [ ] **Test Steps:**
  - Scrape a campaign
  - Verify "Last Scraped" timestamp appears
  - Verify timestamp is accurate
  - Verify timezone is correct
- **Notes/Issues:**
  - 
  - 
  - 

### 4.5 Scraping Error Handling
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Handle scraping errors gracefully
- [ ] **Test Cases:**
  - Invalid Instagram URL → should show error
  - Private account → should show error
  - Rate limited → should show appropriate message
  - Network error → should retry or show error
- **Notes/Issues:**
  - 
  - 
  - 

---

## 5. Campaign Analytics Dashboard

### 5.1 Dashboard Load with Campaign Data
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Load and display campaign info
- [ ] **Test Steps:**
  - Navigate to `/instagram/campaigns/[id]/analytics`
  - Verify campaign name displays in header
  - Verify client name displays
  - Verify budget/spend info displays
  - Verify created date displays
- **Notes/Issues:**
  - 
  - 
  - 

### 5.2 Primary KPI Cards
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display main engagement metrics
- [ ] **Data Points:**
  - Total Views
  - Total Likes
  - Total Comments
  - Total Shares
  - Engagement Rate (%)
- **Notes/Issues:**
  - 
  - 
  - 

### 5.3 Secondary KPI Cards
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display secondary metrics
- [ ] **Data Points:**
  - Live Posts count
  - Avg Cost Per View
  - Sentiment Score
  - Relevance Score
- **Notes/Issues:**
  - 
  - 
  - 

### 5.4 Computed Metrics (Tertiary KPIs)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display computed/historical metrics
- [ ] **Data Points:**
  - Virality Score
  - Growth Rate (%)
  - Peak Engagement Day
  - Post Frequency (posts/day)
- **Notes/Issues:**
  - 
  - 
  - 

### 5.5 Top Hashtags Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show most used hashtags
- [ ] **Test Steps:**
  - Verify hashtags section appears (if data exists)
  - Verify hashtags are displayed as badges
  - Verify clicking hashtag doesn't break UI
- **Notes/Issues:**
  - 
  - 
  - 

### 5.6 Time Series Chart
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display engagement over time
- [ ] **Test Steps:**
  - Verify chart renders
  - Verify line for views
  - Verify line for engagement
  - Hover over chart → tooltip displays data
  - Verify chart is responsive
- **Notes/Issues:**
  - 
  - 
  - 

### 5.7 Date Range Filter
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Filter data by date range
- [ ] **Test Cases:**
  - 7 Days → shows last 7 days
  - 30 Days → shows last 30 days
  - 90 Days → shows last 90 days
  - All Time → shows all data
- **Notes/Issues:**
  - 
  - 
  - 

### 5.8 Tabs Navigation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Switch between analytics tabs
- [ ] **Tabs to Test:**
  - "Live Post Overview" → main metrics view
  - "Posts" → list of posts (if implemented)
  - "All Data" → raw data view (if implemented)
- **Notes/Issues:**
  - 
  - 
  - 

### 5.9 Back Button (Internal View Only)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Navigate back to campaigns list
- [ ] **Test Steps:**
  - Navigate to analytics page from campaigns list
  - Click "← Back to Campaigns" button
  - Verify navigation to `/instagram/campaigns`
- **Notes/Issues:**
  - 
  - 
  - 

### 5.10 Refresh Analytics Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Manually refresh analytics data
- [ ] **Test Steps:**
  - Click refresh/scrape button on analytics page
  - Verify loading state
  - Verify data updates after refresh
- **Notes/Issues:**
  - 
  - 
  - 

### 5.11 Mock Data Fallback
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show mock data when no real data exists
- [ ] **Test Steps:**
  - Open analytics for campaign with no Instagram URL
  - Verify mock data displays (not empty)
  - Verify console shows "Using mock analytics"
- **Notes/Issues:**
  - 
  - 
  - 

---

## 6. Public Share Page

### 6.1 Public Access Without Auth
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Access analytics without login
- [ ] **Test Steps:**
  - Open incognito/private browser window
  - Navigate to `/share/campaign/[id]`
  - Verify page loads without login prompt
  - Verify analytics dashboard displays
- **Notes/Issues:**
  - 
  - 
  - 

### 6.2 Public Page Data Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display correct campaign data
- [ ] **Test Steps:**
  - Open public share link
  - Verify campaign name displays
  - Verify metrics display
  - Verify chart renders
- **Notes/Issues:**
  - 
  - 
  - 

### 6.3 Public Page - No Back Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Back button hidden on public page
- [ ] **Test Steps:**
  - Open public share link
  - Verify "Back to Campaigns" button is NOT visible
- **Notes/Issues:**
  - 
  - 
  - 

### 6.4 Public Page - Branding
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Proper branding on public page
- [ ] **Test Steps:**
  - Verify "ARTIST INFLUENCE" branding displays
  - Verify no internal navigation visible
  - Verify professional appearance
- **Notes/Issues:**
  - 
  - 
  - 

---

## 7. Creator Database Page

### 7.1 Creator List Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display all creators in table
- [ ] **Test Steps:**
  - Navigate to `/instagram/creators`
  - Verify table displays all creators
  - Verify columns show correct data
- [ ] **Columns:**
  - Instagram Handle
  - Email
  - Followers
  - Engagement Rate
  - Country
  - Genres
- **Notes/Issues:**
  - 
  - 
  - 

### 7.2 Creator Search
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Search creators by handle or email
- [ ] **Test Steps:**
  - Enter Instagram handle in search
  - Verify matching creators display
  - Enter email in search
  - Verify matching creators display
- **Notes/Issues:**
  - 
  - 
  - 

### 7.3 Creator Row Click → Modal
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Click creator to view details + campaigns
- [ ] **Test Steps:**
  - Click any creator row
  - Verify modal opens
  - Verify creator details display
  - Verify associated campaigns display (if any)
- **Notes/Issues:**
  - 
  - 
  - 

### 7.4 Creator-Campaign Relationship
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show campaigns for selected creator
- [ ] **Test Steps:**
  - Click creator with campaigns
  - Verify campaign list in modal
  - Verify campaign count is accurate
  - Verify campaign details display (name, status, budget)
- **Notes/Issues:**
  - 
  - 
  - 

### 7.5 Add Creator Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Add new creator
- [ ] **Test Steps:**
  - Click "Add Creator" button
  - Fill out creator form (if implemented)
  - Submit form
  - Verify creator appears in list
- **Notes/Issues:**
  - 
  - 
  - 

### 7.6 Import CSV Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Import creators from CSV
- [ ] **Test Steps:**
  - Click "Import CSV" button
  - Select/upload CSV file (if implemented)
  - Verify creators are imported
- **Notes/Issues:**
  - 
  - 
  - 

### 7.7 Export Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Export creators to CSV/Excel
- [ ] **Test Steps:**
  - Click "Export" button
  - Verify file downloads (if implemented)
  - Verify data in exported file
- **Notes/Issues:**
  - 
  - 
  - 

---

## 8. Campaign Builder Page

### 8.1 Campaign Creation Form - Step 1
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Basic campaign info form
- [ ] **Fields to Test:**
  - Campaign Name input
  - Brand Name input
  - Total Budget input
  - Creator Count input
- **Notes/Issues:**
  - 
  - 
  - 

### 8.2 Campaign Creation - Step Navigation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Navigate between form steps
- [ ] **Test Steps:**
  - Fill out Step 1 fields
  - Click "Next"
  - Verify Step 2 displays
  - Click "Previous"
  - Verify Step 1 displays with data preserved
- **Notes/Issues:**
  - 
  - 
  - 

### 8.3 Campaign Creation - Step 2
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Genre/territory selection
- [ ] **Test Steps:**
  - Navigate to Step 2
  - Verify genre selection is available (if implemented)
  - Verify territory selection is available (if implemented)
  - Verify content type selection is available (if implemented)
- **Notes/Issues:**
  - 
  - 
  - 

### 8.4 Campaign Creation - Step 3
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Review and save campaign
- [ ] **Test Steps:**
  - Navigate to Step 3
  - Verify campaign summary displays
  - Click "Save Campaign"
  - Verify redirect to campaigns page
  - Verify new campaign appears in list
- **Notes/Issues:**
  - 
  - 
  - 

### 8.5 Form Validation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Validate required fields
- [ ] **Test Cases:**
  - Leave campaign name empty → should show error
  - Enter negative budget → should show error
  - Enter 0 creators → should show error (or warning)
- **Notes/Issues:**
  - 
  - 
  - 

---

## 9. Quality Assurance Page

### 9.1 Data Quality Metrics
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display data quality statistics
- [ ] **Test Steps:**
  - Navigate to `/instagram/qa`
  - Verify "Creator Profiles Complete" percentage
  - Verify "Campaign Data Integrity" percentage
  - Verify "Analytics Coverage" percentage
- **Notes/Issues:**
  - 
  - 
  - 

### 9.2 Pending Reviews
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display items needing attention
- [ ] **Test Steps:**
  - Verify "Incomplete Creator Profiles" count
  - Verify "Missing Analytics Data" count
  - Verify "Campaign Anomalies" count
- **Notes/Issues:**
  - 
  - 
  - 

### 9.3 QA Data Accuracy
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** QA metrics match actual database state
- [ ] **Test Steps:**
  - Compare displayed counts with database queries
  - Verify percentages are calculated correctly
- **Notes/Issues:**
  - 
  - 
  - 

---

## 10. Workflow Page

### 10.1 Workflow List Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display all workflows
- [ ] **Test Steps:**
  - Navigate to `/instagram/workflow`
  - Verify workflows display
  - Verify name, description, status for each
- **Notes/Issues:**
  - 
  - 
  - 

### 10.2 Workflow Enable/Disable
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Toggle workflow on/off
- [ ] **Test Steps:**
  - Click enable/disable button
  - Verify status badge updates
  - Verify change is persisted
- **Notes/Issues:**
  - 
  - 
  - 

### 10.3 New Workflow Button
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Create new workflow
- [ ] **Test Steps:**
  - Click "New Workflow" button
  - Fill out workflow form (if implemented)
  - Save and verify appears in list
- **Notes/Issues:**
  - 
  - 
  - 

### 10.4 Edit Workflow
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Modify existing workflow
- [ ] **Test Steps:**
  - Click "Edit" on workflow
  - Modify name/description
  - Save changes
  - Verify changes persisted
- **Notes/Issues:**
  - 
  - 
  - 

---

## 11. API Integration (Instagram Scraper)

### 11.1 Batch Scraping Endpoint
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** `/api/instagram-scraper/batch` works
- [ ] **Test Steps:**
  - Call endpoint with dry run
  - Verify response includes campaign list
  - Call without dry run (test environment only)
  - Verify campaigns are scraped
- **Notes/Issues:**
  - 
  - 
  - 

### 11.2 Campaign Analytics Endpoint
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** `/api/instagram-scraper/campaign/:id/analytics`
- [ ] **Test Steps:**
  - Call endpoint with valid campaign ID
  - Verify response includes posts and metrics
  - Call with invalid ID → should return 404
- **Notes/Issues:**
  - 
  - 
  - 

### 11.3 Campaign Refresh Endpoint
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** `/api/instagram-scraper/campaign/:id/refresh`
- [ ] **Test Steps:**
  - Call endpoint with campaign that has Instagram URL
  - Verify new posts are scraped
  - Verify `last_scraped_at` is updated
- **Notes/Issues:**
  - 
  - 
  - 

### 11.4 Apify API Integration
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Apify Instagram scraper works
- [ ] **Test Steps:**
  - Verify APIFY_API_TOKEN is configured
  - Trigger scrape → verify Apify actor runs
  - Verify data is returned
- **Notes/Issues:**
  - 
  - 
  - 

### 11.5 Rate Limiting
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** API rate limits are respected
- [ ] **Test Steps:**
  - Rapidly call scrape endpoints
  - Verify 2-second delay between campaigns in batch
  - Verify no Apify rate limit errors
- **Notes/Issues:**
  - 
  - 
  - 

---

## 12. Cron Job (Daily Scraping)

### 12.1 Cron Job Configuration
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Cron job is set up correctly
- [ ] **Test Steps:**
  - Run `crontab -l | grep instagram`
  - Verify schedule: `0 6 * * *` (6 AM UTC)
  - Verify script path is correct
- **Notes/Issues:**
  - 
  - 
  - 

### 12.2 Cron Job Execution
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Cron job runs successfully
- [ ] **Test Steps:**
  - Check `/var/log/instagram_scraper.log`
  - Verify successful execution logs
  - Verify no error logs
- **Notes/Issues:**
  - 
  - 
  - 

### 12.3 Automatic Campaign Tracking
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** All active campaigns with URLs are scraped
- [ ] **Test Steps:**
  - Add Instagram URL to campaign
  - Wait for cron (or manually run)
  - Verify `last_scraped_at` is updated
  - Verify posts are stored
- **Notes/Issues:**
  - 
  - 
  - 

### 12.4 Inactive Campaign Skipping
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Inactive campaigns are not scraped
- [ ] **Test Steps:**
  - Set campaign status to "inactive"
  - Run batch scraper
  - Verify campaign is skipped
- **Notes/Issues:**
  - 
  - 
  - 

---

## 13. Database Operations

### 13.1 Campaign CRUD - Create
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Create new campaign via UI
- [ ] **Test Steps:**
  - Use Campaign Builder to create campaign
  - Verify campaign saved to `instagram_campaigns` table
  - Verify all fields are saved correctly
- **Notes/Issues:**
  - 
  - 
  - 

### 13.2 Campaign CRUD - Read
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Fetch campaigns from database
- [ ] **Test Steps:**
  - Load campaigns page
  - Verify data matches database
  - Verify count matches database
- **Notes/Issues:**
  - 
  - 
  - 

### 13.3 Campaign CRUD - Update
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Update campaign via UI
- [ ] **Test Steps:**
  - Edit campaign in modal
  - Save changes
  - Query database to verify update
  - Verify `updated_at` timestamp changed
- **Notes/Issues:**
  - 
  - 
  - 

### 13.4 Campaign CRUD - Delete
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Delete campaign via UI
- [ ] **Test Steps:**
  - Delete campaign in modal
  - Verify removed from list
  - Query database to verify deletion
  - Verify related `instagram_posts` are deleted (cascade)
- **Notes/Issues:**
  - 
  - 
  - 

### 13.5 Instagram Posts Storage
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Posts stored in `instagram_posts` table
- [ ] **Test Steps:**
  - Scrape campaign
  - Query `instagram_posts` table
  - Verify all post fields are stored
  - Verify foreign key to campaign is correct
- **Notes/Issues:**
  - 
  - 
  - 

### 13.6 Upsert Logic (No Duplicates)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Posts are upserted, not duplicated
- [ ] **Test Steps:**
  - Scrape campaign
  - Scrape same campaign again
  - Verify post count doesn't double
  - Verify updated posts have new data
- **Notes/Issues:**
  - 
  - 
  - 

---

## 14. Row Level Security (RLS)

### 14.1 Org Isolation - Campaigns
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Campaigns isolated by org_id
- [ ] **Test Steps:**
  - Log in as user from org A
  - Verify only org A campaigns visible
  - Log in as user from org B
  - Verify only org B campaigns visible
- **Notes/Issues:**
  - 
  - 
  - 

### 14.2 Org Isolation - Creators
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Creators isolated by org_id
- [ ] **Test Steps:**
  - Same as above for creators table
- **Notes/Issues:**
  - 
  - 
  - 

### 14.3 Public Page Bypass
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Public share page can access data
- [ ] **Test Steps:**
  - Access public share link without login
  - Verify data loads (API uses service role key)
- **Notes/Issues:**
  - 
  - 
  - 

---

## 15. UI/UX & Design

### 15.1 Responsive Design
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App works on different screen sizes
- [ ] **Test Devices:**
  - Desktop (1920x1080)
  - Laptop (1366x768)
  - Tablet (768x1024)
  - Mobile (375x812)
- **Notes/Issues:**
  - 
  - 
  - 

### 15.2 Loading States
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show loading indicators during data fetch
- [ ] **Test Steps:**
  - Refresh campaigns page → loading appears
  - Open analytics → loading appears
  - Scrape campaign → button shows spinner
- **Notes/Issues:**
  - 
  - 
  - 

### 15.3 Error Messages
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display clear error messages
- [ ] **Test Cases:**
  - API failure → toast error
  - Invalid form → field error
  - Network error → error message
- **Notes/Issues:**
  - 
  - 
  - 

### 15.4 Success Messages
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show success confirmations
- [ ] **Test Cases:**
  - Campaign created → success toast
  - Campaign updated → success toast
  - Campaign deleted → success toast
  - Scrape complete → success toast
- **Notes/Issues:**
  - 
  - 
  - 

### 15.5 Navigation Highlighting
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Active page highlighted in nav
- [ ] **Test Steps:**
  - Navigate to each page
  - Verify correct nav item is highlighted
- **Notes/Issues:**
  - 
  - 
  - 

---

## 16. Performance & Reliability

### 16.1 Page Load Time
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Pages load quickly (< 3 seconds)
- [ ] **Test Steps:**
  - Open app from cold start
  - Navigate between pages
  - Measure load times
- **Notes/Issues:**
  - 
  - 
  - 

### 16.2 Data Refresh Performance
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Scraping doesn't block UI
- [ ] **Test Steps:**
  - Trigger scrape
  - Verify UI remains responsive
  - Verify other actions can be performed
- **Notes/Issues:**
  - 
  - 
  - 

### 16.3 Large Dataset Handling
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App handles 300+ campaigns
- [ ] **Test Steps:**
  - Load campaigns page with 300+ campaigns
  - Verify list renders without lag
  - Test search and filter performance
- **Notes/Issues:**
  - 
  - 
  - 

### 16.4 Query Cache Invalidation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Data updates reflect immediately
- [ ] **Test Steps:**
  - Update campaign
  - Verify list updates without refresh
  - Delete campaign
  - Verify list updates without refresh
- **Notes/Issues:**
  - 
  - 
  - 

---

## 17. Security

### 17.1 API Key Security
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** API keys not exposed in frontend
- [ ] **Test Steps:**
  - Inspect network requests
  - Check browser console
  - Verify Apify token not in frontend code
- **Notes/Issues:**
  - 
  - 
  - 

### 17.2 Authentication Enforcement
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Protected routes require login
- [ ] **Test Steps:**
  - Log out
  - Try to access `/instagram/campaigns`
  - Verify redirect to login page
- **Notes/Issues:**
  - 
  - 
  - 

### 17.3 Public Route Exception
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** `/share/*` routes don't require auth
- [ ] **Test Steps:**
  - Access share link without login
  - Verify page loads
  - Verify no redirect to login
- **Notes/Issues:**
  - 
  - 
  - 

---

## 18. Known Issues & Workarounds

### Issue 1: Multiple GoTrueClient Warnings
- **Status:** ⚠️ Known Issue
- **Description:** Console shows "Multiple GoTrueClient instances detected"
- **Workaround:** Safe to ignore - doesn't affect functionality
- **Priority:** Low

### Issue 2: Vercel Analytics 404
- **Status:** ⚠️ Known Issue
- **Description:** `/_vercel/insights/script.js` returns 404
- **Workaround:** Enable Web Analytics in Vercel dashboard
- **Priority:** Low

### Issue 3: [Add any issues found during testing]
- **Status:** ___ (Open / In Progress / Resolved)
- **Description:** 
- **Workaround:** 
- **Priority:** ___ (Low / Medium / High / Critical)

---

## 19. Feature Requests & Enhancements

### Request 1: Bulk Instagram URL Assignment
- **Description:** Assign Instagram URLs to multiple campaigns at once
- **Business Value:** Faster campaign setup
- **Priority:** Medium

### Request 2: Secure Share Tokens
- **Description:** Use UUID tokens instead of campaign IDs for share links
- **Business Value:** Security improvement
- **Priority:** Medium

### Request 3: [Add suggestions here]
- **Description:** 
- **Business Value:** 
- **Priority:** ___ (Low / Medium / High)

---

## 20. Browser Compatibility

### Chrome
- [ ] **Status:** ___ (1-3)
- **Version Tested:** _________
- **Notes/Issues:** 

### Firefox
- [ ] **Status:** ___ (1-3)
- **Version Tested:** _________
- **Notes/Issues:** 

### Safari
- [ ] **Status:** ___ (1-3)
- **Version Tested:** _________
- **Notes/Issues:** 

### Edge
- [ ] **Status:** ___ (1-3)
- **Version Tested:** _________
- **Notes/Issues:** 

---

## 21. Overall Assessment

### Critical Blockers (Must fix before launch)
1. 
2. 
3. 

### High Priority Issues (Should fix soon)
1. 
2. 
3. 

### Medium Priority Issues (Fix when possible)
1. 
2. 
3. 

### Low Priority / Nice-to-Have
1. 
2. 
3. 

---

## Summary & Next Steps

### Overall Maturity Score
Calculate average maturity across all features:
- **Total Features Tested:** ___
- **Average Maturity Score:** ___ / 3
- **Percentage Complete:** ____%

### Recommended Actions
1. 
2. 
3. 

### Testing Sign-Off

**Tester Name:** _____________________  
**Date:** _____________________  
**Signature:** _____________________

---

## Appendix: Test Data

### Test Accounts
- Admin: admin@arti-demo.com
- Default Org ID: 00000000-0000-0000-0000-000000000001

### Test Instagram Profiles
1. `natgeo` - High-engagement verified account
2. `butcherbabiesofficial` - Music artist account
3. [Add more test profiles]

### Test Campaign IDs
1. Campaign 789 - Has Instagram data (natgeo)
2. [Add more test campaigns]

### Test URLs
- Production: https://app.artistinfluence.com
- API: https://api.artistinfluence.com
- Public Share Example: https://app.artistinfluence.com/share/campaign/789

---

**End of Checklist**

*This document should be continuously updated as new features are added or issues are discovered. Share feedback with the development team regularly.*

