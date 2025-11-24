#!/bin/bash
# Fix Caddyfile.production encoding from UTF-16 to UTF-8

set -e

echo "=========================================="
echo "Fixing Caddyfile.production Encoding"
echo "=========================================="
echo ""

CADDYFILE="/root/arti-marketing-ops/caddy/Caddyfile.production"

# Step 1: Backup the file
echo "Step 1: Creating backup..."
sudo cp "$CADDYFILE" "${CADDYFILE}.backup.utf16"

# Step 2: Check current encoding
echo ""
echo "Step 2: Checking current encoding..."
file "$CADDYFILE"

# Step 3: Convert UTF-16 to UTF-8
echo ""
echo "Step 3: Converting UTF-16 to UTF-8..."
# Use iconv to convert
if command -v iconv >/dev/null 2>&1; then
    sudo iconv -f UTF-16LE -t UTF-8 "$CADDYFILE" > "${CADDYFILE}.utf8"
    sudo mv "${CADDYFILE}.utf8" "$CADDYFILE"
    echo "✅ Converted using iconv"
elif command -v dos2unix >/dev/null 2>&1; then
    # Alternative: use dos2unix and then fix encoding
    sudo dos2unix "$CADDYFILE" 2>/dev/null || true
    # Try to fix encoding by reading and rewriting
    sudo python3 << 'PYTHON_SCRIPT'
import sys
with open('/root/arti-marketing-ops/caddy/Caddyfile.production', 'rb') as f:
    content = f.read()
    # Try to decode as UTF-16 and re-encode as UTF-8
    try:
        text = content.decode('utf-16-le')
        with open('/root/arti-marketing-ops/caddy/Caddyfile.production', 'w', encoding='utf-8') as out:
            out.write(text)
        print("Converted using Python")
    except:
        # If that fails, try UTF-8 with BOM
        try:
            text = content.decode('utf-8-sig')
            with open('/root/arti-marketing-ops/caddy/Caddyfile.production', 'w', encoding='utf-8') as out:
                out.write(text)
            print("Converted from UTF-8 with BOM")
        except:
            print("Could not convert - file might already be UTF-8")
            sys.exit(1)
PYTHON_SCRIPT
    echo "✅ Converted using Python"
else
    echo "❌ No conversion tool available (iconv or Python)"
    exit 1
fi

# Step 4: Convert CRLF to LF
echo ""
echo "Step 4: Converting CRLF to LF..."
sudo sed -i 's/\r$//' "$CADDYFILE"
echo "✅ Line endings fixed"

# Step 5: Verify encoding
echo ""
echo "Step 5: Verifying new encoding..."
file "$CADDYFILE"

# Step 6: Verify file content
echo ""
echo "Step 6: Verifying file content..."
head -5 "$CADDYFILE"
echo "..."
tail -5 "$CADDYFILE"

# Step 7: Verify port is 3001
echo ""
echo "Step 7: Verifying port is 3001..."
grep "reverse_proxy.*300" "$CADDYFILE" | head -3

# Step 8: Restart Caddy container
echo ""
echo "Step 8: Restarting Caddy container..."
docker restart supabase_caddy_arti-marketing-ops
sleep 5

# Check if it's running
if docker ps | grep -q supabase_caddy_arti-marketing-ops; then
    echo "✅ Caddy container is running"
    
    # Check logs for errors
    echo ""
    echo "Checking container logs for errors..."
    docker logs --tail 10 supabase_caddy_arti-marketing-ops 2>&1 | grep -i "error\|unrecognized" || echo "✅ No errors in logs!"
else
    echo "❌ Caddy container failed to start"
    echo "Logs:"
    docker logs --tail 20 supabase_caddy_arti-marketing-ops 2>&1
    exit 1
fi

# Step 9: Test external API
echo ""
echo "Step 9: Testing external API..."
sleep 5
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
    
    # Check CORS headers
    echo ""
    echo "Checking CORS headers..."
    curl -I -H "Origin: https://app.artistinfluence.com" \
      https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | grep -i "access-control" || echo "No CORS headers (API handles it)"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

