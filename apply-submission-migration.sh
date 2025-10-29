#!/bin/bash

# Script to apply the campaign_submissions migration to production Supabase
# Run this on your production droplet

echo "🔧 Applying campaign_submissions migration to production..."

# Apply the migration SQL file
docker exec supabase_db_artistinfluence psql -U postgres -d postgres -f /tmp/999_update_campaign_submissions.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully!"
else
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi

echo ""
echo "🎉 Done! The new columns are now available in production."
echo "   - client_id (UUID reference to clients)"
echo "   - sfa_url (TEXT for Spotify for Artists URL)"
echo "   - vendor_assignments (JSONB array)"

