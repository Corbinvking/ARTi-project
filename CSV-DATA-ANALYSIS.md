# CSV Data Analysis - Active Campaigns

## All Available Columns

Here's every column from the CSV and what it contains:

### 1. **Campaign** (Primary Key)
- Full campaign name (e.g., "Karma - Perfect Angel BB")
- Format: Usually "Artist - Song Name"
- **Use:** Primary identifier, display name

### 2. **Client** (Foreign Key)
- Client/Artist name
- **Use:** Link to clients table, create if doesn't exist

### 3. **Update Client** (Status Flag)
- Values: "checked" or empty
- **Use:** Indicates if client data was verified/updated
- **UI:** Could show a "Verified" badge

### 4. **Goal** (Target Streams)
- Target stream count for campaign
- **Use:** Campaign goal tracking
- **UI:** Progress bars, goal displays

### 5. **Remaining** (Streams Left)
- How many streams still needed to hit goal
- **Use:** Calculate progress percentage
- **UI:** "X streams remaining" display

### 6. **Start Date**
- Campaign start date (MM/DD/YYYY)
- **Use:** Timeline tracking, age calculation
- **UI:** Campaign age, timeline view

### 7. **Daily** (Daily Stream Rate)
- Current daily stream count
- **Use:** Performance tracking, velocity
- **UI:** "Daily streams" metric, trend charts

### 8. **Weekly** (Weekly Stream Rate)
- Current weekly stream count
- **Use:** Performance tracking, velocity
- **UI:** "Weekly streams" metric, trend charts

### 9. **URL** (Spotify Track Link)
- Direct Spotify track URL
- **Use:** Track linking, player embed
- **UI:** Clickable play button, preview

### 10. **Playlists** (Curated Playlist List)
- Multi-line list of playlists song is on
- Format: "- Playlist Name [NEW]"
- **Use:** Historical playlist tracking
- **UI:** Playlist history view, NEW badge

### 11. **Status** (Campaign Status)
- Values: "Active", "Paused", "Completed", "Draft"
- **Use:** Filter campaigns, workflow
- **UI:** Status badges, filters

### 12. **Vendor** (Vendor Assignment)
- Which vendor is handling this campaign
- Values: "Club Restricted", "Glenn", "Golden Nugget", etc.
- **Use:** Vendor performance tracking, costs
- **UI:** Vendor badges, vendor analytics

### 13. **Sale price** (Budget/Cost)
- How much client paid for campaign
- Format: "$XXX.XX"
- **Use:** Revenue tracking, ROI calculation
- **UI:** Budget display, profit margins

### 14. **Paid Vendor?** (Payment Status)
- Values: "checked" or empty
- **Use:** Track if vendor has been paid
- **UI:** Payment status indicator

### 15. **Curator Status** (Playlist Response)
- Values: "Accepted", "Rejected", "Pending", "TBD"
- **Use:** Track playlist curator responses
- **UI:** Response status per campaign

### 16. **SFA** (Spotify for Artists Link)
- Direct SFA stats link
- **Use:** Link to detailed analytics
- **UI:** External link button, data sync

### 17. **Notify Vendor?** (Action Flag)
- Values: "checked" or empty
- **Use:** Track communication needs
- **UI:** Action items, notifications

### 18. **Ask For SFA** (Action Flag)
- Values: "checked" or empty
- **Use:** Track if SFA access requested
- **UI:** Action items, follow-up tasks

### 19. **Notes** (Campaign Notes)
- Free-form notes about campaign
- **Use:** Important context, special instructions
- **UI:** Notes field, tooltips, alerts

### 20. **Last Modified** (Timestamp)
- When campaign was last updated
- Format: "MM/DD/YYYY HH:MMam/pm"
- **Use:** Activity tracking, audit trail
- **UI:** "Last updated" display, change log

### 21. **Email 2 (from Clients)** (Contact Info)
- Secondary client email
- **Use:** Client communication
- **UI:** Contact card, email links

### 22. **Email 3 (from Clients)** (Contact Info)
- Tertiary client email
- **Use:** Client communication
- **UI:** Contact card, email links

### 23. **SP Playlist Stuff** (Additional Playlists)
- Extra playlist URLs/data
- Often contains actual Spotify playlist links
- **Use:** Additional playlist tracking
- **UI:** Extended playlist view

## Data We're Currently MISSING

### Critical Data Not Being Captured:
1. ✅ **Daily/Weekly stream rates** - Shows campaign velocity
2. ✅ **Remaining streams** - Calculates actual progress
3. ✅ **Paid Vendor status** - Payment tracking
4. ✅ **Curator Status** - Response tracking
5. ✅ **Update Client flag** - Data quality indicator
6. ✅ **Notify Vendor flag** - Action items
7. ✅ **Ask For SFA flag** - Follow-up tasks
8. ✅ **Last Modified** - Audit trail
9. ✅ **Additional emails** - Full contact info
10. ✅ **SP Playlist Stuff** - Additional playlist data
11. ✅ **Playlists column** - Historical playlist list

## Recommended Schema Updates

### Add to `spotify_campaigns` table:

```sql
-- Performance metrics
daily_streams INTEGER DEFAULT 0,
weekly_streams INTEGER DEFAULT 0,

-- Payment tracking
paid_vendor BOOLEAN DEFAULT FALSE,
payment_date TIMESTAMP,

-- Curator response tracking
curator_status VARCHAR(50), -- 'Accepted', 'Rejected', 'Pending', 'TBD'

-- Action flags
update_client_verified BOOLEAN DEFAULT FALSE,
notify_vendor BOOLEAN DEFAULT FALSE,
ask_for_sfa BOOLEAN DEFAULT FALSE,

-- Audit trail
last_modified TIMESTAMP,

-- Historical playlists (from CSV)
historical_playlists TEXT, -- JSON array of playlist names
playlist_links TEXT, -- Additional playlist URLs from "SP Playlist Stuff"
```

### Add to `clients` table:

```sql
email_secondary VARCHAR(255),
email_tertiary VARCHAR(255),
verified BOOLEAN DEFAULT FALSE, -- From "Update Client" column
```

### Add to `campaign_playlists` table:

```sql
is_new BOOLEAN DEFAULT FALSE, -- Track [NEW] playlists
added_via_csv BOOLEAN DEFAULT FALSE, -- Track source
```

## UI Enhancements Needed

### 1. Campaign Card/Row
Show real-time metrics:
- Daily: XXX streams/day
- Weekly: XXX streams/week
- Remaining: XXX of YYY (ZZ%)
- Last updated: X hours ago

### 2. Vendor Performance Dashboard
- Paid vs Unpaid campaigns
- Acceptance rate (Curator Status)
- Average daily streams by vendor
- Revenue per vendor

### 3. Action Items Panel
- Campaigns needing vendor notification
- Campaigns needing SFA access
- Campaigns with pending curator responses

### 4. Client Contact Management
- Display all email addresses
- Verified clients badge
- Communication history

### 5. Campaign Timeline
- Start date
- Last modified
- Status changes
- Milestone events

### 6. Playlist History View
- Show historical playlists from CSV
- Mark [NEW] playlists
- Link to actual Spotify playlists
- Compare CSV playlists vs scraped playlists

## Implementation Priority

### Phase 1: Core Metrics (IMMEDIATE)
1. Import Daily/Weekly streams
2. Import Remaining streams
3. Calculate and display progress
4. Import and display Vendor assignments
5. Import Curator Status

### Phase 2: Payment Tracking
1. Import Paid Vendor status
2. Create payment tracking UI
3. Add payment date field
4. Vendor payment dashboard

### Phase 3: Action Items
1. Import action flags
2. Create action items panel
3. Add notification system
4. Track completion

### Phase 4: Full Contact Management
1. Import all email addresses
2. Create contact cards
3. Add communication tracking
4. Email templates

### Phase 5: Advanced Analytics
1. Historical playlist comparison
2. Playlist performance over time
3. Vendor ROI analysis
4. Campaign velocity trends

## Data Quality Insights

### From the CSV we can track:
- Which campaigns have SFA access (SFA column populated)
- Which campaigns are verified (Update Client = "checked")
- Which vendors have been paid (Paid Vendor = "checked")
- Which playlists are newly added ([NEW] tag)
- Campaign progression (Remaining vs Goal)
- Performance trends (Daily/Weekly changes)

## Next Steps

1. Update database schema to capture all fields
2. Enhance import script to parse all columns
3. Update UI components to display new data
4. Create new dashboard views for action items
5. Add vendor payment tracking interface
6. Build campaign velocity charts
7. Create playlist comparison tool (CSV vs scraped)

