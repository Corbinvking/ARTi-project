# Campaign Data Structure Refactoring Plan

## Problem Analysis

Looking at the CSV data, campaigns should be structured as:
- **Campaign** = Client + Goal + Budget + Date (can have multiple songs)
- **Song** = Individual track within a campaign (assigned to vendors)

### Examples from CSV:
```
Reece Rosé - Back Back, Reece Rosé, 50000, $800, 10/9/2025, Active
Reece Rosé - Everything I Need, Reece Rosé, 50000, $800, 9/25/2025, Pending
```
These are 2 separate campaigns (different dates/tracks).

```
Kluster FLux - War, Kluster Flux, 25000, $800, 9/8/2025, Active, Glenn
Kluster FLux - War, Kluster Flux, 25000, $800, 9/8/2025, Active, Club Restricted
```
These are 1 campaign with the SAME song pitched to 2 vendors.

## Proposed Database Schema

### 1. Keep `spotify_campaigns` as the source of truth (songs/tracks)
```sql
-- This table stays mostly the same, represents individual song placements
spotify_campaigns (
  id, campaign, client, client_id, goal, remaining, daily, weekly,
  url, sale_price, start_date, status, vendor, ...
)
```

### 2. Create `campaign_groups` table
```sql
CREATE TABLE campaign_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id),
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL, -- e.g., "Reece Rosé - Back Back"
  artist_name TEXT,
  total_goal INTEGER NOT NULL,
  total_budget DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status TEXT, -- Draft, Active, Pending, Complete, Cancelled
  invoice_status TEXT,
  salesperson TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Link songs to campaign groups
```sql
ALTER TABLE spotify_campaigns ADD COLUMN campaign_group_id UUID REFERENCES campaign_groups(id);
```

## Data Migration Strategy

### Step 1: Identify Unique Campaigns
Group `spotify_campaigns` by:
- `client` (or `client_id`)
- `campaign` name (song name)
- `start_date`
- `sale_price` (budget)
- `goal`

### Step 2: Create Campaign Groups
For each unique group:
1. Create a `campaign_group` record
2. Update all matching `spotify_campaigns` rows with `campaign_group_id`

### Step 3: Calculate Campaign Totals
```sql
-- Total goal = SUM(goal) of all songs in campaign
-- Total remaining = SUM(remaining) of all songs
-- Total daily = SUM(daily) of all songs
-- Total weekly = SUM(weekly) of all songs
-- Progress % = (total_goal - total_remaining) / total_goal * 100
```

## Frontend Changes

### Campaign List UI (matching screenshot)
```typescript
interface CampaignDisplay {
  campaignName: string;        // "Reece Rosé - Back Back"
  client: Client;              // Client object with name, email
  status: string;              // "Draft", "Active", etc.
  dailyStreams: number;        // Sum of all songs' daily streams
  weeklyStreams: number;       // Sum of all songs' weekly streams
  remaining: number;           // Sum of all songs' remaining
  progress: number;            // Calculated percentage
  invoiceStatus: string;       // "Not Invoiced", "Sent", "Paid"
  performance: string;         // "N/A", "On Track", etc.
  songs: CampaignSong[];       // Array of songs in this campaign
}

interface CampaignSong {
  id: number;
  trackName: string;           // From "campaign" column
  vendor: string;              // "Glenn", "Club Restricted", etc.
  goal: number;
  remaining: number;
  daily: number;
  weekly: number;
  status: string;
  curatorStatus: string;
  playlists: string;
}
```

### Campaign Detail View
When clicking a campaign, show:
- Campaign header (name, client, dates, budget)
- Progress bars (overall goal vs. achieved)
- Table of songs within campaign
- Each song shows: vendor, goal, remaining, daily, weekly, playlists

## Implementation Steps

1. ✅ Create `campaign_groups` table migration
2. ✅ Create data migration script to group existing data
3. ✅ Add `campaign_group_id` to `spotify_campaigns`
4. ✅ Update frontend queries to fetch campaigns with songs
5. ✅ Update UI to display campaigns (not individual songs)
6. ✅ Update client campaigns list to show grouped campaigns

