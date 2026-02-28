# Cross-Platform Workflows

## Campaign Lifecycle (All Platforms)

Every campaign across the platform follows a general lifecycle, though specific steps vary by platform.

```
Intake → Setup → Active → Reporting → Completed
```

### Stage 1: Intake

A new campaign request enters the system. This can happen via:
- **Campaign intake form** in the platform UI (Spotify, YouTube, Instagram)
- **Member submission** (SoundCloud portal)
- **CSV import** (Spotify bulk campaigns)
- **Manual creation** by an operator or manager

At this stage the campaign is in **Draft** or **Pending** status.

### Stage 2: Setup

The campaign is configured and prepared for launch:
- Vendor/creator assignments finalized
- Budget allocated and confirmed
- Playlist/channel selections made (Spotify, SoundCloud)
- Quality guardrails set (Instagram)
- Client approval obtained
- Invoice created or status set

### Stage 3: Active

The campaign is live and delivering:
- **Spotify**: Songs placed on playlists, streams accumulating
- **Instagram**: Creators posting content, views and engagement being tracked
- **YouTube**: Engagement services running, health monitoring active
- **SoundCloud**: Track reposted across network channels

During this stage, the platform monitors:
- Delivery pace vs. goals
- Budget burn rate
- Vendor/creator performance
- Health metrics (YouTube ratio alerts)

### Stage 4: Reporting

As the campaign nears completion:
- Final performance data collected
- Reports prepared for the client
- Vendor payments calculated
- Campaign results analyzed

### Stage 5: Completed

The campaign is finished:
- Final status set to **Completed**
- Performance summary available
- Vendor payments processed
- Invoice finalized
- Campaign archived for historical reference

## Intake-to-Delivery Workflow by Platform

### Spotify

```
Client request
  → Salesperson creates campaign via Campaign Intake
  → Admin/Manager reviews and approves
  → Vendors assigned, playlists selected
  → Campaign goes Active
  → Scraper collects real stream data
  → Performance tracked in Campaign Details
  → Vendor payments processed
  → Campaign completed
```

### Instagram

```
Client request
  → Campaign Builder creates campaign with AI creator matching
  → Creators assigned, budget allocated
  → Campaign launched
  → Creators submit posts
  → QA reviews and approves posts
  → Performance tracked (views, likes, engagement)
  → Campaign completed
```

### YouTube

```
Client request
  → Campaign Intake form submitted
  → Service types selected (views, likes, comments)
  → Vendors assigned
  → Campaign goes Active
  → Health monitoring tracks engagement ratios
  → Ratio fixer applied if needed
  → Vendor payments processed
  → Campaign completed
```

### SoundCloud

```
Member submits track via portal
  → Submission enters queue
  → Operator reviews and approves
  → Campaign created from submission
  → Track reposted across network
  → Performance tracked (plays, reposts)
  → Credits deducted from member
  → Campaign completed
```

## Ops Queue Workflow

The Ops Queue centralizes all pending actions across platforms.

```
New items enter queue from:
  - Spotify: New campaign submissions, pending vendor responses
  - Instagram: Posts pending QA review
  - YouTube: Campaigns needing attention
  - SoundCloud: Track submissions pending review

Operator processes queue:
  → Filters by platform or priority
  → Clicks item to navigate to the relevant platform
  → Takes action (approve, review, update)
  → Item exits queue when action is completed
```

### Queue Priority

Items are prioritized by:
1. **High priority** (alert icon): Urgent issues, overdue items, campaigns at risk
2. **Normal priority**: Standard tasks in order of creation date
3. **Platform grouping**: Operators can filter by platform to batch-process similar items

## Bug/Feature Reporting Workflow

```
User discovers issue
  → Option A: Use in-app FAB (element picker + report form)
  → Option B: Tell the Cursor Slack bot
  → Option C: Create a GitHub issue manually

In-app report flow:
  → Report saved to Supabase
  → GitHub Issue created automatically with labels
  → Issue routed to correct GitHub Project
  → Agentic pipeline: Triage → Dispatch → Agent Worker → PR
  → PR reviewed and merged
  → Issue auto-closed, branch deleted

Slack bot flow:
  → Bot investigates the issue
  → Bot creates a GitHub Issue following the agentic protocol
  → Same pipeline as above
```

## Notification Workflow

Slack notifications are sent for key events when configured:

| Platform | Events |
|----------|--------|
| Spotify | Campaign status changes, submission approvals/rejections |
| Instagram | Campaign status changes, new campaigns (via intake) |
| YouTube | Campaign status changes, new campaigns |
| SoundCloud | Campaign status changes, submission updates, inquiry changes, reconnect emails |

### Configuration

Each platform's Slack notifications are configured independently:
1. Navigate to the platform's **Settings** page
2. Toggle **Slack Enabled**
3. Enter the Slack webhook URL
4. Set the target channel
5. Test the connection

## Invoice and Payment Workflow

```
Campaign created
  → Invoice generated (linked to campaign group)
  → Invoice sent to client
  → Invoice status tracked: Not Invoiced → Sent → Paid → Overdue
  → Campaign delivered
  → Vendor payments calculated from delivered amounts
  → Vendor payments approved by admin/manager
  → Payment processed
```

The Dashboard's Invoice Health card shows the aggregate state of all invoices.

## Data Refresh Workflow

### Automated (Scheduled)

- **Spotify scraper**: Runs on a schedule to collect real stream data from Spotify for Artists
- **Metrics sync workers**: BullMQ jobs sync KPIs from external provider APIs
- **Health checks**: Periodic system health monitoring

### Manual

- **Spotify playlist enrichment**: Admin runs enrichment script to fetch Spotify Web API metadata
- **CSV import**: Bulk campaign data imported via scripts
- **Dashboard refresh**: Click the refresh button to reload all dashboard metrics
- **Browser hard refresh**: Ctrl+Shift+R to clear cached data
