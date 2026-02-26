#!/bin/bash
# Instagram Scraper Cron Job Setup Script
# Run this script on the production server to set up scraping
#
# Usage: ./setup_cron.sh
#
# This will:
# 1. Make the scraper scripts executable
# 2. Create log files
# 3. Add cron jobs:
#    - Campaign post scraper: 3x daily (6:00, 14:00, 22:00 UTC)
#    - Creator profile refresh: weekly (Monday 3:00 UTC)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPER_SCRIPT="${SCRIPT_DIR}/run_instagram_scraper.sh"
CREATOR_REFRESH_SCRIPT="${SCRIPT_DIR}/run_creator_refresh.js"
LOG_FILE="/var/log/instagram_scraper.log"
CREATOR_LOG_FILE="/var/log/creator_refresh.log"
CRON_TIME="0 6,14,22 * * *"  # 6:00, 14:00, 22:00 UTC (3x daily)
CREATOR_CRON_TIME="0 3 * * 1"  # Monday 3:00 UTC (weekly)

echo "=========================================="
echo "Instagram Scraper Cron Job Setup"
echo "=========================================="
echo ""

# 1. Make scraper scripts executable
echo "1. Making scraper scripts executable..."
chmod +x "${SCRAPER_SCRIPT}"
echo "   ✅ ${SCRAPER_SCRIPT}"
chmod +x "${CREATOR_REFRESH_SCRIPT}"
echo "   ✅ ${CREATOR_REFRESH_SCRIPT}"

# 2. Create log files
echo ""
echo "2. Creating log files..."
touch "${LOG_FILE}"
chmod 644 "${LOG_FILE}"
echo "   ✅ ${LOG_FILE}"
touch "${CREATOR_LOG_FILE}"
chmod 644 "${CREATOR_LOG_FILE}"
echo "   ✅ ${CREATOR_LOG_FILE}"

# 3. Configure campaign post scraper cron
echo ""
echo "3. Configuring campaign post scraper cron job..."
CRON_ENTRY="${CRON_TIME} ${SCRAPER_SCRIPT} >> ${LOG_FILE} 2>&1"

if crontab -l 2>/dev/null | grep -q "run_instagram_scraper"; then
    echo "   ⚠️  Existing cron job found. Updating..."
    (crontab -l 2>/dev/null | grep -v "run_instagram_scraper"; echo "${CRON_ENTRY}") | crontab -
else
    echo "   Adding new cron job..."
    (crontab -l 2>/dev/null; echo "${CRON_ENTRY}") | crontab -
fi
echo "   ✅ Campaign scraper: ${CRON_TIME} (6:00, 14:00, 22:00 UTC - 3x daily)"

# 4. Configure weekly creator profile refresh cron
echo ""
echo "4. Configuring creator profile refresh cron job..."
CREATOR_CRON_ENTRY="${CREATOR_CRON_TIME} cd ${SCRIPT_DIR}/.. && node ${CREATOR_REFRESH_SCRIPT} >> ${CREATOR_LOG_FILE} 2>&1"

if crontab -l 2>/dev/null | grep -q "run_creator_refresh"; then
    echo "   ⚠️  Existing cron job found. Updating..."
    (crontab -l 2>/dev/null | grep -v "run_creator_refresh"; echo "${CREATOR_CRON_ENTRY}") | crontab -
else
    echo "   Adding new cron job..."
    (crontab -l 2>/dev/null; echo "${CREATOR_CRON_ENTRY}") | crontab -
fi
echo "   ✅ Creator refresh: ${CREATOR_CRON_TIME} (Monday 3:00 UTC - weekly)"

# 5. Verify
echo ""
echo "5. Verifying setup..."
echo ""
echo "   Current cron jobs:"
crontab -l 2>/dev/null | grep -E "instagram|creator" || echo "   (none found - something went wrong)"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Schedules:"
echo "  - Campaign posts:     3x daily at 6:00, 14:00, 22:00 UTC"
echo "  - Creator profiles:   Weekly on Monday at 3:00 UTC"
echo ""
echo "Useful commands:"
echo "  - Campaign logs:      tail -f ${LOG_FILE}"
echo "  - Creator logs:       tail -f ${CREATOR_LOG_FILE}"
echo "  - Manual campaign:    ${SCRAPER_SCRIPT}"
echo "  - Manual creator:     node ${CREATOR_REFRESH_SCRIPT}"
echo "  - Dry run creator:    node ${CREATOR_REFRESH_SCRIPT} --dry-run"
echo "  - Edit cron:          crontab -e"
echo ""

