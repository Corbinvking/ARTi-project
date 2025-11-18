# YouTube Ratio Fixer - Complete Functionality Guide

**Last Updated:** November 18, 2025  
**Purpose:** Automated engagement optimization for YouTube campaigns  
**Status:** Active Feature - Monitoring & Configuration UI Complete

---

## Overview

The **YouTube Ratio Fixer** is an automated system that monitors and corrects engagement ratios (likes and comments relative to views) on YouTube videos to ensure they appear organic and avoid algorithmic penalties.

### Core Problem It Solves

When videos receive **paid views** but lack proportional **organic engagement** (likes/comments), YouTube's algorithm flags them as potentially:
- Bot-generated traffic
- Low-quality content  
- Artificially inflated views

This results in:
- ❌ Reduced organic reach
- ❌ Lower recommendation rates
- ❌ Algorithmic suppression
- ❌ Risk of being labeled as spam

### Solution: Ratio Fixer

The Ratio Fixer system:
1. **Monitors** engagement ratios in real-time
2. **Compares** current engagement to genre-based benchmarks
3. **Identifies** campaigns with unhealthy ratios
4. **Queues** campaigns for automated engagement boosting
5. **Executes** targeted likes/comments via bot servers
6. **Maintains** natural-looking engagement patterns

---

## Business Logic & Formula

### Expected Engagement Ratios

Engagement expectations vary by genre, based on YouTube industry standards:

| Genre | Like Rate (%) | Comment Rate (%) | Likes per 1000 views | Comments per 1000 views |
|-------|---------------|------------------|----------------------|-------------------------|
| **Pop** | 2.0% | 0.2% | 20 | 2 |
| **Rock** | 2.5% | 0.3% | 25 | 3 |
| **Electronic** | 1.8% | 0.15% | 18 | 1.5 |
| **Hip Hop** | 2.2% | 0.25% | 22 | 2.5 |
| **EDM** | 1.8% | 0.15% | 18 | 1.5 |
| **Latin** | 2.1% | 0.2% | 21 | 2 |
| **Dubstep** | 1.9% | 0.18% | 19 | 1.8 |
| **House** | 1.7% | 0.14% | 17 | 1.4 |
| **R&B** | 2.3% | 0.26% | 23 | 2.6 |
| **Default** | 2.0% | 0.2% | 20 | 2 |

### Ratio Calculation Formula

```typescript
// 1. Determine expected engagement based on genre
const genreRatios = {
  'Pop': { likeRate: 0.02, commentRate: 0.002 },
  'Hip Hop': { likeRate: 0.022, commentRate: 0.0025 },
  // ... other genres
};

const ratios = genreRatios[campaign.genre] || genreRatios.default;

// 2. Calculate expected engagement numbers
const expectedLikes = Math.floor(currentViews * ratios.likeRate);
const expectedComments = Math.floor(currentViews * ratios.commentRate);

// 3. Calculate current ratio health
const likesRatio = expectedLikes > 0 
  ? (currentLikes / expectedLikes) * 100 
  : 0;

const commentsRatio = expectedComments > 0 
  ? (currentComments / expectedComments) * 100 
  : 0;
```

### Example Calculation

**Campaign:** Pop song with 500,000 views

**Expected Engagement:**
- Likes: 500,000 × 0.02 = **10,000 likes**
- Comments: 500,000 × 0.002 = **1,000 comments**

**Current Engagement:**
- Likes: 6,500
- Comments: 400

**Ratio Health:**
- Likes Ratio: (6,500 / 10,000) × 100 = **65%** 🟡 Warning
- Comments Ratio: (400 / 1,000) × 100 = **40%** 🔴 Critical

**Action Needed:**
- Add **3,500 likes** to reach 100%
- Add **600 comments** to reach 100%

---

## Ratio Health Tiers

### 🟢 **Healthy (≥90%)**
- **Status:** Engagement is meeting or exceeding expectations
- **Action:** Monitor only, no intervention needed
- **Risk Level:** Low
- **Client Impact:** Campaign performing well

### 🟡 **Warning (70-89%)**
- **Status:** Engagement slightly below target, acceptable but improvable
- **Action:** Consider adding to fixer queue (low/medium priority)
- **Risk Level:** Medium
- **Client Impact:** Noticeable but not critical

### 🔴 **Critical (<70%)**
- **Status:** Engagement significantly below expectations
- **Action:** **Immediate intervention required** - Add to fixer queue (high priority)
- **Risk Level:** High
- **Client Impact:** May affect campaign performance, algorithm penalties likely

---

## Ratio Fixer Queue System

### Database Table: `youtube_ratio_fixer_queue`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Unique queue entry ID |
| `org_id` | UUID | Multi-tenant isolation |
| `campaign_id` | UUID | Campaign reference |
| `priority` | ENUM | `low`, `medium`, `high` |
| `status` | ENUM | `waiting`, `processing`, `completed`, `failed` |
| `issue_type` | TEXT | `likes_low`, `comments_low`, `both_low` |
| `target_ratio` | JSONB | Desired ratios to achieve |
| `created_at` | TIMESTAMP | When added to queue |
| `updated_at` | TIMESTAMP | Last status update |

### Queue Status Flow

```
waiting → processing → completed
                   ↘ failed (retry later)
```

### Priority Levels

**High Priority** - Process within 1-2 hours
- Ratios <50%
- Client-facing campaigns
- Pre-launch videos (important first impression)

**Medium Priority** - Process within 24 hours
- Ratios 50-70%
- Standard campaigns
- Regular maintenance

**Low Priority** - Process within 72 hours
- Ratios 70-90%
- Optimization, not critical
- Fine-tuning

---

## Bot Server Configuration

### Server Types

**1. Like Servers**
- **Purpose:** Automated YouTube likes
- **Capacity:** Typically 10,000-50,000 likes/day
- **API:** REST endpoint for submitting like requests
- **Options:** Configured in `LIKE_SERVER_OPTIONS` constant
- **Examples:** "like_server_1", "like_server_2", etc.

**2. Comment Servers**
- **Purpose:** Automated YouTube comments
- **Capacity:** Typically 1,000-5,000 comments/day
- **API:** REST endpoint for submitting comment requests
- **Options:** Configured in `COMMENT_SERVER_OPTIONS` constant
- **Examples:** "comment_server_1", "comment_server_2", etc.

### Server Configuration Table: `youtube_server_configs`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Server ID |
| `server_name` | TEXT | Server identifier |
| `server_type` | TEXT | `like` or `comment` |
| `capacity` | INTEGER | Max daily actions |
| `current_load` | INTEGER | Current daily usage |
| `status` | TEXT | `active`, `maintenance`, `offline` |
| `endpoint_url` | TEXT | API endpoint |
| `api_key` | TEXT | Authentication |

### Campaign-Level Configuration

Each campaign can specify:

**1. Comments Sheet URL**
- **Purpose:** Google Sheets with pre-written authentic comments
- **Format:** Public Google Sheets URL
- **Content:** List of generic but relevant comments (e.g., "This is fire!", "Love this song!", etc.)
- **Usage:** Bot randomly selects comments from sheet when posting

**2. Like Server Assignment**
- **Purpose:** Which bot server to use for likes
- **Selection:** Based on server capacity and current load
- **Failover:** If primary server down, use backup

**3. Comment Server Assignment**
- **Purpose:** Which bot server to use for comments
- **Selection:** Based on server capacity and current load
- **Failover:** If primary server down, use backup

**4. Sheet Tier** (Optional)
- **Purpose:** Quality tier of comment sheet (basic, premium, custom)
- **Options:**
  - **Tier 1:** Generic comments
  - **Tier 2:** Genre-specific comments
  - **Tier 3:** Custom client-provided comments
- **Usage:** Determines comment authenticity level

**5. Wait Time (seconds)**
- **Purpose:** Delay between bot actions (anti-detection)
- **Range:** 30-300 seconds
- **Default:** 120 seconds (2 minutes)
- **Purpose:** Simulates human behavior, avoids rate limiting

---

## Ratio Fixer UI Components

### 1. Ratio Analysis Dashboard

**Location:** Campaign Settings Modal → Ratio Fixer Tab

**Displays:**

**Current Performance Card:**
- Total views
- Current likes
- Current comments

**Expected Performance Card:**
- Genre-based benchmarks
- Expected likes (calculated)
- Expected comments (calculated)

**Engagement Ratio Analysis:**
- **Likes Ratio:**
  - Percentage (e.g., "85%")
  - Color-coded icon (TrendingUp, AlertTriangle, TrendingDown)
  - Progress bar visual
  - Gap calculation ("X likes needed")
- **Comments Ratio:**
  - Percentage
  - Color-coded icon
  - Progress bar visual
  - Gap calculation ("X comments needed")

### 2. Recommendations Section

**Displays contextual recommendations based on ratio health:**

**Critical (<70%):**
```
🔴 Critical: Likes significantly below expected ratio
   Immediate action required to boost likes engagement
```

**Warning (70-89%):**
```
🟡 Moderate: Likes ratio could be improved
   Consider adding to fixer queue
```

**Healthy (≥90%):**
```
🟢 Excellent: Both ratios are performing well
   Campaign is meeting engagement expectations
```

### 3. Configuration Section

**Purpose:** Set up bot server parameters for automated engagement

**Fields:**
- **Comments Sheet URL:** Input field for Google Sheets link
- **Like Server:** Dropdown selection of available like bot servers
- **Comment Server:** Dropdown selection of available comment bot servers
- **Sheet Tier:** Dropdown for comment quality tier

### 4. Engagements Only Banner

**Displayed when:** Campaign has `service_type = 'engagements_only'`

**Message:**
```
ℹ Engagements Only Campaign
This campaign dynamically calculates optimal engagement targets based on 
the video's current view count. YouTube stats are collected 3 times daily 
to ensure accurate engagement ratios.
```

**Purpose:** Clarify that campaign focuses only on engagement, not views.

---

## Automated Workflow

### Current Implementation Status

**✅ Implemented:**
1. **Monitoring UI** - Ratio analysis displayed in campaign modal
2. **Health Calculation** - Real-time ratio calculation
3. **Configuration UI** - Bot server selection and settings
4. **Database Schema** - Queue table and server config tables ready

**⏳ Not Yet Implemented (Manual Process):**
1. **Auto-Queue Addition** - Campaigns not automatically added to fixer queue
2. **Queue Processing** - No automated bot execution
3. **Status Updates** - No automated status tracking
4. **Load Balancing** - No server capacity management

### Planned Automated Workflow (Future)

```
┌────────────────────────────────────────────────────────────┐
│ 1. YouTube Stats Update (3x daily via cron)               │
│    → Fetches current_views, current_likes, current_comments│
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Ratio Analysis Trigger                                 │
│    → Calculates likes_ratio, comments_ratio                │
│    → Compares against genre benchmarks                     │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Queue Addition (if ratio < 70%)                        │
│    → INSERT INTO youtube_ratio_fixer_queue                 │
│    → priority = (ratio < 50% ? 'high' : 'medium')          │
│    → issue_type = 'likes_low' | 'comments_low' | 'both_low'│
│    → target_ratio = { likes: 100%, comments: 100% }        │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Queue Processor (runs every hour)                      │
│    → SELECT * FROM youtube_ratio_fixer_queue               │
│      WHERE status = 'waiting' ORDER BY priority, created_at│
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 5. Server Selection & Load Balancing                      │
│    → SELECT server WHERE current_load < capacity           │
│    → UPDATE server SET current_load += action_count        │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 6. Bot API Execution                                       │
│    → POST to like_server API: { video_url, count: X }     │
│    → POST to comment_server API: { video_url, comments [] }│
│    → Wait for API response/confirmation                    │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 7. Status Update                                           │
│    → UPDATE youtube_ratio_fixer_queue                      │
│      SET status = 'completed', updated_at = now()          │
│    → If failed: status = 'failed', retry_count++           │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 8. Verification (next stats cycle)                        │
│    → Re-check engagement ratios                            │
│    → If still <90%, re-queue with higher priority          │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Manual Operation (Current)
**Status:** ✅ Complete
- UI for viewing ratio health
- Manual bot server configuration
- Database schema ready
- No automated actions

### Phase 2: Semi-Automated Queue (Next)
**Status:** ⏳ Not Started
- Auto-detection of unhealthy ratios
- Auto-add to fixer queue
- Manual approval before bot execution
- Email notifications for queue additions

**Implementation Tasks:**
1. Create background job to analyze ratios after stats update
2. Implement queue addition logic
3. Build admin approval UI
4. Set up email alerts

### Phase 3: Fully Automated Execution (Future)
**Status:** ⏳ Not Started
- Automated bot API calls
- Load balancing across servers
- Status tracking and error handling
- Retry logic for failures

**Implementation Tasks:**
1. Integrate with bot server APIs
2. Build queue processor service
3. Implement load balancing algorithm
4. Add monitoring and logging

### Phase 4: Intelligence & Optimization (Future)
**Status:** ⏳ Not Started
- ML-based ratio prediction
- Adaptive engagement timing (avoid patterns)
- Natural engagement curve simulation
- A/B testing of engagement strategies

---

## Bot Server Integration

### API Endpoints (Planned)

**Like Server API:**
```typescript
POST /api/like-bot/add-likes
Body: {
  video_url: string,
  count: number,
  spread_over_hours: number, // Distribute likes over time
  wait_time_seconds: number
}
Response: {
  job_id: string,
  estimated_completion: timestamp
}
```

**Comment Server API:**
```typescript
POST /api/comment-bot/add-comments
Body: {
  video_url: string,
  comments: string[], // Array of comment texts
  spread_over_hours: number,
  wait_time_seconds: number
}
Response: {
  job_id: string,
  estimated_completion: timestamp
}
```

**Status Check API:**
```typescript
GET /api/bot/status/:job_id
Response: {
  job_id: string,
  status: 'queued' | 'running' | 'completed' | 'failed',
  completed_count: number,
  total_count: number,
  error?: string
}
```

---

## Safety & Anti-Detection Measures

### Rate Limiting
- **Max likes per campaign per day:** Capped at 10% of view count
- **Max comments per campaign per day:** Capped at 1% of view count
- **Server-wide daily limits:** Enforced via `current_load` tracking

### Pattern Avoidance
- **Random delays:** Wait time varies ±30% around set value
- **Time spreading:** Actions distributed over hours, not all at once
- **Comment variety:** Random selection from comment sheet (no duplicates)
- **Human-like timing:** More engagement during peak hours (10am-10pm)

### Quality Controls
- **Comment authenticity:** Pre-screened comment sheets
- **Account diversity:** Bot accounts rotated to avoid patterns
- **IP rotation:** Different IPs for each action
- **Browser fingerprinting:** Randomized user agents and browsers

---

## Monitoring & Reporting

### Campaign-Level Metrics
- Current vs. expected engagement
- Ratio health percentage
- Time since last fixer action
- Total fixer actions taken (lifetime)

### Platform-Level Metrics (Future Dashboard)
- Campaigns in fixer queue (count)
- Average time in queue
- Success rate (% achieving >90% ratio)
- Bot server utilization
- API errors and failures

### Alerts
- Campaign drops below 50% ratio → Email to manager
- Bot server goes offline → Slack alert to dev team
- Queue backlog > 50 items → Capacity warning
- Repeated fixer failures for same campaign → Manual review needed

---

## Cost Considerations

### Pricing Structure (Example)
- **Likes:** $0.01 per 10 likes ($1.00 per 1,000)
- **Comments:** $0.05 per comment ($50.00 per 1,000)

### Budget Management
- **Per-campaign budget caps:** Set in campaign settings
- **Client-level monthly limits:** Prevent overspending
- **Auto-pause when budget reached:** Notifications sent

### Cost Calculation Formula
```typescript
const likesCost = (expectedLikes - currentLikes) * 0.01 / 10;
const commentsCost = (expectedComments - currentComments) * 0.05;
const totalFixerCost = likesCost + commentsCost;
```

---

## Troubleshooting

### "Ratio keeps dropping despite fixer actions"
**Possible Causes:**
- Views growing faster than engagement can keep up
- Bot server at capacity, not enough throughput
- YouTube removing bot-generated engagement

**Solutions:**
- Increase fixer frequency (run more often)
- Add more bot servers
- Review comment authenticity
- Check if bot accounts are banned

### "Comments not posting"
**Possible Causes:**
- Comments sheet URL invalid/inaccessible
- Comment server offline
- Comments flagged as spam by YouTube

**Solutions:**
- Verify sheet URL is public
- Check comment server status
- Review comment content for spam triggers
- Rotate comment sheets

### "Likes disappearing after a few days"
**Possible Causes:**
- YouTube detected bot accounts
- Accounts banned/removed

**Solutions:**
- Use higher quality bot accounts
- Increase wait times between actions
- Rotate IP addresses more frequently
- Review account age/authenticity

---

## Related Documentation
- [YOUTUBE-APP-CURRENT-STATUS.md](./YOUTUBE-APP-CURRENT-STATUS.md) - Overall app status
- [YOUTUBE-DATABASE-SCHEMA.md](./YOUTUBE-DATABASE-SCHEMA.md) - Database structure
- [YOUTUBE-CAMPAIGN-HEALTH-DASHBOARD.md](./YOUTUBE-CAMPAIGN-HEALTH-DASHBOARD.md) - Health metrics

---

**Status:** 📊 Monitoring UI Complete, Automation Pending  
**Next Step:** Implement semi-automated queue addition  
**Priority:** Medium (Manual operation sufficient for now)  
**Component File:** `apps/frontend/app/(dashboard)/youtube/vidi-health-flow/components/campaigns/RatioFixerContent.tsx`

