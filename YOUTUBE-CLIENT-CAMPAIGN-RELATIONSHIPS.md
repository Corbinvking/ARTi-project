# YouTube Client-Campaign Data Relationships

## Overview

This document outlines the data relationships between clients and campaigns in the YouTube platform, explaining how data flows and connects throughout the application.

## Core Relationships

### Client ↔ Campaign Relationship

**One-to-Many**: Each client can have multiple campaigns, but each campaign belongs to exactly one client.

```typescript
youtube_clients (parent)
    ↓ has many
youtube_campaigns (child)
    - client_id (foreign key) → youtube_clients.id
```

### Database Schema

```sql
-- Clients table
CREATE TABLE youtube_clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  email2 TEXT,
  email3 TEXT,
  youtube_access_requested BOOLEAN DEFAULT false,
  youtube_access_requested_at TIMESTAMPTZ
);

-- Campaigns table
CREATE TABLE youtube_campaigns (
  id UUID PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  client_id UUID REFERENCES youtube_clients(id), -- THE CONNECTION
  salesperson_id UUID REFERENCES youtube_salespersons(id),
  youtube_url TEXT,
  current_views INTEGER DEFAULT 0,
  goal_views INTEGER,
  status TEXT, -- 'pending', 'active', 'paused', 'complete'
  in_fixer BOOLEAN DEFAULT false, -- Ratio Fixer queue status
  sale_price NUMERIC(10,2),
  start_date DATE,
  end_date DATE
);
```

## Data Flow Architecture

### 1. Query Pattern (useCampaigns Hook)

The `useCampaigns` hook fetches all data with relationships:

```typescript
// Fetch campaigns WITH client data (JOIN)
const { data: campaigns } = await supabase
  .from('youtube_campaigns')
  .select(`
    *,
    youtube_clients (
      id,
      name,
      email,
      company
    ),
    youtube_salespersons (
      id,
      name,
      email
    )
  `)
  .order('created_at', { ascending: false });

// Fetch all clients
const { data: clients } = await supabase
  .from('youtube_clients')
  .select('*')
  .order('name');
```

### 2. Data Grouping (ClientsManagement Component)

Campaigns are grouped by client for the card view:

```typescript
const campaignsByClient = useMemo(() => {
  const grouped = new Map<string, Campaign[]>();
  
  campaigns.forEach(campaign => {
    if (campaign.client_id) {
      if (!grouped.has(campaign.client_id)) {
        grouped.set(campaign.client_id, []);
      }
      grouped.get(campaign.client_id)!.push(campaign);
    }
  });
  
  return grouped;
}, [campaigns]);
```

### 3. Component Hierarchy

```
ClientsManagement.tsx (Parent)
  ├── View Toggle (Cards/Table)
  ├── Search Bar
  └── For each client:
      └── ClientDetailCard.tsx
          ├── Client Info
          ├── Aggregated Stats (from campaigns)
          └── Campaign List
              └── Campaign Details (views, progress, status)
```

## Key Features

### Client Detail Card

Shows comprehensive client information with all related campaigns:

1. **Client Header**
   - Name, company, email
   - Overall health score (average of all campaign progresses)

2. **Aggregated Statistics**
   - Total campaigns (active, complete)
   - Overall progress (total views / total goal)
   - Total views across all campaigns
   - Total revenue
   - Number of campaigns in Ratio Fixer

3. **Campaign List**
   - Each campaign with:
     - Name and status icon
     - Progress bar (current views / goal views)
     - Ratio Fixer badge (if in queue)
     - Link to YouTube video
     - Revenue and start date
   - Click to view full campaign details

### Data Validation Rules

1. **Client Creation**
   - Name is required
   - Primary email is required and must be valid
   - Company is optional
   - Additional emails (email2, email3) are optional but must be valid if provided

2. **Campaign Creation**
   - Must have a client_id (required relationship)
   - Campaign name is required
   - YouTube URL is required
   - Goal views must be > 0
   - Status defaults to 'pending'

3. **Data Integrity**
   - Foreign key constraint ensures client_id always references valid client
   - Deleting a client with campaigns should be prevented (or cascade)
   - Updating client info should reflect in all related campaigns

## Real-Time Updates

### React Query Invalidation

When data changes, related queries are invalidated:

```typescript
// After creating/updating/deleting a campaign
queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
queryClient.invalidateQueries({ queryKey: ['youtube-clients'] }); // If client data affected

// After creating/updating/deleting a client
queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] }); // Campaigns have client relations
```

### Supabase Realtime (Disabled - Pending RLS)

Currently disabled due to RLS configuration issues. To re-enable:

1. Configure proper RLS policies
2. Uncomment real-time subscriptions in `useCampaigns.ts`
3. Subscribe to both tables:

```typescript
supabase
  .channel('youtube-data')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_campaigns' }, () => {
    queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_clients' }, () => {
    queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
  })
  .subscribe();
```

## Campaign Performance Tracking

### View Progress

Each campaign tracks:
- `current_views`: Real-time view count from YouTube API
- `goal_views`: Target view count
- Progress: `(current_views / goal_views) * 100`

### Health Score

Client health is calculated as the average progress of all their campaigns:

```typescript
const healthScores = campaigns.map(c => {
  const campaignGoal = c.goal_views || 0;
  const campaignViews = c.current_views || 0;
  return campaignGoal > 0 ? Math.min((campaignViews / campaignGoal) * 100, 100) : 0;
});
const avgHealth = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;
```

Color coding:
- 🟢 Green (80-100%): On track
- 🟡 Yellow (50-79%): Needs attention
- 🔴 Red (0-49%): Behind target

### Ratio Fixer Integration

Campaigns can be queued in the Ratio Fixer system:
- `in_fixer` boolean flag
- Tracks campaigns needing engagement boost
- Visible in client card as a badge
- Counted in client-level statistics

## YouTube API Integration

### View Count Updates

The YouTube Data API v3 provides real-time view counts:

1. Periodic polling (every X minutes)
2. Update `current_views` in database
3. Calculate new progress percentages
4. Trigger UI updates via React Query

### Data Sync Flow

```
YouTube API → Backend Service → Supabase → React Query → UI
```

## Future Enhancements

1. **Campaign Modal**
   - Full campaign details view
   - Edit campaign inline
   - View daily stats history
   - Manage Ratio Fixer settings

2. **Client Dashboard**
   - Dedicated client detail page
   - Historical performance charts
   - Campaign timeline
   - Revenue analytics

3. **Bulk Operations**
   - Select multiple campaigns
   - Bulk status updates
   - Batch Ratio Fixer queue management

4. **Enhanced Filtering**
   - Filter clients by campaign count
   - Filter by health score
   - Filter by revenue range
   - Filter by Ratio Fixer status

## Testing Data Relationships

### Verify Client-Campaign Links

```sql
-- Count campaigns per client
SELECT 
  c.name as client_name,
  COUNT(yc.id) as campaign_count,
  SUM(yc.current_views) as total_views,
  SUM(yc.sale_price) as total_revenue
FROM youtube_clients c
LEFT JOIN youtube_campaigns yc ON yc.client_id = c.id
GROUP BY c.id, c.name
ORDER BY campaign_count DESC;

-- Find campaigns without clients (data integrity check)
SELECT id, campaign_name, client_id
FROM youtube_campaigns
WHERE client_id IS NULL;

-- Find clients without campaigns
SELECT id, name
FROM youtube_clients
WHERE id NOT IN (SELECT DISTINCT client_id FROM youtube_campaigns WHERE client_id IS NOT NULL);
```

### Query Performance

Ensure indexes exist for foreign keys:

```sql
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_client_id 
ON youtube_campaigns(client_id);

CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_status 
ON youtube_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_in_fixer 
ON youtube_campaigns(in_fixer);
```

## Component Props & Types

### ClientDetailCard Props

```typescript
interface ClientDetailCardProps {
  client: Client;              // Full client object
  campaigns: Campaign[];       // Array of campaigns for this client
  onCampaignClick?: (campaign: Campaign) => void; // Optional click handler
}
```

### Campaign Type (with relations)

```typescript
type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'] & {
  youtube_clients?: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
  youtube_salespersons?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
};
```

---

**Last Updated**: 2025-11-17  
**Status**: ✅ Fully Implemented  
**Next Steps**: Add campaign modal, connect YouTube API for live view updates

