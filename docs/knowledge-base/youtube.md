# YouTube Module

## Overview

The YouTube module manages video promotion campaigns where clients pay for engagement services (views, likes, comments) on their YouTube videos. The module includes health monitoring to detect unnatural engagement ratios and a ratio fixer tool to correct them.

**URL**: `/youtube`
**Internal name**: Vidi Health Flow
**Accessible by**: Admin, Manager, Sales

## Key Concepts

### Video Campaigns

A YouTube campaign promotes a specific video by purchasing engagement services (views, likes, comments) from vendors. Each campaign tracks:
- Target video URL
- Service types (views, likes, comments, etc.)
- Budget and pricing
- Campaign status and health score
- Vendor assignments and payment status

### Health Monitoring

The platform monitors engagement ratios to detect suspicious patterns. YouTube's algorithm can penalize videos with unnatural ratios (e.g., too many likes relative to views, or too many comments relative to likes). The health score evaluates:
- Like-to-view ratio
- Comment-to-like ratio
- View velocity (streams over time)
- Overall engagement pattern

### Ratio Fixer

When engagement ratios become unnatural, the ratio fixer tool calculates what additional engagement is needed to bring ratios back to normal ranges. This helps protect videos from algorithmic penalties.

### Service Types

Campaigns can include multiple service types:
- Views
- Likes
- Comments
- Subscribers
- Watch hours
- Custom combinations

## Pages and Navigation

### YouTube Dashboard (`/youtube`)
Main overview with campaign metrics, health status, and quick actions.
- Active campaign count and status
- Health alerts for campaigns with ratio issues
- Quick navigation to campaign management
- **Who sees it**: Admin, Manager, Sales

### Campaigns (`/youtube/campaigns`)
View and manage all video campaigns.
- Campaign list with search, filters, and status tabs
- Tabs for pending submissions
- Click a campaign to view details: status, health score, vendor info, performance
- Edit campaign details
- Status badges: Active, Pending, Complete, Paused
- **Who sees it**: Admin, Manager, Sales

### Campaign Intake (`/youtube/campaign-intake`)
Multi-step form for creating new campaigns.
- Client selection/creation
- Video URL and details
- Service type selection
- Budget and goal setting
- Vendor assignment
- **Who sees it**: Admin, Manager

### Clients (`/youtube/clients`)
Manage YouTube client relationships.
- Client list with contact info
- Campaign history per client
- Notes and relationship tracking
- **Who sees it**: Admin, Manager, Sales

### Vendor Payments (`/youtube/vendor-payments`)
Track and manage payments to YouTube vendors.
- Payment calculations based on delivered services
- Approve/reject payments
- Payment history and audit log
- **Who sees it**: Admin, Manager

### Users (`/youtube/users`)
User management within the YouTube module.
- **Who sees it**: Admin only

### System Health (`/youtube/system-health`)
Monitor API connections and system status.
- YouTube API connectivity status
- Latency and error tracking
- System alerts
- **Who sees it**: Admin only

### Settings (`/youtube/settings`)
YouTube module configuration.
- Campaign default settings
- Notification preferences
- **Who sees it**: Admin, Manager, Sales

### Help & Support (`/youtube/help`)
Help documentation and support resources.
- **Who sees it**: Admin, Manager, Sales

## How To

### Create a YouTube campaign

1. Navigate to **YouTube > Campaign Intake**
2. Select or create a client
3. Enter the YouTube video URL
4. Select service types (views, likes, comments, etc.)
5. Set budget and engagement goals
6. Assign vendors
7. Review and submit

### Check campaign health

1. Navigate to **YouTube > Campaigns**
2. Look for health score indicators on each campaign
3. Campaigns with ratio alerts will show warning icons
4. Click a campaign to see detailed health metrics:
   - Like-to-view ratio (healthy range vs actual)
   - Comment-to-like ratio
   - Overall health score

### Process vendor payments

1. Navigate to **YouTube > Vendor Payments**
2. Review the list of pending payments
3. Verify delivery amounts match campaign records
4. Click **Approve** or **Reject** for each payment
5. Approved payments are logged in the audit trail

### Monitor system health

1. Navigate to **YouTube > System Health** (admin only)
2. Check API connection status for YouTube
3. Review any error logs or alerts
4. Verify latency is within acceptable ranges

## Authentication Notes

The YouTube module uses the same authentication pattern as the rest of the platform:
- Auth comes from Supabase user metadata (no database queries for auth)
- Use `user_metadata.role` for role checks
- Use optional chaining on `searchParams`: `searchParams?.get('tab')`
- All routes are prefixed with `/youtube/`

## Database Tables

| Table | Purpose |
|-------|---------|
| `youtube_campaigns` | Campaign records with video URL, goals, status, health scores |
| `youtube_clients` | Client entities for the YouTube module |
| `youtube_vendors` | Vendor information with service types and rates |
| `youtube_vendor_payments` | Payment records and audit trail |
| `youtube_campaign_services` | Links campaigns to specific service types |

## FAQ

**Q: What is a "health score"?**
A: A calculated metric (0-100) that evaluates whether a video's engagement ratios look natural. Low scores indicate ratios that could trigger YouTube's algorithm to penalize the video.

**Q: What does the ratio fixer do?**
A: It calculates what additional views, likes, or comments are needed to bring engagement ratios back to natural-looking ranges. For example, if a video has too many likes relative to views, it will recommend adding more views.

**Q: Why can't salespeople access Campaign Intake?**
A: Campaign intake for YouTube is restricted to Admin and Manager roles because it involves budget allocation and vendor selection decisions.

**Q: How are vendor payments calculated?**
A: Based on the delivered service amounts (views, likes, etc.) multiplied by the vendor's agreed rate per unit. The Vendor Payments page shows the breakdown.

**Q: Can a campaign have multiple service types?**
A: Yes. A single campaign can include views, likes, comments, and other services, each with their own goals and vendor assignments.
