# Production Migration Commands

Run these commands on your production droplet to apply the `campaign_submissions` migration.

## Quick Commands

```bash
# 1. SSH into your production droplet
ssh root@your-droplet-ip

# 2. Copy the migration SQL to the container
docker cp supabase/migrations/999_update_campaign_submissions.sql supabase_db_artistinfluence:/tmp/

# 3. Apply the migration
docker exec supabase_db_artistinfluence psql -U postgres -d postgres -f /tmp/999_update_campaign_submissions.sql

# 4. Verify the columns were added
docker exec supabase_db_artistinfluence psql -U postgres -d postgres -c "\d campaign_submissions"

# 5. Restart the Supabase PostgREST service to refresh the schema cache
docker restart supabase_postgrest_artistinfluence
```

## What This Migration Adds

1. **`client_id`** (UUID): Reference to the `clients` table for existing clients
2. **`sfa_url`** (TEXT): Spotify for Artists URL for the track
3. **`vendor_assignments`** (JSONB): Array of vendor allocations with streams and budget
4. **`reviewed_at`** (TIMESTAMP): When the submission was reviewed
5. **`reviewed_by`** (UUID): User ID of the reviewer
6. **`submission_notes`** (TEXT): Additional notes

## After Migration

Once the migration is applied, the frontend will automatically start using these new columns. The campaign submission form will save:
- Client ID reference
- Spotify for Artists URL
- Vendor assignments (allocated streams and budget per vendor)

