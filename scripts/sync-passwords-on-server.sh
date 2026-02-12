#!/usr/bin/env bash
# Run on production server after SSH to sync admin_set_password from auth.users
# into profiles.metadata so User Management can show passwords for all roles.
#
# Usage (on server):
#   cd /root/arti-marketing-ops && bash scripts/sync-passwords-on-server.sh
#
# Or from your machine (one-liner):
#   ssh root@164.90.129.146 "cd /root/arti-marketing-ops && bash scripts/sync-passwords-on-server.sh"

set -e
CONTAINER="supabase_db_arti-marketing-ops"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$REPO_ROOT/scripts/sync-passwords-to-profiles.sql"

if ! docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  echo "Error: Cannot reach Postgres container '$CONTAINER'. Is Supabase running?"
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "Syncing admin_set_password from auth.users into profiles.metadata..."
docker exec -i "$CONTAINER" psql -U postgres -d postgres < "$SQL_FILE"
echo "Done. Profiles with stored passwords:"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "SELECT p.email, p.role, (p.metadata->>'admin_set_password' IS NOT NULL) AS has_password FROM public.profiles p ORDER BY p.email;"
