# Instagram Module

## Overview

The Instagram module manages creator seeding campaigns where clients pay to have their music promoted by Instagram creators (influencers). Creators post content featuring the client's music, and the platform tracks post performance (views, likes, engagement).

**URL**: `/instagram`
**Internal name**: Seedstorm
**Accessible by**: Admin, Manager, Operator, Sales

## Key Concepts

### Creator Seeding

Creator seeding is the process of paying Instagram influencers to create content (Reels, Stories, Posts) featuring a client's music. The platform matches creators to campaigns based on genre, engagement rate, audience demographics, and budget.

### Creators

Instagram creators are influencers in the platform's database, tracked with:
- Follower count and engagement rate
- Cost per 1,000 views (CP1K)
- Genre/niche specialization
- Post type preferences (Reels, Stories, Posts)
- Territory/audience demographics
- Historical performance data

### Campaigns

A campaign targets a specific song or artist, allocates a budget, and selects creators to post content. Each campaign tracks:
- Target sound/track URL
- Budget and spend
- Creator assignments and post status
- Aggregate performance (total views, likes, engagement)

### Quality Assurance (QA)

Posts go through a QA workflow where operators review submitted content to verify it meets campaign requirements before marking it as approved.

## Pages and Navigation

### Instagram Dashboard (`/instagram`)
Overview of active campaigns, recent posts, and performance metrics.
- **Who sees it**: Admin, Manager, Operator, Sales

### Campaign Builder (`/instagram/campaign-builder`)
AI-powered campaign creation wizard with creator matching.
- **Step 1 — Budget & Goals**: Set total budget, target views, and campaign dates
- **Step 2 — Genre & Content**: Select music genre, content type preferences (Reels, Posts, Stories), territory preferences
- **Step 3 — Creator Selection**: AI recommends creators based on genre match, engagement rates, CP1K, and budget. Manually adjust selections.
- **Step 4 — Quality Guardrails**: Set minimum views, maximum CP1K, minimum engagement rate
- **Step 5 — Review & Launch**: Review all settings and launch the campaign
- **Who sees it**: Admin, Manager, Operator

### Campaigns (`/instagram/campaigns`)
View and manage all seeding campaigns.
- Campaign list with status filters
- Click a campaign to view details: posts, creators, performance metrics
- Track views, likes, and engagement per post and aggregate
- **Who sees it**: Admin, Manager, Operator, Sales

### Creators (`/instagram/creators`)
Database of Instagram creators.
- Creator profiles with follower count, engagement rate, CP1K, genres
- Search and filter by genre, follower range, engagement rate
- Add new creators manually or via import
- View creator history (past campaigns and performance)
- **Who sees it**: Admin, Manager, Operator

### QA (`/instagram/qa`)
Quality assurance workflow for reviewing submitted posts.
- Queue of posts pending review
- Approve or reject posts
- View post content, creator info, and campaign context
- **Who sees it**: Admin, Manager, Operator

### Workflow / Business Rules (`/instagram/workflow`)
Configure business rules for campaign automation.
- **Who sees it**: Admin, Manager

### Posts by Sound (`/instagram/posts-by-sound`)
Track all posts that used a specific sound/audio URL.
- Search by audio URL to find all related posts
- View post performance metrics
- **Who sees it**: Admin, Manager, Operator

## How To

### Create an Instagram campaign

1. Navigate to **Instagram > Campaign Builder**
2. Set budget, target views, and campaign dates
3. Select music genre and content type preferences (Reels, Posts, Stories)
4. Choose territory preferences for audience targeting
5. Review the AI-recommended creator list — the algorithm matches based on genre, engagement, and CP1K
6. Adjust creator selections: add/remove creators, adjust per-creator budget allocation
7. Set quality guardrails (minimum views, max CP1K, min engagement)
8. Review and launch the campaign

### Review posts (QA)

1. Navigate to **Instagram > QA**
2. Review the queue of pending posts
3. For each post: verify content meets campaign requirements
4. Click **Approve** or **Reject** with notes
5. Approved posts are tracked for performance metrics

### Add a new creator

1. Navigate to **Instagram > Creators**
2. Click **Add Creator**
3. Enter: Instagram handle, follower count, engagement rate, CP1K, genre specialization
4. Save the creator profile

### View campaign performance

1. Navigate to **Instagram > Campaigns**
2. Click on the campaign
3. View aggregate metrics: total views, total likes, engagement rate, spend
4. View per-post breakdown: creator name, post type, views, likes, date posted

### Import campaigns

Instagram campaigns can be imported via CSV. Navigate to the campaigns page and use the import function.

## Campaign Builder Algorithm

The campaign builder uses several factors to recommend creators:

1. **Genre relevance**: Matches creator's niche to the campaign's genre
2. **CP1K (Cost per 1K views)**: Optimizes budget allocation for maximum views
3. **Engagement rate**: Prefers creators with higher engagement
4. **Post type**: Matches creator strengths to requested content types
5. **Territory**: Matches creator audience demographics to campaign targets
6. **Budget optimization**: Allocates budget across creators to maximize total views within budget

## Database Tables

| Table | Purpose |
|-------|---------|
| `instagram_campaigns` | Campaign records with budget, status, target track |
| `instagram_creators` | Creator profiles with metrics and genre tags |
| `instagram_posts` | Individual posts with performance data (views, likes) |
| `instagram_campaign_creators` | Links creators to campaigns with budget allocation |

## FAQ

**Q: What is CP1K?**
A: Cost per 1,000 views. It's the standard metric for pricing Instagram creator campaigns. A creator with a $5 CP1K means you pay $5 for every 1,000 views their post gets.

**Q: How does the AI select creators?**
A: The campaign builder algorithm scores creators based on genre match, engagement rate, CP1K efficiency, and post type strength. It recommends the combination that maximizes views within your budget.

**Q: What post types are supported?**
A: Reels (short-form video), Posts (feed posts), and Stories (24-hour content). Reels typically get the most views.

**Q: Can I manually override the AI's creator selections?**
A: Yes. After the AI recommends creators, you can add or remove any creator and adjust budget allocations before launching.

**Q: What's the QA workflow for?**
A: QA ensures that creator posts actually meet campaign requirements (correct audio, content quality, proper tags). Posts are reviewed by operators before being counted toward campaign performance.
