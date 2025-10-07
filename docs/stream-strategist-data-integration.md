# Stream Strategist Data Integration Guide

This guide explains how to integrate existing Airtable campaign data with the Stream Strategist application.

## Overview

The Stream Strategist integration requires syncing campaign data from the `spotify_campaigns` table (Airtable import) to the `stream_strategist_campaigns` table (Stream Strategist schema).

## Architecture

```
Airtable CSV → spotify_campaigns (import table)
                        ↓
            Sync Script (one-way)
                        ↓
        stream_strategist_campaigns (Stream Strategist)
                        ↓
            Stream Strategist Frontend
```

## Prerequisites

✅ Supabase database with both schemas deployed
✅ Campaign data loaded into `spotify_campaigns` table
✅ Missing columns added to `stream_strategist_campaigns` table

## Schema Mapping

### Data Transformation

| Airtable Field | Stream Strategist Field | Transformation |
|----------------|------------------------|----------------|
| `campaign` | `name` | Direct |
| `client` | `client`, `client_name` | Direct |
| `url` | `track_url` | Direct |
| `goal` | `stream_goal` | Parse integer |
| `remaining` | `remaining_streams` | Parse integer |
| `sale_price` | `budget` | Parse numeric |
| `salesperson` | `salesperson` | Direct |
| `status` | `status` | Map status values |
| `start_date` | `start_date` | Parse date |
| `daily` | `daily_streams` | Parse integer |
| `weekly` | `weekly_streams` | Parse integer |
| `notes` | `notes` | Direct |

### Status Mapping

| Airtable Status | Stream Strategist Status |
|----------------|-------------------------|
| active | active |
| completed | completed |
| paused | paused |
| draft | draft |
| cancelled | cancelled |
| *(default)* | draft |

## Deployment Steps

### Local Environment

1. **Apply Missing Column Migration**:
   ```bash
   Get-Content supabase/migrations/018_add_missing_stream_strategist_columns.sql | docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres
   ```

2. **Sync Campaign Data**:
   ```bash
   node scripts/sync-spotify-campaigns-to-stream-strategist.js
   ```

3. **Verify Sync**:
   ```bash
   docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM stream_strategist_campaigns;"
   ```

### Production Environment (Droplet)

1. **SSH into Droplet**:
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Navigate to Project**:
   ```bash
   cd /root/arti-marketing-ops
   ```

3. **Pull Latest Changes**:
   ```bash
   git pull origin main
   ```

4. **Apply Missing Column Migration**:
   ```bash
   docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/018_add_missing_stream_strategist_columns.sql
   ```

5. **Sync Campaign Data**:
   ```bash
   node scripts/sync-spotify-campaigns-to-stream-strategist.js --production
   ```

   Or if Node.js environment isn't set up on droplet:
   ```bash
   # Sync locally with production credentials
   # Set environment variables:
   export SUPABASE_URL="your-production-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # Run sync
   node scripts/sync-spotify-campaigns-to-stream-strategist.js --production
   ```

6. **Verify Production Sync**:
   ```bash
   docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM stream_strategist_campaigns;"
   ```

## Sync Script Features

The `sync-spotify-campaigns-to-stream-strategist.js` script:

✅ **Data Validation**: Parses and validates all numeric and date fields
✅ **Error Handling**: Continues on individual errors, reports summary
✅ **Progress Reporting**: Shows progress every 100 campaigns
✅ **Organization Isolation**: Automatically assigns campaigns to default org
✅ **Idempotent**: Can be run multiple times (clears existing data first)
✅ **Environment Detection**: Works in both local and production environments

## Data Fields

### Required Fields (Always Set)
- `org_id` - Organization ID (auto-assigned)
- `name` - Campaign name
- `stream_goal` - Target streams
- `budget` - Campaign budget
- `start_date` - Campaign start date
- `status` - Campaign status
- `source` - Set to 'airtable_import'
- `campaign_type` - Set to 'artist_influence_spotify_promotion'

### Optional Fields (If Available)
- `client`, `client_name` - Client information
- `track_url` - Spotify track URL
- `remaining_streams` - Remaining streams to goal
- `allocated_streams` - Calculated from goal - remaining
- `salesperson` - Sales representative
- `daily_streams` - Daily stream count
- `weekly_streams` - Weekly stream count
- `notes` - Campaign notes

### Default Fields
- `duration_days` - 90 days
- `music_genres` - Empty array (to be populated later)
- `content_types` - Empty array
- `territory_preferences` - Empty array
- `selected_playlists` - Empty array
- `vendor_allocations` - Empty object
- `public_access_enabled` - false
- `pending_operator_review` - false

## Frontend Integration

The Stream Strategist frontend automatically reads from `stream_strategist_campaigns` table. Once data is synced:

1. **Campaign List**: Shows all campaigns in the Campaigns tab
2. **Campaign Details**: Click any campaign to view details
3. **Filtering**: Filter by status, client, salesperson
4. **Sorting**: Sort by date, budget, stream goal
5. **Search**: Search by campaign name or client

## API Endpoints

The Stream Strategist frontend uses these Supabase queries:

```typescript
// Get all campaigns
const { data } = await supabase
  .from('stream_strategist_campaigns')
  .select('*')
  .eq('org_id', userOrgId)
  .order('created_at', { ascending: false });

// Get single campaign
const { data } = await supabase
  .from('stream_strategist_campaigns')
  .select('*')
  .eq('id', campaignId)
  .single();
```

## Ongoing Sync

For ongoing synchronization:

1. **Manual Sync**: Run sync script whenever new campaigns are added to Airtable
2. **Scheduled Sync**: Set up a cron job to run the sync script periodically
3. **Real-time Sync**: Implement database triggers (advanced)

### Example Cron Job

```bash
# Run sync daily at 2 AM
0 2 * * * cd /root/arti-marketing-ops && node scripts/sync-spotify-campaigns-to-stream-strategist.js --production
```

## Troubleshooting

### Missing Columns Error
```
Error: Could not find the 'daily_streams' column
```
**Solution**: Run migration 018 first

### Organization Not Found
```
Error: No organization found
```
**Solution**: Ensure orgs table has at least one organization

### Permission Denied
```
Error: permission denied for table stream_strategist_campaigns
```
**Solution**: Use service role key, not anon key

### All Campaigns Fail
Check that:
- Migration 018 has been applied
- Service role key is correct
- Organization exists in orgs table
- RLS policies allow service role access

## Data Validation

After sync, verify:

1. **Count Matches**:
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM spotify_campaigns) as source_count,
     (SELECT COUNT(*) FROM stream_strategist_campaigns) as target_count;
   ```

2. **Sample Data**:
   ```sql
   SELECT name, stream_goal, status, client 
   FROM stream_strategist_campaigns 
   LIMIT 10;
   ```

3. **Status Distribution**:
   ```sql
   SELECT status, COUNT(*) 
   FROM stream_strategist_campaigns 
   GROUP BY status;
   ```

## Success Criteria

✅ All campaigns synced without errors
✅ Campaign count matches source data
✅ Stream Strategist frontend displays campaigns
✅ Campaign details load correctly
✅ Filtering and search work properly
✅ No RLS policy violations

---

**🎉 Once complete, your Stream Strategist integration is fully operational with real campaign data!**
