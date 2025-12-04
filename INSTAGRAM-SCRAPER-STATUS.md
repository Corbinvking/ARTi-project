# Instagram Scraper System - Complete Status Document

**Last Updated:** December 4, 2025  
**Status:** ✅ Fully Operational  
**Environment:** Production (`artistinfluence.com`)

---

## 📊 System Overview

The Instagram Scraper System automatically collects and displays Instagram analytics data for marketing campaigns. It integrates with the Apify Instagram Scraper API to fetch post data, stores it in a PostgreSQL database, and presents it through a React dashboard.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Apify API     │────▶│  Backend API     │────▶│   Supabase DB   │
│ (Instagram Data)│     │  (Fastify)       │     │  (PostgreSQL)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        │
                        ┌──────────────────┐            │
                        │   Frontend       │◀───────────┘
                        │   (Next.js)      │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Public Share    │
                        │  Links           │
                        └──────────────────┘
```

---

## 🔌 API Endpoints

### Base URL
- **Production:** `https://api.artistinfluence.com`
- **Local:** `http://localhost:3001`

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram-scraper/batch` | POST | Run batch scraping for all active campaigns |
| `/api/instagram-scraper/campaigns` | GET | List all campaigns with scraper status |
| `/api/instagram-scraper/campaign/:id` | PATCH | Update campaign settings (instagram_url) |
| `/api/instagram-scraper/campaign/:id/analytics` | GET | Get analytics data for a campaign |
| `/api/instagram-scraper/campaign/:id/refresh` | POST | Manually trigger scrape for a campaign |
| `/api/instagram-scraper/posts` | POST | Scrape posts for given usernames |
| `/api/instagram-scraper/post` | POST | Scrape a single post by URL |

### Example: Batch Scrape (Dry Run)
```bash
curl -X POST "https://api.artistinfluence.com/api/instagram-scraper/batch" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### Example: Get Campaign Analytics
```bash
curl "https://api.artistinfluence.com/api/instagram-scraper/campaign/789/analytics"
```

### Response Format
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "metrics": {
      "totalViews": 5283327,
      "totalLikes": 317272,
      "totalComments": 3112,
      "totalShares": 3173,
      "engagementRate": 6.06,
      "avgLikesPerPost": 31727,
      "avgCommentsPerPost": 311,
      "livePosts": 10,
      "sentimentScore": 16,
      "relevanceScore": 100,
      "viralityScore": 100,
      "growthRate": -61.7,
      "peakEngagementDay": "2025-12-03",
      "topHashtags": ["ChrisHemsworthRoadTrip"],
      "avgPostsPerDay": 0.7
    },
    "timeSeries": [...],
    "count": 10
  }
}
```

---

## ⏰ Cron Job Configuration

### Schedule
- **Time:** 6:00 AM UTC daily
- **Cron Expression:** `0 6 * * *`

### Setup Location
```
/root/arti-marketing-ops/instagram_scraper/
├── run_instagram_scraper.sh    # Main script called by cron
├── setup_cron.sh               # Setup script (run once)
└── check_scraper_status.sh     # Status check utility
```

### Current Crontab Entry
```cron
0 6 * * * /root/arti-marketing-ops/instagram_scraper/run_instagram_scraper.sh >> /var/log/instagram_scraper.log 2>&1
```

### Log Location
```
/var/log/instagram_scraper.log
```

### Useful Commands
```bash
# View live logs
tail -f /var/log/instagram_scraper.log

# Manual run
/root/arti-marketing-ops/instagram_scraper/run_instagram_scraper.sh

# Check cron status
crontab -l | grep instagram

# Edit cron
crontab -e
```

---

## 🗄️ Database Schema

### Table: `instagram_campaigns`

Primary table storing campaign information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| campaign | TEXT | Campaign name |
| clients | TEXT | Client name |
| status | TEXT | Campaign status (active, inactive, etc.) |
| instagram_url | TEXT | Instagram profile/post URL to scrape |
| last_scraped_at | TIMESTAMP | Last successful scrape timestamp |
| org_id | UUID | Organization ID (for RLS) |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### Table: `instagram_posts`

Stores scraped Instagram post data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | INTEGER | FK to instagram_campaigns.id |
| instagram_post_id | TEXT | Instagram's post ID |
| short_code | TEXT | Post short code (from URL) |
| caption | TEXT | Post caption |
| likes_count | INTEGER | Number of likes |
| comments_count | INTEGER | Number of comments |
| video_view_count | INTEGER | Video views (if applicable) |
| timestamp | TIMESTAMP | Post publish time |
| owner_username | TEXT | Account username |
| display_url | TEXT | Image/thumbnail URL |
| video_url | TEXT | Video URL (if applicable) |
| is_video | BOOLEAN | Whether post is video |
| hashtags | TEXT[] | Array of hashtags |
| mentions | TEXT[] | Array of @mentions |
| post_url | TEXT | Full Instagram post URL |
| post_type | TEXT | Type: Image, Video, Sidecar |
| created_at | TIMESTAMP | Record creation time |

### Constraints
```sql
CONSTRAINT unique_campaign_post UNIQUE (campaign_id, instagram_post_id)
```

### Indexes
```sql
idx_instagram_posts_campaign_id ON instagram_posts(campaign_id)
idx_instagram_posts_timestamp ON instagram_posts(timestamp DESC)
idx_instagram_posts_owner_username ON instagram_posts(owner_username)
```

### View: `instagram_campaign_metrics`
Aggregated metrics view (auto-calculated).

```sql
SELECT 
  campaign_id,
  COUNT(*) as total_posts,
  SUM(likes_count) as total_likes,
  SUM(comments_count) as total_comments,
  SUM(COALESCE(video_view_count, likes_count * 10)) as estimated_views,
  ROUND(AVG(likes_count)) as avg_likes_per_post,
  ROUND(AVG(comments_count)) as avg_comments_per_post
FROM instagram_posts
GROUP BY campaign_id;
```

---

## 🔄 Auto-Tracking Logic

### Which Campaigns Are Tracked?

**Automatically tracked:**
- ✅ Has valid `instagram_url` set
- ✅ Status does NOT contain "inactive", "cancelled", or "canceled"

**Skipped:**
- ❌ No `instagram_url` set
- ❌ Status contains "inactive", "cancelled", or "canceled"

### Code Logic (Backend)
```typescript
// Filter out inactive campaigns
const campaigns = allCampaigns?.filter(c => {
  const status = (c.status || '').toLowerCase();
  return !status.includes('inactive') && 
         !status.includes('cancelled') && 
         !status.includes('canceled');
}) || [];
```

### UI Tracking Status Indicator
The campaign detail modal shows:
- 🟢 **Active - Tracking**: Has URL, not inactive
- 🟡 **Needs URL**: Active but no Instagram URL
- ⚪ **Inactive - Not Tracked**: Status is inactive/cancelled

---

## 📈 Computed Metrics

All metrics are calculated in real-time from stored post data.

| Metric | Formula | Description |
|--------|---------|-------------|
| Total Views | Σ(video_view_count OR likes × 10) | Estimated total impressions |
| Total Likes | Σ(likes_count) | Sum of all likes |
| Total Comments | Σ(comments_count) | Sum of all comments |
| Engagement Rate | (likes + comments) / views × 100 | Overall engagement % |
| Sentiment Score | comments / likes × 100 | Discussion intensity |
| Relevance Score | unique_hashtags × 5 + engagement/2 | Content relevance (0-100) |
| Virality Score | engagements / views × 100 | Viral potential (0-100) |
| Growth Rate | (2nd_half - 1st_half) / 1st_half × 100 | Engagement trend % |
| Peak Day | max(daily_engagement) | Highest engagement date |
| Top Hashtags | top 5 by frequency | Most used hashtags |
| Posts Per Day | posts / date_range | Average posting frequency |

---

## 🎨 Frontend Components

### Campaign List Page
**Path:** `/instagram/campaigns`

Features:
- Campaign table with search & filter
- Status badges (Active, Pending, Completed, etc.)
- KPI metrics per row
- Click to open detail modal
- Edit/Delete functionality

### Campaign Detail Modal
Shows:
- Campaign info (name, client, budget, dates)
- Financial metrics (spend, remaining)
- Sound/Tracker URLs
- **Instagram Analytics Tracking** card:
  - Tracking status indicator
  - Instagram URL input
  - Last scraped timestamp
  - "Scrape Now" button
- View Analytics button → full dashboard
- Share Link button → copy public URL

### Analytics Dashboard
**Internal Path:** `/instagram/campaigns/[id]/analytics`  
**Public Path:** `/share/campaign/[id]`

Features:
- Header with campaign info
- Tabs: Live Post Overview, Posts, All Data
- Date range filter (7d, 30d, 90d, All Time)
- Primary KPI cards: Views, Likes, Comments, Shares, Engagement
- Secondary KPI cards: Live Posts, Avg Cost/View, Sentiment, Relevance
- Tertiary KPI cards: Virality, Growth Rate, Peak Day, Post Frequency
- Top Hashtags display
- Time series chart (views over time)
- Back button (internal only)

---

## 🔗 Public Share Links

### URL Format
```
https://app.artistinfluence.com/share/campaign/{CAMPAIGN_ID}
```

### Example
```
https://app.artistinfluence.com/share/campaign/789
```

### Features
- No authentication required
- Full analytics dashboard view
- Real-time data from database
- No back button (standalone view)
- Branded header with campaign name

### Technical Implementation
- Route: `apps/frontend/app/share/campaign/[token]/page.tsx`
- Layout: `apps/frontend/app/share/layout.tsx` (includes QueryClientProvider)
- Middleware: `/share` path excluded from auth redirects

---

## 🔐 Environment Variables

### Backend API (`apps/api/production.env`)
```env
SUPABASE_URL=http://kong:8000
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
APIFY_API_TOKEN=apify_api_***
```

### Frontend
```env
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### API URL Detection (Frontend)
The frontend auto-detects production:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('artistinfluence') 
    ? 'https://api.artistinfluence.com' 
    : 'http://localhost:3001');
```

---

## 🐳 Docker Configuration

### API Container
```bash
# Container name
arti-api (or arti-marketing-ops-api via compose)

# Network
supabase_network_arti-marketing-ops

# Port
3001:3001

# Health check
GET /health
```

### Database Container
```bash
# Container name
supabase_db_arti-marketing-ops

# Access
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres
```

---

## 📋 Current Status Summary

### ✅ Working Features
| Feature | Status | Notes |
|---------|--------|-------|
| Apify Integration | ✅ | Using actor `nH2AHrwxeTRJoN5hX` |
| Batch Scraping | ✅ | Auto-scrapes all active campaigns |
| Cron Job | ✅ | 6 AM UTC daily |
| Campaign Analytics API | ✅ | Real-time metrics |
| Analytics Dashboard | ✅ | Full UI with charts |
| Public Share Links | ✅ | No auth required |
| Auto-Track Active Campaigns | ✅ | No manual toggle needed |
| Manual Scrape Button | ✅ | Per-campaign refresh |

### 📊 Current Data
| Metric | Value |
|--------|-------|
| Total Campaigns | 365 |
| Campaigns with Instagram URL | 1 |
| Active & Trackable | 1 |
| Posts Scraped | 10 |
| Last Scrape | Dec 4, 2025 |

### 🔜 Future Enhancements
- [ ] Bulk add Instagram URLs to campaigns
- [ ] Secure token-based share links (instead of campaign ID)
- [ ] Email notifications on scrape failures
- [ ] Historical data comparison
- [ ] Export to CSV/PDF

---

## 🛠️ Troubleshooting

### API Returns 404
```bash
# Check if API is running
docker ps | grep arti-api
curl http://localhost:3001/health
```

### No Data in Dashboard
1. Check if campaign has `instagram_url` set
2. Verify posts exist: 
```sql
SELECT COUNT(*) FROM instagram_posts WHERE campaign_id = 789;
```
3. Check API response:
```bash
curl "https://api.artistinfluence.com/api/instagram-scraper/campaign/789/analytics"
```

### Cron Not Running
```bash
# Check cron service
systemctl status cron

# View cron logs
grep CRON /var/log/syslog

# Manual test
/root/arti-marketing-ops/instagram_scraper/run_instagram_scraper.sh
```

### Apify Errors
- Check API token is valid
- Verify rate limits not exceeded
- Check Apify dashboard for actor run status

---

## 📚 Related Files

### Backend
- `apps/api/src/routes/instagram-scraper.ts` - API routes
- `apps/api/src/lib/instagram-apify.ts` - Apify client & metrics

### Frontend
- `apps/frontend/app/(dashboard)/instagram/campaigns/page.tsx` - Campaign list
- `apps/frontend/app/(dashboard)/instagram/campaigns/[id]/analytics/` - Dashboard
- `apps/frontend/app/share/campaign/[token]/page.tsx` - Public share page
- `apps/frontend/hooks/useInstagramAnalytics.ts` - Data fetching hook

### Scripts
- `instagram_scraper/run_instagram_scraper.sh` - Cron script
- `instagram_scraper/setup_cron.sh` - Setup helper
- `instagram_scraper/check_scraper_status.sh` - Status checker

### Database
- `supabase/migrations/050_instagram_posts_table.sql` - Posts table
- `supabase/migrations/051_add_instagram_url_to_campaigns.sql` - URL column

---

## 📝 Changelog

### December 4, 2025
- ✅ Apify Instagram Scraper integrated
- ✅ Batch scraping endpoint created
- ✅ Cron job configured for 6 AM UTC
- ✅ Analytics dashboard UI completed
- ✅ Public share links working
- ✅ Auto-tracking for all active campaigns (removed manual toggle)
- ✅ Computed metrics: Sentiment, Relevance, Virality, Growth Rate, etc.
- ✅ Campaign 789 (NatGeo test) fully operational with real data

---

**Document maintained by:** AI Assistant  
**Production URL:** https://app.artistinfluence.com  
**API URL:** https://api.artistinfluence.com

