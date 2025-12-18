#!/bin/bash
# Fix Caddyfile: Move OPTIONS handler BEFORE reverse_proxy

set -e

echo "=========================================="
echo "Fixing Caddyfile: Moving OPTIONS Handler"
echo "=========================================="
echo ""

CADDYFILE="/etc/caddy/Caddyfile"

if [ ! -f "$CADDYFILE" ]; then
    echo "❌ Caddyfile not found at $CADDYFILE"
    exit 1
fi

# Create backup
cp "$CADDYFILE" "$CADDYFILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Check if we're in the api.artistinfluence.com block
if ! grep -q "api.artistinfluence.com" "$CADDYFILE"; then
    echo "❌ api.artistinfluence.com block not found"
    exit 1
fi

# Find the reverse_proxy line for port 3001
REVERSE_PROXY_LINE=$(grep -n "reverse_proxy.*3001\|reverse_proxy.*127.0.0.1:3001" "$CADDYFILE" | head -1 | cut -d: -f1)

if [ -z "$REVERSE_PROXY_LINE" ]; then
    echo "❌ Could not find reverse_proxy line for port 3001"
    exit 1
fi

echo "Found reverse_proxy at line $REVERSE_PROXY_LINE"

# Check if OPTIONS handler exists
if ! grep -q "@api_options" "$CADDYFILE"; then
    echo "❌ OPTIONS handler not found. Run fix-caddy-options-direct.sh first."
    exit 1
fi

# Find OPTIONS handler block (start and end lines)
OPTIONS_START=$(grep -n "@api_options" "$CADDYFILE" | head -1 | cut -d: -f1)
OPTIONS_END=$(awk "NR>=$OPTIONS_START && /^[[:space:]]*reverse_proxy/ {print NR-1; exit}" "$CADDYFILE")

if [ -z "$OPTIONS_END" ]; then
    # Find the end of the handle block (next non-indented line or closing brace)
    OPTIONS_END=$(awk "NR>=$OPTIONS_START && /^[^[:space:]]/ && !/@api_options/ {print NR-1; exit}" "$CADDYFILE")
fi

if [ -z "$OPTIONS_END" ]; then
    # Fallback: count lines in the handle block (usually 12-15 lines)
    OPTIONS_END=$((OPTIONS_START + 14))
fi

echo "Found OPTIONS handler from line $OPTIONS_START to $OPTIONS_END"

# Check if OPTIONS is already before reverse_proxy
if [ "$OPTIONS_START" -lt "$REVERSE_PROXY_LINE" ]; then
    echo "✅ OPTIONS handler is already before reverse_proxy"
    echo "Checking if Caddyfile is valid..."
    
    if command -v caddy &> /dev/null; then
        if caddy validate --config "$CADDYFILE" 2>&1; then
            echo "✅ Caddyfile is valid"
            exit 0
        else
            echo "❌ Caddyfile validation failed"
            exit 1
        fi
    fi
    exit 0
fi

echo "Moving OPTIONS handler before reverse_proxy..."

# Get indentation from reverse_proxy line
INDENT_LINE=$(sed -n "${REVERSE_PROXY_LINE}p" "$CADDYFILE")
INDENT=$(echo "$INDENT_LINE" | sed 's/[^ ].*//' | wc -c)
INDENT=$((INDENT - 1))
INDENT_STR=$(printf "%${INDENT}s" "")

# Extract OPTIONS block
OPTIONS_BLOCK=$(sed -n "${OPTIONS_START},${OPTIONS_END}p" "$CADDYFILE")

# Create temp file
TEMP_FILE=$(mktemp)

# Copy everything before reverse_proxy (excluding OPTIONS block)
sed -n "1,$((REVERSE_PROXY_LINE - 1))p" "$CADDYFILE" | grep -v "@api_options" | grep -v "handle @api_options" | grep -v "header Access-Control" | grep -v "respond \"\" 204" | grep -v "^[[:space:]]*}$" > "$TEMP_FILE" || true

# Add OPTIONS block with proper indentation
echo "" >> "$TEMP_FILE"
echo "$OPTIONS_BLOCK" | sed "s/^/${INDENT_STR}/" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Add reverse_proxy and everything after
sed -n "${REVERSE_PROXY_LINE},\$p" "$CADDYFILE" >> "$TEMP_FILE"

# Replace original
mv "$TEMP_FILE" "$CADDYFILE"

echo "✅ OPTIONS handler moved before reverse_proxy"

# Validate
echo ""
echo "Validating Caddyfile..."
if command -v caddy &> /dev/null; then
    if caddy validate --config "$CADDYFILE" 2>&1; then
        echo "✅ Caddyfile is valid"
    else
        echo "❌ Caddyfile validation failed!"
        echo "Restoring backup..."
        LATEST_BACKUP=$(ls -t "$CADDYFILE.backup."* 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            cp "$LATEST_BACKUP" "$CADDYFILE"
            echo "✅ Backup restored"
        fi
        exit 1
    fi
else
    echo "⚠️  Caddy not in PATH, skipping validation"
fi

# Reload Caddy
echo ""
echo "Reloading Caddy..."
if systemctl is-active --quiet caddy 2>/dev/null; then
    sudo systemctl reload caddy
    echo "✅ Caddy reloaded"
elif docker ps 2>/dev/null | grep -q caddy; then
    CONTAINER=$(docker ps | grep caddy | awk '{print $1}' | head -1)
    if [ -n "$CONTAINER" ]; then
        docker restart "$CONTAINER"
        echo "✅ Caddy container restarted"
    fi
fi

echo ""
echo "=========================================="
echo "✅ Fix complete!"
echo "=========================================="
echo ""
echo "Test with:"
echo "  curl -X OPTIONS https://api.artistinfluence.com/api/health \\"
echo "    -H 'Origin: https://app.artistinfluence.com' \\"
echo "    -H 'Access-Control-Request-Method: GET' \\"
echo "    -i"
echo ""

