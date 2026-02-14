#!/bin/bash
# Instagram Scraper Cron Job Setup Script
# Run this script on the production server to set up daily scraping
#
# Usage: ./setup_cron.sh
#
# This will:
# 1. Make the scraper script executable
# 2. Create the log file
# 3. Add the cron job to run 3x daily (6:00, 14:00, 22:00 UTC) like YouTube

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPER_SCRIPT="${SCRIPT_DIR}/run_instagram_scraper.sh"
LOG_FILE="/var/log/instagram_scraper.log"
CRON_TIME="0 6,14,22 * * *"  # 6:00, 14:00, 22:00 UTC (3x daily)

echo "=========================================="
echo "Instagram Scraper Cron Job Setup"
echo "=========================================="
echo ""

# 1. Make scraper script executable
echo "1. Making scraper script executable..."
chmod +x "${SCRAPER_SCRIPT}"
echo "   ✅ ${SCRAPER_SCRIPT}"

# 2. Create log file
echo ""
echo "2. Creating log file..."
touch "${LOG_FILE}"
chmod 644 "${LOG_FILE}"
echo "   ✅ ${LOG_FILE}"

# 3. Check if cron job already exists
echo ""
echo "3. Configuring cron job..."
CRON_ENTRY="${CRON_TIME} ${SCRAPER_SCRIPT} >> ${LOG_FILE} 2>&1"

if crontab -l 2>/dev/null | grep -q "instagram_scraper"; then
    echo "   ⚠️  Existing cron job found. Updating..."
    # Remove old entry and add new one
    (crontab -l 2>/dev/null | grep -v "instagram_scraper"; echo "${CRON_ENTRY}") | crontab -
else
    echo "   Adding new cron job..."
    (crontab -l 2>/dev/null; echo "${CRON_ENTRY}") | crontab -
fi
echo "   ✅ Cron job added: ${CRON_TIME} (6:00, 14:00, 22:00 UTC - 3x daily)"

# 4. Verify
echo ""
echo "4. Verifying setup..."
echo ""
echo "   Current cron jobs:"
crontab -l 2>/dev/null | grep instagram || echo "   (none found - something went wrong)"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "The scraper will run automatically 3x daily at 6:00, 14:00, and 22:00 UTC."
echo ""
echo "Useful commands:"
echo "  - View logs:     tail -f ${LOG_FILE}"
echo "  - Manual run:    ${SCRAPER_SCRIPT}"
echo "  - Test run:      curl -X POST http://localhost:3001/api/instagram-scraper/batch -H 'Content-Type: application/json' -d '{\"dryRun\":true}'"
echo "  - Edit cron:     crontab -e"
echo ""

