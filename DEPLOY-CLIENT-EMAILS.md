# Deploy Client Emails to Production

## Overview
This deployment populates the `emails` array column in the `clients` table from the `client_email` data in `spotify_campaigns`.

## Steps

### 1. SSH into Production Server
```bash
ssh root@artistinfluence.com
cd ~/arti-marketing-ops
```

### 2. Pull Latest Changes
```bash
git pull origin main
```

### 3. Apply Email Population Script
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/populate-client-emails.sql
```

### 4. Verify Email Population
```bash
# Check some clients with emails
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, emails FROM clients WHERE emails IS NOT NULL AND array_length(emails, 1) > 0 ORDER BY name LIMIT 10;"

# Check counts
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FILTER (WHERE emails IS NOT NULL AND array_length(emails, 1) > 0) as with_emails, COUNT(*) FILTER (WHERE emails IS NULL OR array_length(emails, 1) = 0) as without_emails, COUNT(*) as total FROM clients;"
```

### 5. Test Frontend
1. Navigate to https://app.artistinfluence.com/spotify/clients
2. Verify that the email icons show correct counts (e.g., "📧 1" for clients with one email)
3. Hover over the email icon to see the tooltip with actual email addresses
4. Verify it looks exactly like the local instance

## Expected Results
- Clients should have their `emails` populated from `spotify_campaigns.client_email`
- Frontend should display email counts with icons
- Tooltips should show actual email addresses on hover
- Display should match the local instance exactly

## Rollback (if needed)
```bash
# Clear all emails
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "UPDATE clients SET emails = NULL;"
```

## Notes
- This script only updates clients that have associated campaigns with `client_email` data
- Clients without campaign data will have `NULL` or empty email arrays
- The script filters out invalid email entries (empty, comma-separated values, etc.)

