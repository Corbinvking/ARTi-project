#!/bin/bash
# Fix the syntax error in main.py caused by incorrect CORS import placement

set -e

echo "=========================================="
echo "Fixing main.py Syntax Error"
echo "=========================================="
echo ""

cd /opt/ratio-fixer

# Backup main.py
cp main.py main.py.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Created backup: main.py.backup.$(date +%Y%m%d_%H%M%S)"

# Check if the error exists
if grep -q "from flask_cors import CORS" main.py; then
    echo "Found CORS import - checking placement..."
    
    # Read the file and fix it
    python3 << 'PYTHON_FIX'
import re

with open('main.py', 'r') as f:
    content = f.read()

# Remove the incorrectly placed CORS import (if it's on its own line after flask import)
# Pattern: after the flask import closing paren, there might be a CORS import
lines = content.split('\n')
new_lines = []
skip_next = False
cors_import_found = False

for i, line in enumerate(lines):
    # Skip the incorrectly placed CORS import
    if 'from flask_cors import CORS' in line and i < 20:
        print(f"Removing incorrectly placed CORS import at line {i+1}")
        cors_import_found = True
        continue
    
    new_lines.append(line)

# Add CORS import in the correct place (after all flask imports, around line 17-18)
if cors_import_found:
    # Find where to insert it (after flask_sqlalchemy import)
    for i, line in enumerate(new_lines):
        if 'from flask_sqlalchemy import SQLAlchemy' in line:
            new_lines.insert(i + 1, 'from flask_cors import CORS')
            print(f"Added CORS import after line {i+1}")
            break

# Fix CORS initialization - make sure it's after app = Flask line
content = '\n'.join(new_lines)

# Check if CORS is initialized
if 'CORS(app' not in content:
    # Add CORS initialization after app = Flask
    content = content.replace(
        'app = Flask(__name__, template_folder="templates")',
        'app = Flask(__name__, template_folder="templates")\nCORS(app, resources={r"/api/*": {"origins": "*"}})'
    )
    print("Added CORS initialization")

# Write back
with open('main.py', 'w') as f:
    f.write(content)

print("✅ Fixed main.py")
PYTHON_FIX

else
    echo "CORS import not found - may need to add it"
fi

# Verify syntax
echo ""
echo "Verifying Python syntax..."
source venv/bin/activate
if python3 -m py_compile main.py 2>&1; then
    echo "✅ Python syntax is now correct!"
else
    echo "❌ Still has syntax errors:"
    python3 -m py_compile main.py
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ main.py Fixed!"
echo "=========================================="
echo ""
echo "Restarting service..."
sudo systemctl restart ratio-fixer
sleep 3

if sudo systemctl is-active --quiet ratio-fixer; then
    echo "✅ Service is now running!"
    curl -s http://localhost:5000/healthz && echo "" || echo "Health check pending..."
else
    echo "❌ Service still not running - check logs:"
    sudo journalctl -u ratio-fixer -n 20 --no-pager
fi

