#!/bin/bash
# Fix remaining Ratio Fixer issues from verification

FLASK_APP_DIR="/opt/ratio-fixer"
FLASK_DB="${FLASK_APP_DIR}/campaigns.db"

echo "=========================================="
echo "Fixing Ratio Fixer Remaining Issues"
echo "=========================================="
echo ""

# Issue 1: Add missing database columns
echo "Step 1: Adding missing database columns..."
echo ""

sqlite3 "$FLASK_DB" <<EOF
-- Add ordered_comments column if not exists
ALTER TABLE campaign_model ADD COLUMN ordered_comments INTEGER DEFAULT 0;

-- Add comment_server_id column if not exists
ALTER TABLE campaign_model ADD COLUMN comment_server_id INTEGER;

-- Add like_server_id column if not exists
ALTER TABLE campaign_model ADD COLUMN like_server_id INTEGER;

-- Add sheet_tier column if not exists
ALTER TABLE campaign_model ADD COLUMN sheet_tier TEXT DEFAULT '1';

-- Verify columns were added
.schema campaign_model
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database columns added successfully"
else
    echo "⚠️  Some columns may already exist (this is OK)"
fi

echo ""

# Issue 2: Add JingleSMM API key to .env
echo "Step 2: Adding JingleSMM API key to .env..."
echo ""

JINGLE_KEY="aeb45ce3fc5aa241dcfc20e1167dff9f"

if grep -q "JINGLE_API_KEY" "${FLASK_APP_DIR}/.env" 2>/dev/null; then
    echo "⚠️  JINGLE_API_KEY already exists, updating it..."
    # Remove old key and add new one
    sed -i '/JINGLE_API_KEY/d' "${FLASK_APP_DIR}/.env"
    echo "JINGLE_API_KEY=${JINGLE_KEY}" >> "${FLASK_APP_DIR}/.env"
    echo "✅ Updated JINGLE_API_KEY in Flask .env"
else
    echo "JINGLE_API_KEY=${JINGLE_KEY}" >> "${FLASK_APP_DIR}/.env"
    echo "✅ Added JINGLE_API_KEY to Flask .env"
fi

echo ""

# Restart Flask service to pick up .env changes
echo "Step 3: Restarting Flask service..."
echo ""

sudo systemctl restart ratio-fixer

if [ $? -eq 0 ]; then
    sleep 2
    if sudo systemctl is-active --quiet ratio-fixer; then
        echo "✅ Flask service restarted successfully"
    else
        echo "❌ Flask service failed to start"
        echo "   Check logs: sudo journalctl -u ratio-fixer -n 50"
        exit 1
    fi
else
    echo "❌ Failed to restart Flask service"
    exit 1
fi

echo ""
echo "=========================================="
echo "Fix Complete - Running Verification"
echo "=========================================="
echo ""

# Re-run verification to confirm fixes
bash ~/arti-marketing-ops/verify-ratio-fixer-complete.sh

