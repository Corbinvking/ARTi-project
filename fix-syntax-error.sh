#!/bin/bash
# Quick fix for main.py syntax error

cd /opt/ratio-fixer

echo "Fixing syntax error in main.py..."

# Backup
cp main.py main.py.backup

# Use Python to fix it
python3 << 'FIX_SCRIPT'
import sys

with open('main.py', 'r') as f:
    lines = f.readlines()

new_lines = []
cors_added = False

for i, line in enumerate(lines):
    # Remove incorrectly placed CORS import
    if 'from flask_cors import CORS' in line and i < 20:
        print(f"Removing bad import at line {i+1}")
        continue
    
    new_lines.append(line)
    
    # Add CORS import in correct place
    if 'from flask_sqlalchemy import SQLAlchemy' in line and not cors_added:
        new_lines.append('from flask_cors import CORS\n')
        cors_added = True
        print(f"Added CORS import after line {i+1}")

content = ''.join(new_lines)

# Add CORS initialization if missing
if 'CORS(app' not in content:
    content = content.replace(
        'app = Flask(__name__, template_folder="templates")',
        'app = Flask(__name__, template_folder="templates")\nCORS(app, resources={r"/api/*": {"origins": "*"}})'
    )

with open('main.py', 'w') as f:
    f.write(content)

print("✅ Fixed main.py")
FIX_SCRIPT

# Verify syntax
echo ""
echo "Verifying syntax..."
source venv/bin/activate
python3 -m py_compile main.py && echo "✅ Syntax OK" || (echo "❌ Still has errors"; exit 1)

# Restart service
echo ""
echo "Restarting service..."
sudo systemctl restart ratio-fixer
sleep 3

if sudo systemctl is-active --quiet ratio-fixer; then
    echo "✅ Service running!"
    curl -s http://localhost:5000/healthz && echo ""
else
    echo "❌ Service failed - check logs:"
    sudo journalctl -u ratio-fixer -n 10 --no-pager
fi

