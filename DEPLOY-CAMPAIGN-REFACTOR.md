# Deploy Campaign Refactoring

## Overview
This deployment refactors campaign data structure to properly group songs into campaigns, matching the UI shown in the screenshot.

## What's Changing

### Database
- **New Table**: `campaign_groups` - Represents actual campaigns (can contain multiple songs)
- **Updated Table**: `spotify_campaigns` - Gets new column `campaign_group_id` to link to parent campaign
- **New Functions**: 
  - `get_campaign_group_with_songs(uuid)` - Fetch campaign with all its songs
  - `get_client_campaigns(uuid)` - Fetch all campaigns for a client

### Data Model
**Before**: Each row in `spotify_campaigns` = 1 song placement with 1 vendor
**After**: 
- `campaign_groups` = 1 campaign (e.g., "Reece Rosé - Back Back")
- `spotify_campaigns` = 1 song placement (linked to campaign via `campaign_group_id`)

## Deployment Steps

### 1. LOCAL: Apply Migration & Group Data

```bash
# Apply the migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/028_create_campaign_groups.sql

# Run the grouping script
node scripts/group-campaigns.js

# Verify the grouping
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total_campaigns FROM campaign_groups;"

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, total_goal, status, (SELECT COUNT(*) FROM spotify_campaigns WHERE campaign_group_id = cg.id) as song_count FROM campaign_groups cg ORDER BY start_date DESC LIMIT 10;"
```

### 2. Test Locally

Navigate to `/spotify/campaigns` and verify:
- ✅ Campaigns are shown (not individual songs)
- ✅ Each campaign shows total goal, remaining, daily, weekly
- ✅ Progress bars are calculated correctly
- ✅ Clicking a campaign shows all its songs
- ✅ Client tab shows campaigns for each client

### 3. PRODUCTION: Apply Migration & Group Data

```bash
# SSH into production
ssh root@artistinfluence.com
cd ~/arti-marketing-ops

# Pull latest changes
git pull origin main

# Apply the migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/028_create_campaign_groups.sql

# Run the grouping script
node scripts/group-campaigns.js

# Verify
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total_campaigns FROM campaign_groups;"

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, total_goal, status FROM campaign_groups ORDER BY start_date DESC LIMIT 10;"
```

### 4. Push Frontend Changes

```bash
# Commit and push
git add .
git commit -m "Refactor: Group songs into campaigns for proper campaign management"
git push origin main
```

### 5. Verify Production

1. Navigate to https://app.artistinfluence.com/spotify/campaigns
2. Verify campaigns are displayed correctly
3. Check client tab - campaigns should appear under each client

## Expected Results

### Campaign List
- Each row = 1 campaign (not 1 song)
- Campaign name: "Artist - Song Title"
- Shows aggregated metrics: total goal, remaining, daily streams, weekly streams
- Progress bar shows overall campaign progress
- Status: Draft, Active, Pending, Complete, etc.
- Invoice status: Not Invoiced, Sent, Paid

### Campaign Details
When clicking a campaign:
- Header: Campaign name, client, dates, budget
- Progress section: Overall goal vs. achieved
- Songs table: Each song with vendor, goal, remaining, playlists

### Client Campaigns
In client tab, when clicking a client:
- Shows all campaigns for that client
- Each campaign displays total metrics
- Clicking campaign shows song details

## Rollback (if needed)

```bash
# Remove campaign_group_id column
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS campaign_group_id;"

# Drop campaign_groups table
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "DROP TABLE IF EXISTS campaign_groups CASCADE;"
```

## Notes

- The grouping script groups songs by: `client_id`, `campaign` (song name), `start_date`, and `sale_price`
- Songs with the same track going to different vendors are grouped into the same campaign
- Total metrics are calculated by summing all songs' individual metrics
- Progress % = (total_goal - total_remaining) / total_goal × 100

