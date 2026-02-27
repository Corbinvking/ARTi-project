# SoundCloud Module

## Overview

The SoundCloud module manages repost campaigns and a member portal for SoundCloud artists. Members (artists in the repost network) submit their tracks, which are then reposted across the network's channels. The module also includes a credit system, genre management, and campaign automation.

**URL**: `/soundcloud`
**Accessible by**: Admin, Manager, Operator, Sales (dashboard), Member (portal only)

## Key Concepts

### Repost Campaigns

A repost campaign takes a member's submitted track and distributes it across SoundCloud channels via reposts. Each campaign tracks:
- Track URL and metadata
- Target repost count
- Campaign status (active, completed, pending)
- Performance metrics (plays, likes, reposts)

### Members

Members are SoundCloud artists who participate in the repost network. They:
- Submit tracks for reposting
- Earn and spend credits
- View their campaign analytics
- Manage their profile and preferences

### Credits System

Members have a credit wallet used to pay for repost campaigns. Credits can be:
- Earned through participation in the network
- Purchased
- Tracked via a credit ledger showing all transactions

### Submission Queue

When members submit tracks, they enter a queue for review. Operators process the queue to:
- Approve or reject submissions
- Assign submissions to campaigns
- Manage priority and scheduling

### Genre Management

The platform organizes genres into families and subgenres for better campaign targeting and member matching.

## Pages and Navigation

### Admin/Moderator Dashboard

#### Dashboard (`/soundcloud/dashboard`)
Unified overview of campaigns, members, and queue status.
- **Who sees it**: Admin, Manager, Operator

#### Analytics (`/soundcloud/dashboard/analytics`)
Campaign performance analytics and reporting.
- **Who sees it**: Admin, Manager, Operator

#### Campaigns (`/soundcloud/dashboard/campaigns`)
Manage repost campaigns.
- Campaign list with status filters
- Create/edit campaigns
- Track campaign progress and performance
- **Who sees it**: Admin, Manager, Operator

#### Members (`/soundcloud/dashboard/members`)
Member management.
- Member list with profile info and credit balances
- Search and filter members
- View member history and activity
- Edit member profiles
- **Who sees it**: Admin, Manager, Operator

#### Queue (`/soundcloud/dashboard/queue`)
Submission queue management.
- Queue of pending track submissions
- Approve/reject submissions
- Assign to campaigns
- Priority management
- **Who sees it**: Admin, Manager, Operator

#### Planner (`/soundcloud/dashboard/planner`)
Campaign planning calendar.
- Visual calendar view of scheduled campaigns
- Drag-and-drop scheduling
- **Who sees it**: Admin, Manager, Operator

#### Settings (`/soundcloud/dashboard/settings`)
Module configuration.
- Notification settings (Slack webhook, channel)
- Campaign defaults
- **Who sees it**: Admin, Manager

#### Genres (`/soundcloud/dashboard/genres`)
Genre family and subgenre management.
- Create/edit genre families
- Assign subgenres
- **Who sees it**: Admin, Manager

#### Automation (`/soundcloud/dashboard/automation`)
Automated campaign workflows.
- Configure automation rules
- Schedule recurring campaigns
- **Who sees it**: Admin, Manager

#### Health (`/soundcloud/dashboard/health`)
Module health monitoring.
- **Who sees it**: Admin

### Member Portal

The member portal is the self-service interface for SoundCloud artists. Members can ONLY access portal pages.

#### Submit (`/soundcloud/portal/submit`)
Submit tracks for repost campaigns.
- Enter track URL
- Select genre
- Add notes
- Use credits to submit

#### Campaigns (`/soundcloud/portal/campaigns`)
View member's own campaigns.
- Track status and performance
- View repost counts and engagement

#### Profile (`/soundcloud/portal/profile`)
Manage member profile.
- Edit display name, bio, social links
- View account status

#### Analytics (`/soundcloud/portal/analytics`)
Personal analytics dashboard.
- Track performance metrics
- Historical data

#### Credits (`/soundcloud/portal/credits`)
Credit wallet and transaction history.
- Current balance
- Credit ledger (earned, spent, purchased)
- Purchase credits

#### Queue (`/soundcloud/portal/queue`)
View submission queue status.
- Track where submissions are in the queue
- View estimated processing time

#### Attribution (`/soundcloud/portal/attribution`)
Campaign attribution tracking.
- See which reposts drove engagement

#### Avoid List (`/soundcloud/portal/avoid-list`)
Manage tracks/artists to avoid reposting.
- Add tracks or artists to the avoid list
- Prevents unwanted reposts

#### History (`/soundcloud/portal/history`)
Submission history.
- Past submissions with status and outcomes

## How To

### Submit a track (Member)

1. Log in to the platform (you'll be redirected to the SoundCloud portal)
2. Navigate to **Submit** in the portal sidebar
3. Enter your SoundCloud track URL
4. Select the genre that best matches your track
5. Add any notes for the reviewers
6. Confirm credit usage and submit
7. Track your submission in the **Queue** page

### Process the submission queue (Operator)

1. Navigate to **SoundCloud > Dashboard > Queue**
2. Review pending submissions in order
3. For each submission:
   - Listen to the track
   - Verify genre classification
   - Check member's credit balance
4. Click **Approve** to create a campaign or **Reject** with feedback

### Create a campaign manually

1. Navigate to **SoundCloud > Dashboard > Campaigns**
2. Click **New Campaign**
3. Enter track URL and details
4. Set repost target and schedule
5. Assign to appropriate channels
6. Launch the campaign

### Manage member credits

1. Navigate to **SoundCloud > Dashboard > Members**
2. Find the member (use search)
3. View their credit balance and transaction history
4. Adjust credits if needed (admin action)

### Configure Slack notifications

1. Navigate to **SoundCloud > Dashboard > Settings**
2. Toggle **Slack Enabled** on
3. Enter the Slack webhook URL
4. Set the target channel name
5. Click **Test Connection** to verify
6. Save settings

### Manage genres

1. Navigate to **SoundCloud > Dashboard > Genres**
2. View existing genre families and subgenres
3. Click **Add Genre** to create a new genre family
4. Add subgenres under each family

## Code Patterns

When working with SoundCloud code:
- All React Query keys are prefixed with `soundcloud-` (e.g., `["soundcloud-campaigns"]`)
- Import paths within the SoundCloud module use relative paths from `soundcloud-app/`
- All navigation paths include the `/soundcloud/` prefix
- Always use optional chaining on `searchParams`: `searchParams?.get()`
- Check arrays before mapping (PostgreSQL arrays can be null)
- Use `.toLocaleString()` for number formatting

## Database Tables

| Table | Purpose |
|-------|---------|
| `soundcloud_campaigns` | Campaign records with track URL, status, performance |
| `soundcloud_members` | Member profiles with credit balances |
| `soundcloud_submissions` | Track submissions from members |
| `soundcloud_credits` | Credit transaction ledger |
| `soundcloud_genres` | Genre families and subgenres |
| `soundcloud_reposts` | Individual repost records |
| `soundcloud_channels` | Repost channels/accounts |
| `soundcloud_avoid_list` | Tracks/artists to exclude from reposting |

The SoundCloud module has ~57 database tables total (10 primary + 47 supporting).

## FAQ

**Q: How do members get credits?**
A: Credits can be earned through participation in the repost network (e.g., allowing reposts on their account) or purchased directly.

**Q: Can members access anything outside the portal?**
A: No. Members are automatically redirected to `/soundcloud/portal` if they try to access any other page. They can only see portal pages.

**Q: What happens when a submission is rejected?**
A: The member receives feedback on why their submission was rejected. Credits are not deducted for rejected submissions.

**Q: How is the avoid list used?**
A: Members can add specific tracks or artists to their avoid list. The system will not repost those tracks to the member's channel.

**Q: What Slack events are supported?**
A: Campaign status changes, submission status updates, inquiry status changes, and reconnect emails. Configure via SoundCloud > Dashboard > Settings.

**Q: How do I see all genres?**
A: Navigate to SoundCloud > Dashboard > Genres. This shows all genre families and their subgenres.
