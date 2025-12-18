#!/bin/bash
# Direct fix: Add OPTIONS handling to Caddyfile using sed

set -e

echo "=========================================="
echo "Direct Fix: Add OPTIONS Handling to Caddyfile"
echo "=========================================="
echo ""

# Find Caddyfile location
CADDYFILE=""
if [ -f "/etc/caddy/Caddyfile" ]; then
    CADDYFILE="/etc/caddy/Caddyfile"
elif [ -f "/root/arti-marketing-ops/caddy/Caddyfile.production" ]; then
    CADDYFILE="/root/arti-marketing-ops/caddy/Caddyfile.production"
elif [ -f "./caddy/Caddyfile.production" ]; then
    CADDYFILE="./caddy/Caddyfile.production"
else
    echo "❌ Caddyfile not found in common locations"
    exit 1
fi

echo "Using Caddyfile: $CADDYFILE"

# Create backup
cp "$CADDYFILE" "$CADDYFILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Check if OPTIONS handling already exists
if grep -q "@api_options" "$CADDYFILE"; then
    echo "✅ OPTIONS handling already exists in Caddyfile"
    echo "Skipping insertion..."
else
    echo "Adding OPTIONS handling..."
    
    # Find the line with reverse_proxy for localhost:3001 in the api.artistinfluence.com block
    # We'll insert before that line
    
    # First, let's find which line has the reverse_proxy we need
    LINE_NUM=$(grep -n "reverse_proxy.*localhost:3001\|reverse_proxy.*127.0.0.1:3001" "$CADDYFILE" | head -1 | cut -d: -f1)
    
    if [ -z "$LINE_NUM" ]; then
        echo "❌ Could not find reverse_proxy line for port 3001"
        echo "Please check the Caddyfile manually"
        exit 1
    fi
    
    echo "Found reverse_proxy at line $LINE_NUM"
    
    # Get indentation from that line
    INDENT_LINE=$(sed -n "${LINE_NUM}p" "$CADDYFILE")
    INDENT=$(echo "$INDENT_LINE" | sed 's/[^ ].*//' | wc -c)
    INDENT=$((INDENT - 1))
    INDENT_STR=$(printf "%${INDENT}s" "")
    
    # Create the OPTIONS block with proper indentation
    OPTIONS_BLOCK="${INDENT_STR}# Handle CORS preflight (OPTIONS) requests for /api/* routes
${INDENT_STR}# This MUST come before the reverse_proxy to catch OPTIONS requests
${INDENT_STR}@api_options {
${INDENT_STR}    path /api/*
${INDENT_STR}    method OPTIONS
${INDENT_STR}}
${INDENT_STR}handle @api_options {
${INDENT_STR}    header Access-Control-Allow-Origin \"https://app.artistinfluence.com\"
${INDENT_STR}    header Access-Control-Allow-Methods \"GET, POST, PUT, DELETE, OPTIONS\"
${INDENT_STR}    header Access-Control-Allow-Headers \"Content-Type, Authorization, X-Requested-With, Cache-Control, X-User-Agent, x-supabase-api-version, x-client-info, apikey, x-supabase-auth-token\"
${INDENT_STR}    header Access-Control-Allow-Credentials \"true\"
${INDENT_STR}    header Access-Control-Max-Age \"86400\"
${INDENT_STR}    respond \"\" 204
${INDENT_STR}}
"

    # Insert before the reverse_proxy line
    # Use a temporary file
    TEMP_FILE=$(mktemp)
    
    # Copy lines before insertion point
    sed -n "1,$((LINE_NUM - 1))p" "$CADDYFILE" > "$TEMP_FILE"
    
    # Add OPTIONS block
    echo "$OPTIONS_BLOCK" >> "$TEMP_FILE"
    
    # Add empty line for spacing
    echo "" >> "$TEMP_FILE"
    
    # Copy remaining lines
    sed -n "${LINE_NUM},\$p" "$CADDYFILE" >> "$TEMP_FILE"
    
    # Replace original file
    mv "$TEMP_FILE" "$CADDYFILE"
    
    echo "✅ OPTIONS handling added at line $((LINE_NUM - 1))"
fi

# Validate Caddyfile
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
    echo "⚠️  Please validate manually: caddy validate --config $CADDYFILE"
fi

# Copy to /etc/caddy if different location
if [ "$CADDYFILE" != "/etc/caddy/Caddyfile" ] && [ -d "/etc/caddy" ]; then
    echo ""
    echo "Copying to /etc/caddy/Caddyfile..."
    sudo cp "$CADDYFILE" /etc/caddy/Caddyfile
    echo "✅ Copied to /etc/caddy/Caddyfile"
    CADDYFILE="/etc/caddy/Caddyfile"
fi

# Reload Caddy
echo ""
echo "Reloading Caddy..."
if systemctl is-active --quiet caddy 2>/dev/null; then
    sudo systemctl reload caddy
    echo "✅ Caddy reloaded via systemctl"
elif systemctl list-units --type=service | grep -q caddy; then
    sudo systemctl restart caddy
    echo "✅ Caddy restarted via systemctl"
elif docker ps 2>/dev/null | grep -q caddy; then
    CONTAINER=$(docker ps | grep caddy | awk '{print $1}' | head -1)
    if [ -n "$CONTAINER" ]; then
        docker restart "$CONTAINER"
        echo "✅ Caddy container restarted"
    else
        echo "⚠️  Caddy container found but couldn't restart"
    fi
else
    echo "⚠️  Caddy service not found. Please restart manually:"
    echo "   sudo systemctl reload caddy"
    echo "   OR"
    echo "   docker restart <caddy-container>"
fi

echo ""
echo "=========================================="
echo "✅ Fix applied!"
echo "=========================================="
echo ""
echo "Test with:"
echo "  curl -X OPTIONS https://api.artistinfluence.com/api/health \\"
echo "    -H 'Origin: https://app.artistinfluence.com' \\"
echo "    -H 'Access-Control-Request-Method: GET' \\"
echo "    -v"
echo ""
echo "You should see:"
echo "  < HTTP/1.1 204 No Content"
echo "  < Access-Control-Allow-Origin: https://app.artistinfluence.com"
echo ""

