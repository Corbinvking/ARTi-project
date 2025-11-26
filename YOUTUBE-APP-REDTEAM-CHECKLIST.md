# YouTube App (Vidi Health Flow) - Red Team Testing Checklist

**Date Created:** November 26, 2025  
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

## 1. Campaign Intake & Creation

### 1.1 New Campaign Creation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Create a new YouTube campaign from scratch
- [ ] **Test Steps:**
  - Navigate to YouTube campaigns page
  - Click "New Campaign" or "+" button
  - Fill out campaign form
  - Submit campaign
- **Notes/Issues:**
  - 
  - 
  - 

### 1.2 Campaign Form Validation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Form validates required fields before submission
- [ ] **Test Cases:**
  - Leave campaign name empty → should show error
  - Enter invalid YouTube URL → should show error
  - Enter valid YouTube URL → should accept
  - Select no client → should show error (if required)
- **Notes/Issues:**
  - 
  - 
  - 

### 1.3 YouTube URL Parsing
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Extracts video ID from various YouTube URL formats
- [ ] **Test URLs:**
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/watch?v=VIDEO_ID&feature=share`
  - `https://m.youtube.com/watch?v=VIDEO_ID`
- **Notes/Issues:**
  - 
  - 
  - 

### 1.4 Client Assignment
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Assign campaign to existing client or create new client
- [ ] **Test Steps:**
  - Create campaign with existing client
  - Create campaign with new client
  - Verify client appears in clients list
  - Verify campaign shows under client's campaigns
- **Notes/Issues:**
  - 
  - 
  - 

### 1.5 Salesperson Assignment
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Assign campaign to a salesperson
- [ ] **Test Steps:**
  - Create campaign and assign to salesperson
  - Verify salesperson can see their campaigns
  - Test filtering campaigns by salesperson
- **Notes/Issues:**
  - 
  - 
  - 

### 1.6 Campaign Status Management
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Set and update campaign status (Pending, Active, Complete)
- [ ] **Test Steps:**
  - Create campaign with "Pending" status
  - Update to "Active"
  - Update to "Complete"
  - Verify status changes are saved
- **Notes/Issues:**
  - 
  - 
  - 

---

## 2. Campaign Dashboard & Listing

### 2.1 Campaign List View
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** View all campaigns in a list/table
- [ ] **Test Steps:**
  - Navigate to campaigns page
  - Verify all campaigns are visible
  - Check columns display correct data
- **Notes/Issues:**
  - 
  - 
  - 

### 2.2 Campaign Search & Filtering
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Search and filter campaigns
- [ ] **Test Cases:**
  - Search by campaign name
  - Filter by status (Active, Pending, Complete)
  - Filter by client
  - Filter by salesperson
  - Filter by date range
- **Notes/Issues:**
  - 
  - 
  - 

### 2.3 Campaign Sorting
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Sort campaigns by column (name, date, status, etc.)
- [ ] **Test Steps:**
  - Click column headers to sort
  - Verify ascending/descending order
  - Test sorting on multiple columns
- **Notes/Issues:**
  - 
  - 
  - 

### 2.4 Pagination
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Paginate campaign list if many campaigns exist
- [ ] **Test Steps:**
  - Create 20+ campaigns
  - Verify pagination controls appear
  - Navigate between pages
  - Change items per page
- **Notes/Issues:**
  - 
  - 
  - 

---

## 3. Campaign Details & Health Dashboard

### 3.1 Campaign Details Modal/Page
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** View detailed information for a single campaign
- [ ] **Test Steps:**
  - Click on a campaign to open details
  - Verify all information is displayed correctly
  - Check video embed/thumbnail displays
- **Notes/Issues:**
  - 
  - 
  - 

### 3.2 Real-Time Stats Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display current YouTube video stats (views, likes, comments)
- [ ] **Data Points:**
  - Current views
  - Current likes
  - Current comments
  - Last updated timestamp
- **Notes/Issues:**
  - 
  - 
  - 

### 3.3 Manual Stats Refresh
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Manually refresh stats for a single campaign
- [ ] **Test Steps:**
  - Click "Refresh Stats" button
  - Verify loading indicator appears
  - Verify stats update after refresh
  - Check timestamp updates
- **Notes/Issues:**
  - 
  - 
  - 

### 3.4 Automatic Stats Updates (Cron Job)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Automatically update stats for active campaigns daily
- [ ] **Test Steps:**
  - Wait 24 hours after campaign creation
  - Verify stats have been updated
  - Check logs for cron job execution
- **Notes/Issues:**
  - 
  - 
  - 

### 3.5 Health Score Calculation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Calculate and display campaign health score
- [ ] **Test Steps:**
  - View campaign with good engagement → should show green/healthy
  - View campaign with poor engagement → should show red/unhealthy
  - Verify health score formula is correct
- **Notes/Issues:**
  - 
  - 
  - 

### 3.6 Expected vs Actual Performance
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Compare expected performance to actual performance
- [ ] **Data Points:**
  - Expected views vs actual views
  - Expected likes vs actual likes
  - Expected comments vs actual comments
  - Engagement ratios
- **Notes/Issues:**
  - 
  - 
  - 

### 3.7 Performance Trends (Charts/Graphs)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display performance trends over time
- [ ] **Test Steps:**
  - View campaign details
  - Check if charts/graphs are present
  - Verify data accuracy in charts
  - Test date range selection for charts
- **Notes/Issues:**
  - 
  - 
  - 

---

## 4. YouTube Data API Integration

### 4.1 API Key Configuration
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** YouTube API key is configured correctly
- [ ] **Test Steps:**
  - Verify API calls succeed
  - Check for API quota errors
  - Test error handling when API fails
- **Notes/Issues:**
  - 
  - 
  - 

### 4.2 Video Metadata Fetching
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Fetch video title, description, thumbnail from YouTube
- [ ] **Test Steps:**
  - Create campaign with YouTube URL
  - Verify video title auto-fills
  - Verify thumbnail displays
  - Test with various video types (public, unlisted, age-restricted)
- **Notes/Issues:**
  - 
  - 
  - 

### 4.3 Video Statistics Accuracy
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Stats fetched from API match actual YouTube stats
- [ ] **Test Steps:**
  - Refresh campaign stats
  - Open YouTube video in browser
  - Compare views, likes, comments
  - Verify numbers match (within reasonable margin)
- **Notes/Issues:**
  - 
  - 
  - 

### 4.4 API Error Handling
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Gracefully handle API errors
- [ ] **Test Cases:**
  - Invalid video ID → should show error
  - Deleted video → should show error
  - Private video → should show error
  - API quota exceeded → should show appropriate message
- **Notes/Issues:**
  - 
  - 
  - 

### 4.5 Rate Limiting
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Respect YouTube API rate limits
- [ ] **Test Steps:**
  - Refresh stats for many campaigns quickly
  - Verify API doesn't get rate limited
  - Check for backoff/retry logic
- **Notes/Issues:**
  - 
  - 
  - 

---

## 5. Ratio Fixer Integration

### 5.1 Ratio Fixer Tab/Section
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Access Ratio Fixer from campaign details
- [ ] **Test Steps:**
  - Open campaign details
  - Navigate to "Ratio Fixer" tab
  - Verify UI loads correctly
- **Notes/Issues:**
  - 
  - 
  - 

### 5.2 Target Engagement Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display desired likes and comments based on ML predictions
- [ ] **Data Points:**
  - Desired likes count
  - Desired comments count
  - Target engagement ratio
- **Notes/Issues:**
  - 
  - 
  - 

### 5.3 Start Ratio Fixer
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Start automated ratio fixing for a campaign
- [ ] **Test Steps:**
  - Click "Start Ratio Fixer"
  - Fill in configuration (comment sheet URL, server IDs, etc.)
  - Submit and verify campaign starts
  - Check status changes to "Running"
- **Notes/Issues:**
  - 
  - 
  - 

### 5.4 Ratio Fixer Status Display
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display real-time status of Ratio Fixer
- [ ] **Data Points:**
  - Status (Idle, Running, Stopped, Error)
  - Ordered likes count
  - Ordered comments count
  - Last update timestamp
- **Notes/Issues:**
  - 
  - 
  - 

### 5.5 Stop Ratio Fixer
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Stop automated ratio fixing
- [ ] **Test Steps:**
  - Start Ratio Fixer
  - Wait a few minutes
  - Click "Stop Ratio Fixer"
  - Verify status changes to "Stopped"
  - Verify no new orders are placed
- **Notes/Issues:**
  - 
  - 
  - 

### 5.6 Order Tracking
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Track likes and comments ordered via JingleSMM
- [ ] **Test Steps:**
  - Start Ratio Fixer
  - Wait for orders to be placed
  - Verify "Ordered Likes" and "Ordered Comments" increase
  - Check JingleSMM dashboard for matching orders
- **Notes/Issues:**
  - 
  - 
  - 

### 5.7 Google Sheets Integration
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Pull comments from Google Sheets for commenting
- [ ] **Test Steps:**
  - Provide Google Sheets URL with comments
  - Start Ratio Fixer
  - Verify comments are pulled from sheet
  - Verify used comments are marked in sheet
- **Notes/Issues:**
  - 
  - 
  - 

### 5.8 Ratio Fixer Error Handling
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Handle errors gracefully (no comments, API failures, etc.)
- [ ] **Test Cases:**
  - Start with empty comment sheet → should show error
  - Start with all comments "Used" → should show error
  - JingleSMM API fails → should retry or show error
- **Notes/Issues:**
  - 
  - 
  - 

---

## 6. Client Management

### 6.1 Client List View
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** View all clients in a list
- [ ] **Test Steps:**
  - Navigate to clients section
  - Verify all clients are displayed
  - Check client cards/rows show correct info
- **Notes/Issues:**
  - 
  - 
  - 

### 6.2 Create New Client
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Add a new client to the system
- [ ] **Test Steps:**
  - Click "New Client"
  - Fill out client form (name, email, company, etc.)
  - Submit
  - Verify client appears in list
- **Notes/Issues:**
  - 
  - 
  - 

### 6.3 Edit Client Information
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Update existing client details
- [ ] **Test Steps:**
  - Open client details
  - Click "Edit"
  - Modify client information
  - Save changes
  - Verify changes are persisted
- **Notes/Issues:**
  - 
  - 
  - 

### 6.4 Delete Client
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Remove a client from the system
- [ ] **Test Steps:**
  - Select a client with no campaigns
  - Click "Delete"
  - Confirm deletion
  - Verify client is removed
  - Test with client that has campaigns → should prevent deletion or cascade
- **Notes/Issues:**
  - 
  - 
  - 

### 6.5 Client Campaign Overview
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** View all campaigns for a specific client
- [ ] **Test Steps:**
  - Open client details
  - Verify all client's campaigns are listed
  - Click campaign to view details
  - Check campaign count is accurate
- **Notes/Issues:**
  - 
  - 
  - 

### 6.6 Client Search & Filtering
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Search and filter clients
- [ ] **Test Cases:**
  - Search by client name
  - Filter by status (active, inactive)
  - Filter by salesperson
- **Notes/Issues:**
  - 
  - 
  - 

---

## 7. Salesperson Management

### 7.1 Salesperson List View
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** View all salespersons
- [ ] **Test Steps:**
  - Navigate to salespersons section
  - Verify all salespersons are listed
- **Notes/Issues:**
  - 
  - 
  - 

### 7.2 Salesperson Campaign View
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** View campaigns assigned to a salesperson
- [ ] **Test Steps:**
  - Open salesperson details
  - Verify assigned campaigns are listed
  - Check campaign count is accurate
- **Notes/Issues:**
  - 
  - 
  - 

### 7.3 Salesperson Performance Metrics
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display salesperson performance stats
- [ ] **Data Points:**
  - Total campaigns
  - Active campaigns
  - Completed campaigns
  - Average campaign performance
- **Notes/Issues:**
  - 
  - 
  - 

---

## 8. Reporting & Analytics

### 8.1 Campaign Performance Report
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Generate performance report for campaigns
- [ ] **Test Steps:**
  - Navigate to reports section
  - Select date range
  - Generate report
  - Verify data accuracy
- **Notes/Issues:**
  - 
  - 
  - 

### 8.2 Export to CSV/Excel
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Export campaign data to CSV or Excel
- [ ] **Test Steps:**
  - Click "Export" button
  - Select export format
  - Download file
  - Verify data in exported file
- **Notes/Issues:**
  - 
  - 
  - 

### 8.3 Dashboard Summary Stats
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display summary statistics on main dashboard
- [ ] **Data Points:**
  - Total campaigns
  - Active campaigns
  - Total views, likes, comments
  - Average engagement rate
- **Notes/Issues:**
  - 
  - 
  - 

---

## 9. User Authentication & Permissions

### 9.1 User Login
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Users can log in to the system
- [ ] **Test Steps:**
  - Navigate to login page
  - Enter credentials
  - Click "Login"
  - Verify successful login
- **Notes/Issues:**
  - 
  - 
  - 

### 9.2 User Logout
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Users can log out
- [ ] **Test Steps:**
  - Click user menu
  - Click "Logout"
  - Verify redirected to login page
  - Verify session is cleared
- **Notes/Issues:**
  - 
  - 
  - 

### 9.3 Role-Based Access Control
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Different user roles have different permissions
- [ ] **Test Cases:**
  - Admin: can access all features
  - Manager: can access most features
  - Salesperson: can only access their campaigns
  - Read-only: can view but not edit
- **Notes/Issues:**
  - 
  - 
  - 

### 9.4 Password Reset
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Users can reset forgotten passwords
- [ ] **Test Steps:**
  - Click "Forgot Password"
  - Enter email
  - Receive reset link
  - Click link and set new password
- **Notes/Issues:**
  - 
  - 
  - 

---

## 10. UI/UX & Design

### 10.1 Responsive Design
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App works on different screen sizes
- [ ] **Test Devices:**
  - Desktop (1920x1080)
  - Laptop (1366x768)
  - Tablet (iPad, 768x1024)
  - Mobile (iPhone, 375x812)
- **Notes/Issues:**
  - 
  - 
  - 

### 10.2 Navigation & Menu
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Easy navigation between sections
- [ ] **Test Steps:**
  - Use top navigation menu
  - Use sidebar navigation (if present)
  - Test breadcrumbs
  - Verify active page is highlighted
- **Notes/Issues:**
  - 
  - 
  - 

### 10.3 Loading States
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Show loading indicators during data fetching
- [ ] **Test Steps:**
  - Trigger data fetch (e.g., refresh stats)
  - Verify loading spinner/skeleton appears
  - Verify loading disappears when complete
- **Notes/Issues:**
  - 
  - 
  - 

### 10.4 Error Messages
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display clear error messages to users
- [ ] **Test Cases:**
  - Form validation errors
  - API failure errors
  - Network errors
  - 404 page not found
- **Notes/Issues:**
  - 
  - 
  - 

### 10.5 Success Messages
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Display success confirmations for actions
- [ ] **Test Cases:**
  - Campaign created successfully
  - Campaign updated successfully
  - Stats refreshed successfully
- **Notes/Issues:**
  - 
  - 
  - 

### 10.6 Tooltips & Help Text
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Provide helpful tooltips for complex features
- [ ] **Test Steps:**
  - Hover over info icons
  - Check for help text in forms
  - Verify tooltips are clear and accurate
- **Notes/Issues:**
  - 
  - 
  - 

---

## 11. Performance & Reliability

### 11.1 Page Load Time
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

### 11.2 Data Refresh Performance
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Stats refresh quickly without blocking UI
- [ ] **Test Steps:**
  - Refresh stats for single campaign
  - Refresh stats for all campaigns
  - Verify UI remains responsive
- **Notes/Issues:**
  - 
  - 
  - 

### 11.3 Error Recovery
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App recovers gracefully from errors
- [ ] **Test Cases:**
  - Lose internet connection → should show offline message
  - API fails → should retry or show error
  - Session expires → should redirect to login
- **Notes/Issues:**
  - 
  - 
  - 

### 11.4 Data Persistence
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Data is saved correctly and persists after refresh
- [ ] **Test Steps:**
  - Create/update campaign
  - Refresh browser
  - Verify changes are still present
- **Notes/Issues:**
  - 
  - 
  - 

### 11.5 Concurrent Users
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Multiple users can use the app simultaneously
- [ ] **Test Steps:**
  - Log in from multiple devices/browsers
  - Make changes from each device
  - Verify changes sync correctly
- **Notes/Issues:**
  - 
  - 
  - 

---

## 12. Data Accuracy & Integrity

### 12.1 Campaign Data Consistency
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Campaign data is consistent across views
- [ ] **Test Steps:**
  - View campaign in list
  - View same campaign in details
  - Verify all data matches
- **Notes/Issues:**
  - 
  - 
  - 

### 12.2 Stats Accuracy
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** YouTube stats match actual YouTube data
- [ ] **Test Steps:**
  - Refresh campaign stats
  - Open YouTube video directly
  - Compare views, likes, comments
  - Allow for small discrepancies (YouTube caching)
- **Notes/Issues:**
  - 
  - 
  - 

### 12.3 Calculation Accuracy
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Engagement ratios and health scores are calculated correctly
- [ ] **Test Steps:**
  - Manually calculate expected values
  - Compare with app's calculations
  - Test edge cases (0 views, 0 likes, etc.)
- **Notes/Issues:**
  - 
  - 
  - 

### 12.4 Timestamp Accuracy
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** All timestamps are correct and in the right timezone
- [ ] **Test Steps:**
  - Check "created at" timestamps
  - Check "last updated" timestamps
  - Verify timezone display
- **Notes/Issues:**
  - 
  - 
  - 

---

## 13. Edge Cases & Stress Testing

### 13.1 Empty States
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App handles empty data gracefully
- [ ] **Test Cases:**
  - No campaigns exist → should show "No campaigns" message
  - No clients exist → should show empty state
  - Campaign has no stats yet → should show placeholder
- **Notes/Issues:**
  - 
  - 
  - 

### 13.2 Large Data Sets
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App handles large numbers of campaigns/clients
- [ ] **Test Steps:**
  - Create 100+ campaigns
  - Verify list/table performance
  - Test search and filtering
  - Test pagination
- **Notes/Issues:**
  - 
  - 
  - 

### 13.3 Special Characters in Input
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App handles special characters in campaign names, etc.
- [ ] **Test Cases:**
  - Enter emoji in campaign name
  - Enter quotes/apostrophes
  - Enter HTML/script tags (should be escaped)
- **Notes/Issues:**
  - 
  - 
  - 

### 13.4 Very Long Text
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App handles very long input strings
- [ ] **Test Cases:**
  - Enter 1000-character campaign name
  - Verify text truncation or wrapping
  - Verify database limits are enforced
- **Notes/Issues:**
  - 
  - 
  - 

### 13.5 Deleted/Unavailable Videos
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Handle YouTube videos that are deleted or private
- [ ] **Test Steps:**
  - Create campaign with deleted video
  - Refresh stats
  - Verify appropriate error message
- **Notes/Issues:**
  - 
  - 
  - 

---

## 14. Security

### 14.1 SQL Injection Prevention
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App prevents SQL injection attacks
- [ ] **Test Steps:**
  - Attempt SQL injection in search fields
  - Attempt SQL injection in form inputs
  - Verify inputs are sanitized
- **Notes/Issues:**
  - 
  - 
  - 

### 14.2 XSS Prevention
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** App prevents cross-site scripting attacks
- [ ] **Test Steps:**
  - Enter `<script>alert('XSS')</script>` in text fields
  - Verify script doesn't execute
  - Verify HTML is escaped
- **Notes/Issues:**
  - 
  - 
  - 

### 14.3 API Key Security
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** API keys are not exposed in client-side code
- [ ] **Test Steps:**
  - Inspect network requests
  - Check browser console
  - Verify API keys are only on server
- **Notes/Issues:**
  - 
  - 
  - 

### 14.4 Session Management
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** User sessions are secure and expire appropriately
- [ ] **Test Steps:**
  - Log in
  - Wait for session timeout (or close browser)
  - Verify session expires
  - Verify user is redirected to login
- **Notes/Issues:**
  - 
  - 
  - 

---

## 15. Mobile Experience (if applicable)

### 15.1 Touch Interactions
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Buttons and links are easy to tap on mobile
- [ ] **Test Steps:**
  - Test on mobile device
  - Verify all buttons are tappable
  - Verify no accidental taps
- **Notes/Issues:**
  - 
  - 
  - 

### 15.2 Mobile Navigation
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Navigation works well on mobile (hamburger menu, etc.)
- [ ] **Test Steps:**
  - Open app on mobile
  - Use navigation menu
  - Verify all pages are accessible
- **Notes/Issues:**
  - 
  - 
  - 

### 15.3 Mobile Forms
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Forms are easy to use on mobile
- [ ] **Test Steps:**
  - Fill out campaign creation form on mobile
  - Verify keyboard doesn't obstruct fields
  - Verify form validation works
- **Notes/Issues:**
  - 
  - 
  - 

---

## 16. Integrations Health

### 16.1 YouTube Data API Health
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** YouTube API is functioning correctly
- [ ] **Test Steps:**
  - Check API status/health endpoint
  - Verify API quota usage
  - Test API error handling
- **Notes/Issues:**
  - 
  - 
  - 

### 16.2 JingleSMM API Health (Ratio Fixer)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** JingleSMM API is functioning correctly
- [ ] **Test Steps:**
  - Start Ratio Fixer
  - Verify orders are placed
  - Check JingleSMM dashboard
  - Verify order IDs match
- **Notes/Issues:**
  - 
  - 
  - 

### 16.3 Google Sheets API Health (Ratio Fixer)
- [ ] **Status:** ___ (1-3)
- [ ] **Feature:** Google Sheets integration is functioning
- [ ] **Test Steps:**
  - Provide Google Sheets URL
  - Start Ratio Fixer
  - Verify comments are pulled from sheet
  - Verify sheet is updated with "Used" markers
- **Notes/Issues:**
  - 
  - 
  - 

---

## 17. Known Issues & Workarounds

### Issue 1: [Describe Issue]
- **Status:** ___ (Open / In Progress / Resolved)
- **Description:** 
- **Workaround:** 
- **Priority:** ___ (Low / Medium / High / Critical)

### Issue 2: [Describe Issue]
- **Status:** ___ (Open / In Progress / Resolved)
- **Description:** 
- **Workaround:** 
- **Priority:** ___ (Low / Medium / High / Critical)

### Issue 3: [Describe Issue]
- **Status:** ___ (Open / In Progress / Resolved)
- **Description:** 
- **Workaround:** 
- **Priority:** ___ (Low / Medium / High / Critical)

---

## 18. Feature Requests & Enhancements

### Request 1: [Feature Name]
- **Description:** 
- **Business Value:** 
- **Priority:** ___ (Low / Medium / High)
- **Notes:** 

### Request 2: [Feature Name]
- **Description:** 
- **Business Value:** 
- **Priority:** ___ (Low / Medium / High)
- **Notes:** 

### Request 3: [Feature Name]
- **Description:** 
- **Business Value:** 
- **Priority:** ___ (Low / Medium / High)
- **Notes:** 

---

## 19. Browser Compatibility

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

## 20. Overall Assessment

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
- Admin: 
- Manager: 
- Salesperson: 
- Read-only: 

### Test YouTube Videos
1. Video ID: _________________ (Normal public video)
2. Video ID: _________________ (High-view video)
3. Video ID: _________________ (Low-view video)
4. Video ID: _________________ (Unlisted video)
5. Video ID: _________________ (Deleted/private video for error testing)

### Test Clients
1. Client Name: _________________
2. Client Name: _________________
3. Client Name: _________________

---

**End of Checklist**

*This document should be continuously updated as new features are added or issues are discovered. Share feedback with the development team regularly.*

