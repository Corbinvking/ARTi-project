#!/bin/bash

# Fix Spotify Scraper Setup Issues
echo "🔧 FIXING SPOTIFY SCRAPER SETUP"
echo "==============================="

cd /root/arti-marketing-ops

# Fix 1: Install missing Python packages
echo "🐍 Installing missing Python packages..."
apt update
apt install -y python3-venv python3-pip

# Fix 2: Recreate Python virtual environment
echo "📦 Creating Python virtual environment..."
cd spotify_scraper

# Remove failed venv if it exists
rm -rf venv

# Create new virtual environment
python3 -m venv venv

# Activate and install dependencies
source venv/bin/activate

# Install basic dependencies
pip install --upgrade pip

# Install scraper requirements
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Installing default dependencies..."
    pip install playwright beautifulsoup4 asyncio aiofiles
fi

# Install Playwright browsers
playwright install chromium

echo "✅ Python environment fixed"

# Fix 3: Ensure management script exists and is executable
echo "🔧 Creating management script..."
cd /root/arti-marketing-ops

cat > scripts/manage-scraper.sh << 'EOF'
#!/bin/bash

# Manage Spotify Scraper Service
SCRAPER_PATH="/root/arti-marketing-ops/spotify_scraper"

case "$1" in
    start)
        echo "🎵 Starting Spotify scraper environment..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        echo "✅ Scraper environment ready"
        echo "Python: $(python --version)"
        echo "Playwright: $(playwright --version || echo 'Not available')"
        ;;
    stop)
        echo "🛑 Stopping any running scraper processes..."
        pkill -f "python.*run_multi_scraper" || echo "No processes to stop"
        echo "✅ Scraper processes stopped"
        ;;
    status)
        echo "📊 Scraper Status:"
        echo "==================="
        if [ -d "$SCRAPER_PATH/venv" ]; then
            echo "Virtual environment: ✅ Available"
            cd "$SCRAPER_PATH"
            source venv/bin/activate
            echo "Python: $(python --version)"
            echo "Playwright: $(playwright --version 2>/dev/null || echo '❌ Not available')"
        else
            echo "Virtual environment: ❌ Missing"
        fi
        echo "Active jobs: $(pgrep -f "python.*run_multi_scraper" | wc -l)"
        echo "Data directory: $([ -d "$SCRAPER_PATH/data" ] && echo "✅ Available" || echo "❌ Missing")"
        ;;
    test)
        echo "🧪 Testing scraper setup..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        
        echo "Testing Python modules..."
        python -c "import sys; print(f'✅ Python {sys.version}')" || echo "❌ Python issue"
        python -c "import playwright; print('✅ Playwright available')" || echo "❌ Playwright not available"
        python -c "import json; print('✅ JSON available')" || echo "❌ JSON issue"
        python -c "import asyncio; print('✅ Asyncio available')" || echo "❌ Asyncio issue"
        
        echo "Testing file structure..."
        [ -f "run_multi_scraper_config.py" ] && echo "✅ Main scraper script found" || echo "❌ Main scraper script missing"
        [ -d "data" ] && echo "✅ Data directory found" || echo "❌ Data directory missing"
        
        echo "✅ Test complete"
        ;;
    clean)
        echo "🧹 Cleaning old scraper data..."
        find "$SCRAPER_PATH/data" -name "*.json" -mtime +7 -delete 2>/dev/null || echo "No old files to clean"
        echo "✅ Cleanup complete"
        ;;
    install)
        echo "🔧 Installing/reinstalling scraper dependencies..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        pip install --upgrade pip
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt
        else
            pip install playwright beautifulsoup4 asyncio aiofiles
        fi
        playwright install chromium
        echo "✅ Installation complete"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|test|clean|install}"
        echo ""
        echo "Commands:"
        echo "  start   - Activate scraper environment"
        echo "  stop    - Stop running scraper processes"
        echo "  status  - Show scraper status and health"
        echo "  test    - Run comprehensive tests"
        echo "  clean   - Remove old data files"
        echo "  install - Install/reinstall dependencies"
        exit 1
        ;;
esac
EOF

chmod +x scripts/manage-scraper.sh

echo "✅ Management script created"

# Fix 4: Update Docker Compose with environment variables
echo "🐳 Updating Docker Compose..."

# Check if the API service exists and add environment variables
if grep -q "api:" docker-compose.supabase-project.yml; then
    echo "Adding scraper environment variables to API service..."
    
    # Create a backup
    cp docker-compose.supabase-project.yml docker-compose.supabase-project.yml.backup
    
    # Add environment variables to API service
    sed -i '/api:/,/^  [a-zA-Z]/ {
        /environment:/,/^  [a-zA-Z]/ {
            /^  [a-zA-Z]/i\
      - SPOTIFY_SCRAPER_PATH=/root/arti-marketing-ops/spotify_scraper\
      - SPOTIFY_SCRAPER_OUTPUT_PATH=/root/arti-marketing-ops/spotify_scraper/data
        }
    }' docker-compose.supabase-project.yml
    
    echo "✅ Docker Compose updated"
else
    echo "⚠️  API service not found in docker-compose.supabase-project.yml"
fi

# Fix 5: Test everything
echo "🧪 Running comprehensive tests..."

./scripts/manage-scraper.sh status
./scripts/manage-scraper.sh test

# Fix 6: Try to restart backend API
echo "🔄 Restarting backend services..."

# Find the correct container name
API_CONTAINER=$(docker ps --format "table {{.Names}}" | grep -E "(api|backend)" | head -n1)

if [ ! -z "$API_CONTAINER" ]; then
    echo "Restarting container: $API_CONTAINER"
    docker restart "$API_CONTAINER"
    sleep 3
else
    echo "API container not found, restarting all services..."
    docker-compose -f docker-compose.supabase-project.yml restart
    sleep 5
fi

# Test API endpoint
echo "🌐 Testing API integration..."
API_HEALTH=$(curl -s http://localhost:3002/api/providers/spotify/health 2>/dev/null || echo "ERROR")

if [[ "$API_HEALTH" == *"health"* ]]; then
    echo "✅ API integration working"
    echo "Response: $API_HEALTH"
else
    echo "⚠️  API integration test failed"
    echo "Response: $API_HEALTH"
    echo "Checking if services are running..."
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(api|backend)"
fi

echo ""
echo "🎉 SCRAPER SETUP FIXES COMPLETE!"
echo "================================"
echo ""
echo "📊 Final Status:"
./scripts/manage-scraper.sh status

echo ""
echo "🔧 Next Steps:"
echo "• Test scraper: ./scripts/manage-scraper.sh test"
echo "• Check API: curl http://localhost:3002/api/providers/spotify/health"
echo "• Access frontend: https://app.artistinfluence.com/admin/integrations"
echo ""
EOF

chmod +x scripts/fix-scraper-setup.sh
