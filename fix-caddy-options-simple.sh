#!/bin/bash
# Simple fix: Add OPTIONS handling to Caddyfile for /api/* routes

set -e

echo "=========================================="
echo "Quick Fix: Add OPTIONS Handling to Caddyfile"
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
    echo "❌ Caddyfile not found. Please specify the path:"
    read -p "Caddyfile path: " CADDYFILE
fi

if [ ! -f "$CADDYFILE" ]; then
    echo "❌ File not found: $CADDYFILE"
    exit 1
fi

echo "Using Caddyfile: $CADDYFILE"

# Create backup
cp "$CADDYFILE" "$CADDYFILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Check if OPTIONS handling already exists
if grep -q "@api_options" "$CADDYFILE"; then
    echo "⚠️  OPTIONS handling already exists in Caddyfile"
    echo "Checking if it's in the right place..."
    
    # Check if it's before reverse_proxy
    if grep -A 10 "@api_options" "$CADDYFILE" | grep -q "reverse_proxy"; then
        echo "✅ OPTIONS handling is correctly placed"
        exit 0
    else
        echo "⚠️  OPTIONS handling exists but may not be in correct location"
    fi
fi

# Find the line with "reverse_proxy localhost:3001" in the api.artistinfluence.com block
# We need to insert OPTIONS handling BEFORE this line

# Create temp file
TEMP_FILE=$(mktemp)

# Read the file and insert OPTIONS handling
python3 << 'PYTHON_SCRIPT' "$CADDYFILE" "$TEMP_FILE"
import sys
import re

input_file = sys.argv[1]
output_file = sys.argv[2]

with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Check if we're in the api.artistinfluence.com block
lines = content.split('\n')
in_api_block = False
inserted = False
output_lines = []

for i, line in enumerate(lines):
    # Track if we're in the api.artistinfluence.com block
    if 'api.artistinfluence.com' in line and '{' in line:
        in_api_block = True
    
    # Check if we've left the block
    if in_api_block and line.strip() == '}' and i > 0:
        # Check if previous non-empty line was not part of a multi-line construct
        prev_non_empty = None
        for j in range(i-1, -1, -1):
            if lines[j].strip():
                prev_non_empty = lines[j]
                break
        
        if prev_non_empty and 'reverse_proxy localhost:3001' not in prev_non_empty:
            in_api_block = False
    
    # Insert OPTIONS handling before reverse_proxy localhost:3001
    if (in_api_block and 
        not inserted and 
        'reverse_proxy localhost:3001' in line and
        'handle /storage/*' not in '\n'.join(lines[max(0, i-20):i])):
        
        # Find indentation of current line
        indent = len(line) - len(line.lstrip())
        indent_str = ' ' * indent
        
        # Insert OPTIONS handling
        output_lines.append('')
        output_lines.append(f'{indent_str}# Handle CORS preflight (OPTIONS) requests for /api/* routes')
        output_lines.append(f'{indent_str}# This MUST come before the reverse_proxy to catch OPTIONS requests')
        output_lines.append(f'{indent_str}@api_options {{')
        output_lines.append(f'{indent_str}    path /api/*')
        output_lines.append(f'{indent_str}    method OPTIONS')
        output_lines.append(f'{indent_str}}}')
        output_lines.append(f'{indent_str}handle @api_options {{')
        output_lines.append(f'{indent_str}    header Access-Control-Allow-Origin "https://app.artistinfluence.com"')
        output_lines.append(f'{indent_str}    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"')
        output_lines.append(f'{indent_str}    header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Cache-Control, X-User-Agent, x-supabase-api-version, x-client-info, apikey, x-supabase-auth-token"')
        output_lines.append(f'{indent_str}    header Access-Control-Allow-Credentials "true"')
        output_lines.append(f'{indent_str}    header Access-Control-Max-Age "86400"')
        output_lines.append(f'{indent_str}    respond "" 204')
        output_lines.append(f'{indent_str}}}')
        output_lines.append('')
        inserted = True
    
    output_lines.append(line)

# If we didn't find the right place, try a simpler approach
if not inserted:
    output_lines = []
    in_api_block = False
    found_storage = False
    
    for i, line in enumerate(lines):
        if 'api.artistinfluence.com' in line and '{' in line:
            in_api_block = True
        
        if in_api_block and 'handle /storage/*' in line:
            found_storage = True
        
        # After storage block, before reverse_proxy
        if (in_api_block and 
            found_storage and 
            not inserted and
            'reverse_proxy localhost:3001' in line):
            
            indent = len(line) - len(line.lstrip())
            indent_str = ' ' * indent
            
            output_lines.append('')
            output_lines.append(f'{indent_str}# Handle CORS preflight (OPTIONS) requests for /api/* routes')
            output_lines.append(f'{indent_str}@api_options {{')
            output_lines.append(f'{indent_str}    path /api/*')
            output_lines.append(f'{indent_str}    method OPTIONS')
            output_lines.append(f'{indent_str}}}')
            output_lines.append(f'{indent_str}handle @api_options {{')
            output_lines.append(f'{indent_str}    header Access-Control-Allow-Origin "https://app.artistinfluence.com"')
            output_lines.append(f'{indent_str}    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"')
            output_lines.append(f'{indent_str}    header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Cache-Control, X-User-Agent, x-supabase-api-version, x-client-info, apikey, x-supabase-auth-token"')
            output_lines.append(f'{indent_str}    header Access-Control-Allow-Credentials "true"')
            output_lines.append(f'{indent_str}    header Access-Control-Max-Age "86400"')
            output_lines.append(f'{indent_str}    respond "" 204')
            output_lines.append(f'{indent_str}}}')
            output_lines.append('')
            inserted = True
        
        output_lines.append(line)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

if inserted:
    print("SUCCESS")
else:
    print("FAILED")
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -ne 0 ]; then
    echo "❌ Failed to insert OPTIONS handling"
    echo "Trying manual sed approach..."
    
    # Fallback: Use sed to insert before reverse_proxy line
    sed -i '/reverse_proxy localhost:3001/i\
    # Handle CORS preflight (OPTIONS) requests for /api/* routes\
    @api_options {\
        path /api/*\
        method OPTIONS\
    }\
    handle @api_options {\
        header Access-Control-Allow-Origin "https://app.artistinfluence.com"\
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"\
        header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Cache-Control, X-User-Agent, x-supabase-api-version, x-client-info, apikey, x-supabase-auth-token"\
        header Access-Control-Allow-Credentials "true"\
        header Access-Control-Max-Age "86400"\
        respond "" 204\
    }\
' "$CADDYFILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ OPTIONS handling added using sed"
    else
        echo "❌ Both methods failed. Please edit manually."
        exit 1
    fi
else
    mv "$TEMP_FILE" "$CADDYFILE"
    echo "✅ OPTIONS handling added"
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
        cp "$CADDYFILE.backup."* "$CADDYFILE" 2>/dev/null || true
        exit 1
    fi
else
    echo "⚠️  Caddy not in PATH, skipping validation"
fi

# Copy to /etc/caddy if different location
if [ "$CADDYFILE" != "/etc/caddy/Caddyfile" ] && [ -d "/etc/caddy" ]; then
    echo ""
    echo "Copying to /etc/caddy/Caddyfile..."
    sudo cp "$CADDYFILE" /etc/caddy/Caddyfile
    echo "✅ Copied to /etc/caddy/Caddyfile"
fi

# Reload Caddy
echo ""
echo "Reloading Caddy..."
if systemctl is-active --quiet caddy; then
    sudo systemctl reload caddy
    echo "✅ Caddy reloaded"
elif docker ps | grep -q caddy; then
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

