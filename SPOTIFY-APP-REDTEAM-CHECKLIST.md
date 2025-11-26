# Spotify Campaign Manager - Red Team Testing Checklist

**Version:** 1.0  
**Date:** November 26, 2025  
**Purpose:** Feature testing, bug identification, and feedback collection

---

## 📋 How to Use This Checklist

### Maturity Scale
- **1** = ❌ No basic functionality / Not complete
- **2** = ⚠️ Basic functionality / Not complete
- **3** = ✅ Basic functionality complete

### Instructions
1. Test each feature thoroughly
2. Rate the maturity level (1-3)
3. Document any bugs found
4. Add suggestions in the "Notes" section
5. Mark checkboxes as you complete testing

---

## 🎯 Campaign Management

### Campaign Creation

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Create new campaign via wizard | ☐ | 1 / 2 / 3 | |
| Add campaign name | ☐ | 1 / 2 / 3 | |
| Set artist name | ☐ | 1 / 2 / 3 | |
| Add track URL (Spotify link) | ☐ | 1 / 2 / 3 | |
| Set stream goal | ☐ | 1 / 2 / 3 | |
| Set budget | ☐ | 1 / 2 / 3 | |
| Select start date | ☐ | 1 / 2 / 3 | |
| Add Spotify for Artists URL | ☐ | 1 / 2 / 3 | |
| Assign to salesperson | ☐ | 1 / 2 / 3 | |
| Save as draft | ☐ | 1 / 2 / 3 | |
| Activate campaign | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Add any issues or suggestions here]




```

---

### Campaign History View

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| View all campaigns in table | ☐ | 1 / 2 / 3 | |
| Search campaigns by name | ☐ | 1 / 2 / 3 | |
| Search by artist | ☐ | 1 / 2 / 3 | |
| Search by client | ☐ | 1 / 2 / 3 | |
| Filter by status (Active/Draft/Paused/Completed) | ☐ | 1 / 2 / 3 | |
| Filter by SFA status (Active/Stale/No URL) | ☐ | 1 / 2 / 3 | |
| Filter by performance (Over/On-track/Under) | ☐ | 1 / 2 / 3 | |
| Sort by campaign name | ☐ | 1 / 2 / 3 | |
| Sort by budget | ☐ | 1 / 2 / 3 | |
| Sort by streams (24h/7d) | ☐ | 1 / 2 / 3 | |
| Sort by start date | ☐ | 1 / 2 / 3 | |
| Sort by progress | ☐ | 1 / 2 / 3 | |
| Clear all filters | ☐ | 1 / 2 / 3 | |
| Select multiple campaigns (checkboxes) | ☐ | 1 / 2 / 3 | |
| Bulk delete campaigns | ☐ | 1 / 2 / 3 | |
| Export campaigns to CSV | ☐ | 1 / 2 / 3 | |
| Import campaigns from CSV | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Add any issues or suggestions here]




```

---

### Campaign Details Modal

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Open campaign details by clicking row | ☐ | 1 / 2 / 3 | |
| View campaign summary (Overview tab) | ☐ | 1 / 2 / 3 | |
| See green SFA badge (if active) | ☐ | 1 / 2 / 3 | |
| See yellow SFA badge (if stale) | ☐ | 1 / 2 / 3 | |
| See gray "No SFA" badge | ☐ | 1 / 2 / 3 | |
| Hover SFA badge for tooltip | ☐ | 1 / 2 / 3 | |
| View "Updated Xh ago" timestamp | ☐ | 1 / 2 / 3 | |
| Edit campaign name | ☐ | 1 / 2 / 3 | |
| Edit budget | ☐ | 1 / 2 / 3 | |
| Edit stream goal | ☐ | 1 / 2 / 3 | |
| Edit SFA URL | ☐ | 1 / 2 / 3 | |
| Change campaign status | ☐ | 1 / 2 / 3 | |
| Delete campaign | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Add any issues or suggestions here]




```

---

## 📊 Real-Time Data Display

### Stream Data (24h/7d/28d)

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Display 24h streams in table | ☐ | 1 / 2 / 3 | |
| Display 7d streams in table | ☐ | 1 / 2 / 3 | |
| Display 28d streams in modal | ☐ | 1 / 2 / 3 | |
| Show "scraped" label for real data | ☐ | 1 / 2 / 3 | |
| Show "estimated" label for old data | ☐ | 1 / 2 / 3 | |
| Display trend indicators (↑ green) | ☐ | 1 / 2 / 3 | |
| Display trend indicators (↓ red) | ☐ | 1 / 2 / 3 | |
| Show change amount (e.g., ↑245) | ☐ | 1 / 2 / 3 | |
| Numbers format correctly (1,490 not 1490) | ☐ | 1 / 2 / 3 | |
| Data updates daily (check after 2 AM) | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with campaign: DAUNTER x URAI - ENGULFED]




```

---

### SFA Status Indicators

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Green badge shows for active campaigns | ☐ | 1 / 2 / 3 | |
| Yellow badge shows for stale campaigns | ☐ | 1 / 2 / 3 | |
| Gray badge shows for no-URL campaigns | ☐ | 1 / 2 / 3 | |
| Badge appears on campaign row | ☐ | 1 / 2 / 3 | |
| Badge appears in details modal | ☐ | 1 / 2 / 3 | |
| Tooltip shows last scraped time | ☐ | 1 / 2 / 3 | |
| Tooltip shows correct status message | ☐ | 1 / 2 / 3 | |
| Filter by SFA status works | ☐ | 1 / 2 / 3 | |
| Count shows in filter dropdown | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Add any issues or suggestions here]




```

---

## 🎵 Playlist Management

### Playlists Tab

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Open Playlists tab in campaign modal | ☐ | 1 / 2 / 3 | |
| View total playlists count | ☐ | 1 / 2 / 3 | |
| View total 24h streams summary | ☐ | 1 / 2 / 3 | |
| View total 7d streams summary | ☐ | 1 / 2 / 3 | |
| View total 28d streams summary | ☐ | 1 / 2 / 3 | |
| See playlists table with columns | ☐ | 1 / 2 / 3 | |
| Column: Playlist Name | ☐ | 1 / 2 / 3 | |
| Column: Vendor | ☐ | 1 / 2 / 3 | |
| Column: Curator | ☐ | 1 / 2 / 3 | |
| Column: 24h Streams | ☐ | 1 / 2 / 3 | |
| Column: 7d Streams | ☐ | 1 / 2 / 3 | |
| Column: 28d Streams | ☐ | 1 / 2 / 3 | |
| Click playlist name to open Spotify | ☐ | 1 / 2 / 3 | |
| Edit playlist vendor assignment | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Add any issues or suggestions here]




```

---

### Algorithmic Playlists

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Green "Algorithmic" badge displays | ☐ | 1 / 2 / 3 | |
| Badge shows for "Radio" playlists | ☐ | 1 / 2 / 3 | |
| Badge shows for "Discover Weekly" | ☐ | 1 / 2 / 3 | |
| Badge shows for "Your DJ" | ☐ | 1 / 2 / 3 | |
| Badge shows for "Mixes" | ☐ | 1 / 2 / 3 | |
| Badge shows for "Daylist" | ☐ | 1 / 2 / 3 | |
| Badge shows for "On Repeat" | ☐ | 1 / 2 / 3 | |
| Badge shows for "Release Radar" | ☐ | 1 / 2 / 3 | |
| Vendor shows as "Spotify" | ☐ | 1 / 2 / 3 | |
| Algorithmic section shows in summary | ☐ | 1 / 2 / 3 | |
| Algorithmic stats show 24h/7d/28d | ☐ | 1 / 2 / 3 | |
| Vendor playlists don't have badge | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Check with multiple campaigns to verify detection]




```

---

### Vendor Performance

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| View vendor breakdown section | ☐ | 1 / 2 / 3 | |
| See vendor name | ☐ | 1 / 2 / 3 | |
| See playlist count per vendor | ☐ | 1 / 2 / 3 | |
| See 24h streams per vendor | ☐ | 1 / 2 / 3 | |
| See 7d streams per vendor | ☐ | 1 / 2 / 3 | |
| See 28d streams per vendor | ☐ | 1 / 2 / 3 | |
| Expand/collapse vendor sections | ☐ | 1 / 2 / 3 | |
| View individual playlists per vendor | ☐ | 1 / 2 / 3 | |
| Chart/graph visualization (if exists) | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Add any issues or suggestions here]




```

---

## 🚀 Automated Scraping System

### Daily Scraper (Check after 2 AM UTC)

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Scraper runs automatically at 2 AM | ☐ | 1 / 2 / 3 | |
| All campaigns with SFA URLs scraped | ☐ | 1 / 2 / 3 | |
| New campaigns auto-detected | ☐ | 1 / 2 / 3 | |
| Data appears in frontend after run | ☐ | 1 / 2 / 3 | |
| "Updated Xh ago" shows recent time | ☐ | 1 / 2 / 3 | |
| Trend indicators update | ☐ | 1 / 2 / 3 | |
| No campaigns stuck in "stale" status | ☐ | 1 / 2 / 3 | |

**Testing Instructions:**
```
1. Note current "Updated Xh ago" time
2. Check same campaigns after 2 AM UTC
3. Verify timestamp changed to "0h ago" or similar
4. Verify stream numbers updated
5. Check that trends appear (after 2nd run)
```

**Notes:**
```
[Document any campaigns that didn't update]




```

---

## 📈 Data Export & Import

### CSV Export

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Click "Export CSV" button | ☐ | 1 / 2 / 3 | |
| File downloads successfully | ☐ | 1 / 2 / 3 | |
| File name includes date | ☐ | 1 / 2 / 3 | |
| All visible campaigns included | ☐ | 1 / 2 / 3 | |
| Filtered campaigns export correctly | ☐ | 1 / 2 / 3 | |
| Column: Campaign Name | ☐ | 1 / 2 / 3 | |
| Column: Artist | ☐ | 1 / 2 / 3 | |
| Column: Client | ☐ | 1 / 2 / 3 | |
| Column: Streams (24h) | ☐ | 1 / 2 / 3 | |
| Column: 24h Trend | ☐ | 1 / 2 / 3 | |
| Column: Streams (7d) | ☐ | 1 / 2 / 3 | |
| Column: 7d Trend | ☐ | 1 / 2 / 3 | |
| Column: Streams (28d) | ☐ | 1 / 2 / 3 | |
| Column: Playlists (24h) | ☐ | 1 / 2 / 3 | |
| Column: Playlists (7d) | ☐ | 1 / 2 / 3 | |
| Column: SFA Status | ☐ | 1 / 2 / 3 | |
| Column: Last Scraped | ☐ | 1 / 2 / 3 | |
| Data formats correctly in Excel | ☐ | 1 / 2 / 3 | |
| Numbers not corrupted | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with different filter combinations]




```

---

### CSV Import

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| Click "Import Campaigns" button | ☐ | 1 / 2 / 3 | |
| Upload CSV file | ☐ | 1 / 2 / 3 | |
| Preview imported data | ☐ | 1 / 2 / 3 | |
| Map columns correctly | ☐ | 1 / 2 / 3 | |
| Validate data before import | ☐ | 1 / 2 / 3 | |
| Show errors for invalid data | ☐ | 1 / 2 / 3 | |
| Import creates new campaigns | ☐ | 1 / 2 / 3 | |
| Import updates existing campaigns | ☐ | 1 / 2 / 3 | |
| Success message displays | ☐ | 1 / 2 / 3 | |
| New campaigns appear in table | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with sample CSV files of different sizes]




```

---

## 👥 User Roles & Permissions

### Admin Role

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| View all campaigns | ☐ | 1 / 2 / 3 | |
| Create campaigns | ☐ | 1 / 2 / 3 | |
| Edit any campaign | ☐ | 1 / 2 / 3 | |
| Delete campaigns | ☐ | 1 / 2 / 3 | |
| View vendor payouts | ☐ | 1 / 2 / 3 | |
| Approve/reject submissions | ☐ | 1 / 2 / 3 | |
| Access all tabs | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with admin account]




```

---

### Manager Role

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| View all campaigns | ☐ | 1 / 2 / 3 | |
| Create campaigns | ☐ | 1 / 2 / 3 | |
| Edit campaigns | ☐ | 1 / 2 / 3 | |
| Delete own campaigns only | ☐ | 1 / 2 / 3 | |
| View vendor data | ☐ | 1 / 2 / 3 | |
| Cannot delete other's campaigns | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with manager account]




```

---

### Salesperson Role

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| View own campaigns only | ☐ | 1 / 2 / 3 | |
| Create campaigns | ☐ | 1 / 2 / 3 | |
| Edit own campaigns | ☐ | 1 / 2 / 3 | |
| Cannot view others' campaigns | ☐ | 1 / 2 / 3 | |
| Cannot access vendor payouts | ☐ | 1 / 2 / 3 | |
| Submit campaigns for review | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with salesperson account]




```

---

### Vendor Role

| Feature | Maturity | Status | Bugs/Notes |
|---------|----------|--------|------------|
| View assigned campaigns only | ☐ | 1 / 2 / 3 | |
| See vendor dashboard | ☐ | 1 / 2 / 3 | |
| View own playlists | ☐ | 1 / 2 / 3 | |
| Add/edit own playlists | ☐ | 1 / 2 / 3 | |
| Update campaign responses | ☐ | 1 / 2 / 3 | |
| Cannot view other vendors' data | ☐ | 1 / 2 / 3 | |
| Cannot edit campaign details | ☐ | 1 / 2 / 3 | |

**Notes:**
```
[Test with vendor account]




```

---

## 🐛 Bug Testing Areas

### Edge Cases to Test

| Test Case | Tested | Pass/Fail | Notes |
|-----------|--------|-----------|-------|
| Campaign with 0 streams | ☐ | ✅ / ❌ | |
| Campaign with no SFA URL | ☐ | ✅ / ❌ | |
| Campaign with invalid SFA URL | ☐ | ✅ / ❌ | |
| Campaign with 100+ playlists | ☐ | ✅ / ❌ | |
| Campaign with special characters in name | ☐ | ✅ / ❌ | |
| Very long campaign name (100+ chars) | ☐ | ✅ / ❌ | |
| Negative budget/goal values | ☐ | ✅ / ❌ | |
| Future start date | ☐ | ✅ / ❌ | |
| Past start date (5 years ago) | ☐ | ✅ / ❌ | |
| Delete campaign with active data | ☐ | ✅ / ❌ | |
| Export with 0 campaigns | ☐ | ✅ / ❌ | |
| Export with 1000+ campaigns | ☐ | ✅ / ❌ | |
| Import CSV with missing columns | ☐ | ✅ / ❌ | |
| Import CSV with extra columns | ☐ | ✅ / ❌ | |
| Import CSV with duplicate campaigns | ☐ | ✅ / ❌ | |
| Filter + search combination | ☐ | ✅ / ❌ | |
| Multiple filters at once | ☐ | ✅ / ❌ | |
| Sort while filters active | ☐ | ✅ / ❌ | |
| Quick succession of filter changes | ☐ | ✅ / ❌ | |
| Browser refresh during edit | ☐ | ✅ / ❌ | |
| Multiple tabs open editing same campaign | ☐ | ✅ / ❌ | |

**Notes:**
```
[Document any crashes, errors, or unexpected behavior]




```

---

### Performance Testing

| Test Case | Tested | Pass/Fail | Notes |
|-----------|--------|-----------|-------|
| Load page with 500+ campaigns | ☐ | ✅ / ❌ | Load time: ____ sec |
| Search with 1 character | ☐ | ✅ / ❌ | Response time: ____ ms |
| Apply filter to large dataset | ☐ | ✅ / ❌ | Response time: ____ ms |
| Sort 1000+ campaigns | ☐ | ✅ / ❌ | Response time: ____ ms |
| Open campaign with 200+ playlists | ☐ | ✅ / ❌ | Load time: ____ sec |
| Export 1000+ campaigns to CSV | ☐ | ✅ / ❌ | Export time: ____ sec |
| Import CSV with 100+ rows | ☐ | ✅ / ❌ | Import time: ____ sec |
| Scroll through long campaign list | ☐ | ✅ / ❌ | Smooth: Yes / No |
| Open/close modal repeatedly | ☐ | ✅ / ❌ | Any lag? |
| Switch tabs in modal quickly | ☐ | ✅ / ❌ | Any lag? |

**Notes:**
```
[Document any slowness or performance issues]




```

---

### Browser Compatibility

| Browser | Version | Tested | Issues Found |
|---------|---------|--------|--------------|
| Chrome | Latest | ☐ | |
| Firefox | Latest | ☐ | |
| Safari | Latest | ☐ | |
| Edge | Latest | ☐ | |
| Mobile Chrome | Latest | ☐ | |
| Mobile Safari | Latest | ☐ | |

**Notes:**
```
[Document any browser-specific issues]




```

---

### Mobile Responsiveness

| Feature | Tested | Works Well | Issues |
|---------|--------|------------|--------|
| Campaign table displays | ☐ | Yes / No | |
| Filters accessible | ☐ | Yes / No | |
| Search works | ☐ | Yes / No | |
| Campaign modal opens | ☐ | Yes / No | |
| Tabs switchable | ☐ | Yes / No | |
| Playlist table scrolls | ☐ | Yes / No | |
| Buttons clickable (not too small) | ☐ | Yes / No | |
| Text readable (not too small) | ☐ | Yes / No | |
| Edit forms usable | ☐ | Yes / No | |
| Dropdowns work | ☐ | Yes / No | |

**Notes:**
```
[Test on actual mobile devices, not just browser DevTools]




```

---

## 🎨 UI/UX Feedback

### Visual Design

| Aspect | Rating (1-5) | Feedback |
|--------|--------------|----------|
| Overall appearance | ☐☐☐☐☐ | |
| Color scheme | ☐☐☐☐☐ | |
| Typography/readability | ☐☐☐☐☐ | |
| Icon clarity | ☐☐☐☐☐ | |
| Badge design | ☐☐☐☐☐ | |
| Table layout | ☐☐☐☐☐ | |
| Modal design | ☐☐☐☐☐ | |
| Button styling | ☐☐☐☐☐ | |
| Loading indicators | ☐☐☐☐☐ | |
| Error messages | ☐☐☐☐☐ | |

**General Design Feedback:**
```
[What looks good? What needs improvement?]




```

---

### User Experience

| Aspect | Rating (1-5) | Feedback |
|--------|--------------|----------|
| Intuitive navigation | ☐☐☐☐☐ | |
| Easy to find features | ☐☐☐☐☐ | |
| Clear labels/instructions | ☐☐☐☐☐ | |
| Logical workflow | ☐☐☐☐☐ | |
| Error handling | ☐☐☐☐☐ | |
| Success feedback | ☐☐☐☐☐ | |
| Help/documentation | ☐☐☐☐☐ | |
| Keyboard shortcuts | ☐☐☐☐☐ | |
| Undo/redo functionality | ☐☐☐☐☐ | |
| Overall satisfaction | ☐☐☐☐☐ | |

**General UX Feedback:**
```
[What's easy to use? What's confusing?]




```

---

## 💡 Feature Requests

### Missing Features

| Feature Request | Priority (High/Med/Low) | Description |
|-----------------|-------------------------|-------------|
| | ☐ H ☐ M ☐ L | |
| | ☐ H ☐ M ☐ L | |
| | ☐ H ☐ M ☐ L | |
| | ☐ H ☐ M ☐ L | |
| | ☐ H ☐ M ☐ L | |

---

### Improvement Suggestions

| Current Feature | Improvement Suggestion | Impact |
|-----------------|------------------------|--------|
| | | |
| | | |
| | | |
| | | |
| | | |

---

## 🚨 Critical Bugs Found

### Blocker Issues (Prevent core functionality)

| Bug # | Description | Steps to Reproduce | Expected | Actual | Severity |
|-------|-------------|-------------------|----------|--------|----------|
| 1 | | | | | 🔴 Critical |
| 2 | | | | | 🔴 Critical |
| 3 | | | | | 🔴 Critical |

---

### Major Issues (Significant impact)

| Bug # | Description | Steps to Reproduce | Expected | Actual | Severity |
|-------|-------------|-------------------|----------|--------|----------|
| 1 | | | | | 🟡 Major |
| 2 | | | | | 🟡 Major |
| 3 | | | | | 🟡 Major |

---

### Minor Issues (Low impact)

| Bug # | Description | Steps to Reproduce | Expected | Actual | Severity |
|-------|-------------|-------------------|----------|--------|----------|
| 1 | | | | | 🟢 Minor |
| 2 | | | | | 🟢 Minor |
| 3 | | | | | 🟢 Minor |

---

## 📊 Overall Assessment

### Maturity Summary

| Category | Average Score | Notes |
|----------|---------------|-------|
| Campaign Management | __ / 3 | |
| Real-Time Data | __ / 3 | |
| Playlist Management | __ / 3 | |
| Automated Scraping | __ / 3 | |
| Data Export/Import | __ / 3 | |
| User Roles | __ / 3 | |
| Overall UI/UX | __ / 5 | |

---

### Final Recommendations

**Must Fix Before Launch:**
```
1. 
2. 
3. 
```

**Should Fix Soon:**
```
1. 
2. 
3. 
```

**Nice to Have:**
```
1. 
2. 
3. 
```

---

### Sign-Off

**Tester Name:** ______________________________  
**Date Completed:** ___________________________  
**Total Testing Hours:** _______________________  
**Overall Rating:** ☐☐☐☐☐ (1-5 stars)

**Additional Comments:**
```







```

---

**End of Red Team Checklist**  
**Version:** 1.0  
**Last Updated:** November 26, 2025

