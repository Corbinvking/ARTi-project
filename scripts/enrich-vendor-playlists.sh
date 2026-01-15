#!/bin/bash
# Enrich vendor playlists directly from playlists table

SPOTIFY_CLIENT_ID="294f0422469444b5b4b0178ce438b5b8"
SPOTIFY_CLIENT_SECRET="7320687e4ceb475b82c2f3a543eb2f9e"

echo "Getting Spotify token..."
AUTH_STRING=$(echo -n "$SPOTIFY_CLIENT_ID:$SPOTIFY_CLIENT_SECRET" | base64 -w 0)
ACCESS_TOKEN=$(curl -s -X POST "https://accounts.spotify.com/api/token" \
  -H "Authorization: Basic $AUTH_STRING" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Failed to get token"
    exit 1
fi

echo "Token obtained, enriching playlists with missing data..."

# Get playlists with missing follower_count
PLAYLISTS=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -A -F '|' -c \
  "SELECT id, name, COALESCE(spotify_id, '') as spotify_id, COALESCE(url, '') as url FROM playlists WHERE follower_count IS NULL OR follower_count = 0 LIMIT 100;")

COUNT=0
UPDATED=0

while IFS='|' read -r ID NAME SPOTIFY_ID URL; do
    [ -z "$ID" ] && continue
    ((COUNT++))
    
    # Try to get playlist ID from spotify_id or extract from URL
    PLAYLIST_ID="$SPOTIFY_ID"
    if [ -z "$PLAYLIST_ID" ] && [ -n "$URL" ]; then
        PLAYLIST_ID=$(echo "$URL" | grep -oP 'playlist/\K[a-zA-Z0-9]+' | head -1)
    fi
    
    if [ -z "$PLAYLIST_ID" ]; then
        echo "[$COUNT] $NAME - No Spotify ID"
        continue
    fi
    
    # Fetch from Spotify
    DATA=$(curl -s "https://api.spotify.com/v1/playlists/$PLAYLIST_ID" -H "Authorization: Bearer $ACCESS_TOKEN")
    FOLLOWERS=$(echo "$DATA" | python3 -c "import sys, json; print(json.load(sys.stdin).get('followers', {}).get('total', 0))" 2>/dev/null || echo "0")
    
    if [ "$FOLLOWERS" != "0" ] && [ -n "$FOLLOWERS" ]; then
        echo "[$COUNT] $NAME: $FOLLOWERS followers"
        ESCAPED_NAME=$(echo "$NAME" | sed "s/'/''/g")
        docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c \
          "UPDATE playlists SET follower_count = $FOLLOWERS, spotify_id = '$PLAYLIST_ID' WHERE id = '$ID';" 2>/dev/null
        ((UPDATED++))
    else
        echo "[$COUNT] $NAME - Could not fetch"
    fi
    
    sleep 0.2
done <<< "$PLAYLISTS"

echo ""
echo "Done! Processed: $COUNT, Updated: $UPDATED"

