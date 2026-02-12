#!/usr/bin/env bash
# Apply repost channel genres migration directly (no Supabase CLI).
# Usage:
#   After SSH to server: ./scripts/apply-repost-channel-genres.sh
#   Or: DATABASE_URL='postgresql://...' ./scripts/apply-repost-channel-genres.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ -z "$DATABASE_URL" ]; then
  if [ -f "apps/api/.env" ]; then
    export DATABASE_URL=$(grep -E '^DATABASE_URL=' apps/api/.env | sed 's/^DATABASE_URL=//' | tr -d '\r')
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: Set DATABASE_URL or ensure apps/api/.env contains DATABASE_URL"
  exit 1
fi

echo "Applying migration (soundcloud_repost_channel_genres)..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/apply-repost-channel-genres.sql"
echo "Done."
