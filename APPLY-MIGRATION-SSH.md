# Apply Migration on Production Droplet

SSH into your production droplet and run these commands:

```bash
# 1. Navigate to the project directory
cd /root/arti-marketing-ops

# 2. Pull the latest changes (to get the migration file)
git pull origin main

# 3. Find the migration file
ls -la supabase/migrations/999_update_campaign_submissions.sql

# 4. Copy the migration file into the container
docker cp supabase/migrations/999_update_campaign_submissions.sql supabase_db_arti-marketing-ops:/tmp/

# 5. Apply the migration
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -f /tmp/999_update_campaign_submissions.sql

# 6. Restart PostgREST to refresh the schema cache
docker restart supabase_rest_arti-marketing-ops

# 7. Verify the columns were added
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_submissions"
```

After running these commands, vendor assignments will be saved with new submissions!

