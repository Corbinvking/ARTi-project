#!/bin/bash
# Debug script to check .env file status

echo "=========================================="
echo "  Debugging .env File"
echo "=========================================="
echo ""

ENV_FILE="/root/arti-marketing-ops/spotify_scraper/.env"

echo "[1] Checking if .env exists..."
if [ -f "$ENV_FILE" ]; then
    echo "✅ File exists: $ENV_FILE"
else
    echo "❌ File NOT found: $ENV_FILE"
    exit 1
fi

echo ""
echo "[2] File permissions:"
ls -la "$ENV_FILE"

echo ""
echo "[3] File contents (masked passwords):"
cat "$ENV_FILE" | sed 's/PASSWORD=.*/PASSWORD=***MASKED***/g'

echo ""
echo "[4] Testing Python dotenv loading:"
python3 << 'PYEOF'
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path('/root/arti-marketing-ops/spotify_scraper/.env')
print(f"Loading from: {env_path}")
print(f"File exists: {env_path.exists()}")

load_dotenv(env_path)

email = os.getenv('SPOTIFY_EMAIL')
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print(f"\nLoaded variables:")
print(f"  SPOTIFY_EMAIL: {email}")
print(f"  SUPABASE_URL: {url}")
print(f"  SUPABASE_SERVICE_ROLE_KEY: {'SET' if key else 'NOT SET'} ({len(key) if key else 0} chars)")
PYEOF

echo ""
echo "=========================================="
echo "  Debug Complete"
echo "=========================================="

