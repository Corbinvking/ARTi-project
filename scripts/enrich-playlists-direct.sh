#!/bin/bash

# Direct Playlist Enrichment via PostgreSQL and Spotify API
# This script queries the database directly and enriches playlists

echo "🚀 Starting playlist enrichment..."
echo ""

# Set Spotify credentials
SPOTIFY_CLIENT_ID="${SPOTIFY_CLIENT_ID:-294f0422469444b5b4b0178ce438b5b8}"
SPOTIFY_CLIENT_SECRET="${SPOTIFY_CLIENT_SECRET:-7320687e4ceb475b82c2f3a543eb2f9e}"

# Get Spotify access token
echo "🔑 Getting Spotify access token..."
AUTH_STRING=$(echo -n "$SPOTIFY_CLIENT_ID:$SPOTIFY_CLIENT_SECRET" | base64 -w 0)
TOKEN_RESPONSE=$(curl -s -X POST "https://accounts.spotify.com/api/token" \
  -H "Authorization: Basic $AUTH_STRING" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials")

# Parse JSON response
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get Spotify access token"
    echo "Response: $TOKEN_RESPONSE"
    echo ""
    echo "Trying alternative parsing..."
    # Fallback: use sed
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "❌ Still failed. Check your Spotify credentials."
        exit 1
    fi
fi

echo "✅ Access token obtained"
echo ""

# Get campaigns with playlist links from database
echo "📊 Fetching campaigns from database..."
CAMPAIGNS=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -A -F $'\t' -c \
  "SELECT id, campaign, playlist_links FROM spotify_campaigns WHERE playlist_links IS NOT NULL AND playlist_links != '';")

if [ -z "$CAMPAIGNS" ]; then
    echo "⚠️  No campaigns with playlist links found"
    exit 0
fi

CAMPAIGN_COUNT=$(echo "$CAMPAIGNS" | wc -l)
echo "✅ Found $CAMPAIGN_COUNT campaigns to process"
echo ""

PROCESSED=0
ENRICHED=0
FAILED=0

# Process each campaign
while IFS=$'\t' read -r CAMPAIGN_ID CAMPAIGN_NAME PLAYLIST_LINKS; do
    ((PROCESSED++))
    echo "[$PROCESSED/$CAMPAIGN_COUNT] Processing: $CAMPAIGN_NAME"
    
    # Extract playlist URLs (simple split by newline)
    while IFS= read -r PLAYLIST_URL; do
        # Skip empty lines
        [ -z "$PLAYLIST_URL" ] && continue
        
        # Skip non-Spotify URLs
        [[ ! "$PLAYLIST_URL" =~ spotify\.com/playlist ]] && continue
        
        # Extract playlist ID
        PLAYLIST_ID=$(echo "$PLAYLIST_URL" | grep -oP 'playlist/\K[a-zA-Z0-9]+' | head -1)
        
        if [ -z "$PLAYLIST_ID" ]; then
            echo "  ⏭️  Could not extract ID from: ${PLAYLIST_URL:0:50}..."
            continue
        fi
        
        echo "  Processing playlist: $PLAYLIST_ID"
        
        # Fetch playlist data from Spotify
        SPOTIFY_DATA=$(curl -s -X GET "https://api.spotify.com/v1/playlists/$PLAYLIST_ID" \
          -H "Authorization: Bearer $ACCESS_TOKEN")
        
        # Extract data using grep (basic parsing)
        PLAYLIST_NAME=$(echo "$SPOTIFY_DATA" | grep -oP '"name":"\K[^"]+' | head -1)
        FOLLOWER_COUNT=$(echo "$SPOTIFY_DATA" | grep -oP '"followers":\{"[^}]*"total":\K[0-9]+')
        TRACK_COUNT=$(echo "$SPOTIFY_DATA" | grep -oP '"tracks":\{"[^}]*"total":\K[0-9]+')
        OWNER_NAME=$(echo "$SPOTIFY_DATA" | grep -oP '"owner":\{[^}]*"display_name":"\K[^"]+')
        
        if [ -z "$PLAYLIST_NAME" ]; then
            echo "    ❌ Failed to fetch playlist data"
            ((FAILED++))
            continue
        fi
        
        echo "    ✅ $PLAYLIST_NAME"
        echo "    👥 ${FOLLOWER_COUNT:-0} followers"
        
        # Insert or update in playlists table
        docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << EOSQL
-- Check if playlist exists, then insert or update
DO \$\$
DECLARE
    playlist_id_var UUID;
BEGIN
    -- Try to find existing playlist
    SELECT id INTO playlist_id_var FROM playlists WHERE url = '$PLAYLIST_URL';
    
    IF playlist_id_var IS NOT NULL THEN
        -- Update existing
        UPDATE playlists SET
            name = '$(echo "$PLAYLIST_NAME" | sed "s/'/''/g")',
            follower_count = ${FOLLOWER_COUNT:-0},
            track_count = ${TRACK_COUNT:-0},
            owner_name = '$(echo "$OWNER_NAME" | sed "s/'/''/g")',
            spotify_id = '$PLAYLIST_ID'
        WHERE id = playlist_id_var;
    ELSE
        -- Insert new
        INSERT INTO playlists (name, url, spotify_id, follower_count, track_count, owner_name, vendor_id, genres, avg_daily_streams)
        VALUES (
            '$(echo "$PLAYLIST_NAME" | sed "s/'/''/g")',
            '$PLAYLIST_URL',
            '$PLAYLIST_ID',
            ${FOLLOWER_COUNT:-0},
            ${TRACK_COUNT:-0},
            '$(echo "$OWNER_NAME" | sed "s/'/''/g")',
            $([ -n "$VENDOR_ID" ] && echo "'$VENDOR_ID'" || echo "NULL"),
            '{}',
            0
        );
    END IF;
END \$\$;

-- Link to campaign (check if already exists first)
INSERT INTO campaign_playlists (
    campaign_id, playlist_name, playlist_curator, playlist_url, playlist_spotify_id,
    playlist_follower_count, streams_7d, streams_28d, streams_12m
)
SELECT
    $CAMPAIGN_ID,
    '$(echo "$PLAYLIST_NAME" | sed "s/'/''/g")',
    '$(echo "$OWNER_NAME" | sed "s/'/''/g")',
    '$PLAYLIST_URL',
    '$PLAYLIST_ID',
    ${FOLLOWER_COUNT:-0},
    0, 0, 0
WHERE NOT EXISTS (
    SELECT 1 FROM campaign_playlists 
    WHERE campaign_id = $CAMPAIGN_ID AND playlist_url = '$PLAYLIST_URL'
);
EOSQL
        
        ((ENRICHED++))
        echo "    🔗 Linked to campaign"
        
        # Rate limiting
        sleep 0.2
        
    done <<< "$PLAYLIST_LINKS"
    
    echo ""
done <<< "$CAMPAIGNS"

echo "============================================================"
echo "📈 ENRICHMENT SUMMARY"
echo "============================================================"
echo "📋 Campaigns processed:   $PROCESSED"
echo "🎵 Playlists enriched:    $ENRICHED"
echo "❌ Failed:                $FAILED"
echo "============================================================"
echo ""
echo "✅ Enrichment complete!"

