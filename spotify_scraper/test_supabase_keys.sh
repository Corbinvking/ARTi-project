#!/bin/bash
# Test Supabase connection with different keys

echo "=========================================="
echo "  Testing Supabase Keys"
echo "=========================================="
echo ""

URL="https://api.artistinfluence.com/rest/v1/spotify_campaigns"

# Key from .env file
KEY_ENV="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDuYL0wO1Q8"

# Key from Docker/production.env  
KEY_DOCKER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

echo "[1/2] Testing with KEY ending in ...O1Q8 (from .env):"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $KEY_ENV" \
  -H "Authorization: Bearer $KEY_ENV" \
  "$URL?select=id&limit=1")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "     Status: $STATUS"
if [ "$STATUS" = "200" ]; then
    echo "     ✅ SUCCESS!"
else
    echo "     ❌ FAILED"
    echo "     Response: $BODY"
fi
echo ""

echo "[2/2] Testing with KEY ending in ...81IU (from Docker):"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $KEY_DOCKER" \
  -H "Authorization: Bearer $KEY_DOCKER" \
  "$URL?select=id&limit=1")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "     Status: $STATUS"
if [ "$STATUS" = "200" ]; then
    echo "     ✅ SUCCESS!"
else
    echo "     ❌ FAILED"
    echo "     Response: $BODY"
fi
echo ""

echo "=========================================="
echo "  Test Complete"
echo "=========================================="

