#!/bin/bash
# YouTube Stats Daily Update - Only Active/Pending Campaigns
# Run this script 3x per day via cron

set -e

# Configuration
ORG_ID="00000000-0000-0000-0000-000000000001"
API_URL="http://localhost:3001"
LOG_FILE="/var/log/youtube-stats-update.log"

# Timestamp
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting YouTube stats update (active/pending only)..." | tee -a "$LOG_FILE"

# Fetch stats for active and pending campaigns
RESPONSE=$(curl -s -X POST "${API_URL}/api/youtube-data-api/fetch-all-campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"orgId\":\"${ORG_ID}\",\"includeComplete\":false}")

# Parse and log results
TOTAL=$(echo "$RESPONSE" | jq -r '.total // "N/A"')
UPDATED=$(echo "$RESPONSE" | jq -r '.updated // "N/A"')
ERRORS=$(echo "$RESPONSE" | jq -r '.errors // "N/A"')

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Update complete - Total: $TOTAL, Updated: $UPDATED, Errors: $ERRORS" | tee -a "$LOG_FILE"

# Alert if too many errors
if [ "$ERRORS" != "N/A" ] && [ "$ERRORS" -gt 5 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: High error count ($ERRORS)" | tee -a "$LOG_FILE"
fi

exit 0

