# Dashboard Module

## Overview

The unified operations dashboard provides a cross-platform view of campaign activity, revenue, risk, and delivery health across all four platforms (Spotify, Instagram, YouTube, SoundCloud). It's the first screen operators, managers, and admins see when they log in.

**URL**: `/dashboard`
**Accessible by**: Admin, Manager, Operator, Sales

Note: Vendors are redirected to the Spotify vendor portal, and Members are redirected to the SoundCloud member portal — they never see this dashboard.

## Dashboard Layout

The dashboard is organized into four rows of cards, each providing different operational insights.

### Row 1: Revenue and Risk Summary

| Card | What It Shows |
|------|---------------|
| **Active Revenue** | Total active campaign revenue, month-over-month change, number of active campaigns |
| **Invoice Health** | Breakdown of paid, outstanding, and overdue invoices with overdue count |
| **Campaign Risk** | Total risk issues across categories: missing assets, behind schedule, API failures, overdue reports |
| **Ops Queue** | Pending task count, average task age, which platform is the bottleneck |

### Row 2: Campaign Flow and Deadlines

| Card | What It Shows |
|------|---------------|
| **Campaign Funnel** | Visual funnel showing campaigns by lifecycle stage: Intake → Setup → Active → Reporting → Completed |
| **Deadlines** | Upcoming deadlines for the next 7 days: reports due, campaigns ending, final reviews |

### Row 3: Platform Delivery Health

One health card per platform showing real-time operational status:

| Platform | Metrics Shown |
|----------|---------------|
| **Spotify** | Active campaigns, average pace %, behind-schedule count, API connection status |
| **Instagram** | Active campaigns, posts scheduled today, posts pending approval |
| **YouTube** | Campaigns in monitoring phase, ratio alerts, API issues |
| **SoundCloud** | Active campaigns, reposts scheduled today, missed actions |

### Row 4: Future Revenue and Alerts

| Card | What It Shows |
|------|---------------|
| **Ending Soon** | Campaigns ending within 7, 14, and 30 days with performance status (on track, over, under) |
| **Alerts Feed** | Actionable alerts: invoice overdue, underperforming campaigns, missing assets, report overdue, API disconnected |
| **Profitability Risk** | Campaigns with low margins (below 20%), margin percentage breakdown |

## How To

### Check overall platform health

1. Navigate to **Dashboard** (it's the default landing page)
2. Look at Row 3 (Platform Delivery Health) for a quick status of each platform
3. Green indicators = healthy, Yellow = warnings, Red = issues requiring attention

### Find campaigns at risk

1. On the dashboard, check the **Campaign Risk** card (Row 1)
2. It shows counts for: missing assets, behind schedule, API failures, overdue reports
3. Click the card to navigate to detailed risk views

### See what's due soon

1. Check the **Deadlines** card (Row 2) for items due in the next 7 days
2. Check the **Ending Soon** card (Row 4) for campaigns about to complete
3. Items are color-coded by urgency

### Navigate to specific platforms

The dashboard cards are clickable. Click on a platform health card or campaign to navigate to the relevant module. You can also use:
- The top navigation bar to switch between platforms
- Quick action buttons for Ops Queue and Campaign Intake

### Refresh dashboard data

Click the **Refresh** button in the dashboard header to reload all metrics. Data is also auto-refreshed on page load.

## Data Sources

The dashboard aggregates data from all platform modules:
- Spotify campaigns, invoices, and vendor data
- Instagram campaigns and post metrics
- YouTube campaigns and health scores
- SoundCloud campaigns and queue status
- Ops queue tasks across all platforms

## FAQ

**Q: Why don't I see the dashboard?**
A: Check your role. Vendors see the Spotify vendor portal, and Members see the SoundCloud portal. Only Admin, Manager, Operator, and Sales roles see the dashboard.

**Q: How often is dashboard data updated?**
A: Data refreshes on page load and when you click the Refresh button. The underlying data comes from database queries that reflect the latest state.

**Q: What does "behind schedule" mean?**
A: A campaign is behind schedule when its actual delivery rate (streams, views, engagement) is below the expected pace based on its timeline and goals.

**Q: What are "API failures" in the risk card?**
A: These indicate that connections to external APIs (Spotify, YouTube, etc.) have failed or are experiencing errors, which could impact data freshness.
