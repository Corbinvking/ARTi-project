#!/bin/bash
# Update Flask status endpoint to include ordered_likes and ordered_comments

set -e

echo "=========================================="
echo "Updating Flask Status Endpoint"
echo "=========================================="
echo ""

FLASK_MAIN="/opt/ratio-fixer/main.py"

# Step 1: Check if file exists
if [ ! -f "$FLASK_MAIN" ]; then
    echo "❌ Flask main.py not found at $FLASK_MAIN"
    exit 1
fi

echo "✅ Found Flask main.py"

# Step 2: Check if API endpoint exists
if grep -q "@app.route(\"/api/campaign_status" "$FLASK_MAIN"; then
    echo "✅ API endpoint exists"
    
    # Step 3: Check if it already includes ordered counts
    if grep -q "ordered_likes\|ordered_comments" "$FLASK_MAIN" | grep -A 20 "/api/campaign_status"; then
        echo "✅ Endpoint already includes ordered counts"
    else
        echo "⚠️  Endpoint missing ordered counts, updating..."
        
        # Create backup
        sudo cp "$FLASK_MAIN" "${FLASK_MAIN}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update the endpoint to include ordered counts
        sudo python3 << 'PYTHON_SCRIPT'
import re
import sys

file_path = "/opt/ratio-fixer/main.py"

with open(file_path, 'r') as f:
    content = f.read()

# Find the API campaign_status endpoint
pattern = r'(@app\.route\("/api/campaign_status/<campaign_id>"[^}]+"desired_likes":\s*\([^)]+\)[^}]+)'
match = re.search(pattern, content, re.DOTALL)

if match:
    # Add ordered_likes and ordered_comments to the response
    old_endpoint = match.group(1)
    new_endpoint = old_endpoint.rstrip()
    if 'ordered_likes' not in new_endpoint:
        # Add after desired_likes
        new_endpoint = new_endpoint.replace(
            '"desired_likes": (',
            '"desired_likes": ('
        )
        # Add ordered counts before the closing brace
        if 'ordered_likes' not in new_endpoint:
            # Find where to insert
            insert_pos = new_endpoint.rfind(')')
            if insert_pos > 0:
                ordered_counts = ',\n                "ordered_likes": campaign.ordered_likes if hasattr(campaign, "ordered_likes") else 0,\n                "ordered_comments": campaign.ordered_comments if hasattr(campaign, "ordered_comments") else 0'
                new_endpoint = new_endpoint[:insert_pos] + ordered_counts + new_endpoint[insert_pos:]
    
    content = content.replace(old_endpoint, new_endpoint)
    
    with open(file_path, 'w') as f:
        f.write(content)
    print("✅ Updated endpoint")
else:
    print("⚠️  Could not find API endpoint pattern")
    sys.exit(1)
PYTHON_SCRIPT
        
        if [ $? -eq 0 ]; then
            echo "✅ Endpoint updated"
        else
            echo "⚠️  Python update failed, trying sed approach..."
            # Alternative: use sed to add after desired_likes line
            sudo sed -i '/"desired_likes":/a\                "ordered_likes": campaign.ordered_likes if hasattr(campaign, "ordered_likes") else 0,\n                "ordered_comments": campaign.ordered_comments if hasattr(campaign, "ordered_comments") else 0,' "$FLASK_MAIN"
        fi
    fi
else
    echo "⚠️  API endpoint not found - may need to add it"
fi

# Step 4: Restart Flask service
echo ""
echo "Step 4: Restarting Flask service..."
sudo systemctl restart ratio-fixer
sleep 3

if systemctl is-active --quiet ratio-fixer; then
    echo "✅ Flask service restarted"
else
    echo "⚠️  Flask service may have issues, check logs:"
    sudo journalctl -u ratio-fixer -n 20 --no-pager
fi

echo ""
echo "=========================================="
echo "Update Complete"
echo "=========================================="

