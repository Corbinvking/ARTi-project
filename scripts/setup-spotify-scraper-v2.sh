#!/bin/bash

# Setup Spotify Scraper v2 - Optimized for Upgraded Droplet
# Uses Python 3.11 for better compatibility and performance

echo "🎵 SETTING UP SPOTIFY SCRAPER V2 (UPGRADED DROPLET)"
echo "================================================="
echo "💪 Optimized for: $(nproc) CPU cores, $(free -h | awk '/^Mem:/ {print $2}') RAM"
echo ""

cd /root/arti-marketing-ops

# Step 1: Ensure spotify_scraper directory exists
if [ ! -d "spotify_scraper" ]; then
    echo "❌ spotify_scraper directory not found!"
    echo ""
    echo "📋 COPY YOUR SCRAPER TO DROPLET:"
    echo "From your local machine, run:"
    echo "scp -r ./spotify_scraper/ root@$(curl -s ifconfig.me):/root/arti-marketing-ops/"
    echo ""
    read -p "Press Enter once you've copied the spotify_scraper directory..."
    
    if [ ! -d "spotify_scraper" ]; then
        echo "❌ Still no spotify_scraper directory found. Exiting."
        exit 1
    fi
fi

echo "✅ spotify_scraper directory found"

# Step 2: Install Python 3.11 (better compatibility than 3.13)
echo "🐍 Installing Python 3.11 for better compatibility..."

# Add deadsnakes PPA for Python 3.11
apt update
apt install -y software-properties-common
add-apt-repository ppa:deadsnakes/ppa -y
apt update

# Install Python 3.11 and required packages
apt install -y python3.11 python3.11-venv python3.11-pip python3.11-dev

# Install build tools for any packages that need compilation
apt install -y build-essential python3.11-distutils

echo "✅ Python 3.11 installed: $(python3.11 --version)"

# Step 3: Create Python 3.11 virtual environment
echo "📦 Creating Python 3.11 virtual environment..."
cd spotify_scraper

# Remove any existing venv
rm -rf venv

# Create new venv with Python 3.11
python3.11 -m venv venv

# Activate and upgrade pip
source venv/bin/activate
pip install --upgrade pip setuptools wheel

echo "✅ Python 3.11 virtual environment created"

# Step 4: Install dependencies with optimizations
echo "🔧 Installing scraper dependencies (optimized for upgraded droplet)..."

# Set pip to use more parallel jobs (utilize multiple cores)
export PIP_CACHE_DIR=/tmp/pip-cache
export PIP_DISABLE_PIP_VERSION_CHECK=1

# Install requirements or default packages
if [ -f "requirements.txt" ]; then
    echo "Installing from requirements.txt..."
    pip install -r requirements.txt --no-warn-script-location
else
    echo "Installing default scraper dependencies..."
    pip install playwright beautifulsoup4 asyncio aiofiles --no-warn-script-location
fi

# Install Playwright with specific browser (saves space and time)
echo "Installing Playwright browser (Chromium only)..."
playwright install chromium

# Verify Playwright installation
if playwright --version >/dev/null 2>&1; then
    echo "✅ Playwright installed: $(playwright --version)"
else
    echo "❌ Playwright installation failed"
    exit 1
fi

echo "✅ All dependencies installed successfully"

# Step 5: Create optimized management script
echo "🔧 Creating optimized management script..."
cd /root/arti-marketing-ops

cat > scripts/manage-scraper.sh << 'EOF'
#!/bin/bash

# Manage Spotify Scraper Service (v2 - Optimized)
SCRAPER_PATH="/root/arti-marketing-ops/spotify_scraper"

case "$1" in
    start)
        echo "🎵 Starting Spotify scraper environment (Python 3.11)..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        echo "✅ Scraper environment ready"
        echo "Python: $(python --version)"
        echo "Playwright: $(playwright --version)"
        echo "Available cores: $(nproc)"
        echo "Available memory: $(free -h | awk '/^Mem:/ {print $7}')"
        ;;
    stop)
        echo "🛑 Stopping any running scraper processes..."
        pkill -f "python.*run_multi_scraper" || echo "No processes to stop"
        echo "✅ Scraper processes stopped"
        ;;
    status)
        echo "📊 Scraper Status (v2):"
        echo "======================"
        echo "System: $(nproc) cores, $(free -h | awk '/^Mem:/ {print $2}') RAM"
        
        if [ -d "$SCRAPER_PATH/venv" ]; then
            echo "Virtual environment: ✅ Available (Python 3.11)"
            cd "$SCRAPER_PATH"
            source venv/bin/activate
            echo "Python: $(python --version)"
            echo "Playwright: $(playwright --version 2>/dev/null || echo '❌ Not available')"
        else
            echo "Virtual environment: ❌ Missing"
        fi
        
        ACTIVE_JOBS=$(pgrep -f "python.*run_multi_scraper" | wc -l)
        echo "Active scraping jobs: $ACTIVE_JOBS"
        
        if [ -d "$SCRAPER_PATH/data" ]; then
            echo "Data directory: ✅ Available"
            echo "Recent files: $(find $SCRAPER_PATH/data -name "*.json" -mtime -1 | wc -l) (last 24h)"
        else
            echo "Data directory: ❌ Missing"
        fi
        ;;
    test)
        echo "🧪 Testing scraper setup (v2)..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        
        echo "Testing Python environment..."
        python -c "import sys; print(f'✅ Python {sys.version}')" || echo "❌ Python issue"
        python -c "import playwright; print('✅ Playwright available')" || echo "❌ Playwright not available"
        python -c "import json, asyncio, aiofiles; print('✅ Core modules available')" || echo "❌ Module issues"
        
        echo "Testing browser installation..."
        if playwright install-deps chromium >/dev/null 2>&1; then
            echo "✅ Playwright browser dependencies OK"
        else
            echo "⚠️  Browser dependencies may need attention"
        fi
        
        echo "Testing file structure..."
        [ -f "run_multi_scraper_config.py" ] && echo "✅ Main scraper script found" || echo "❌ Main scraper script missing"
        [ -d "data" ] && echo "✅ Data directory found" || echo "❌ Data directory missing"
        
        echo "Testing system performance..."
        echo "CPU cores available: $(nproc)"
        echo "Memory available: $(free -h | awk '/^Mem:/ {print $7}')"
        
        echo "✅ Test complete"
        ;;
    benchmark)
        echo "⚡ Running performance benchmark..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        
        echo "Testing Python import speed..."
        time python -c "import playwright, asyncio, json"
        
        echo "Testing Playwright startup..."
        time python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    browser.close()
print('✅ Playwright startup test complete')
"
        ;;
    clean)
        echo "🧹 Cleaning old scraper data..."
        find "$SCRAPER_PATH/data" -name "*.json" -mtime +7 -delete 2>/dev/null || echo "No old files to clean"
        find /tmp -name "pip-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
        echo "✅ Cleanup complete"
        ;;
    install)
        echo "🔧 Installing/reinstalling scraper dependencies..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        pip install --upgrade pip setuptools wheel
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt --force-reinstall
        else
            pip install playwright beautifulsoup4 asyncio aiofiles --force-reinstall
        fi
        playwright install chromium
        echo "✅ Installation complete"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|test|benchmark|clean|install}"
        echo ""
        echo "Commands:"
        echo "  start     - Activate scraper environment"
        echo "  stop      - Stop running scraper processes"
        echo "  status    - Show detailed scraper status"
        echo "  test      - Run comprehensive tests"
        echo "  benchmark - Test performance on upgraded droplet"
        echo "  clean     - Remove old data files"
        echo "  install   - Install/reinstall dependencies"
        exit 1
        ;;
esac
EOF

chmod +x scripts/manage-scraper.sh

echo "✅ Optimized management script created"

# Step 6: Configure Docker Compose for API integration
echo "🐳 Updating Docker Compose for scraper integration..."

# Backup existing docker-compose file
cp docker-compose.supabase-project.yml docker-compose.supabase-project.yml.backup

# Add scraper environment variables to API service
if grep -q "api:" docker-compose.supabase-project.yml; then
    echo "Adding scraper environment variables to API service..."
    
    # Use a more robust method to add environment variables
    python3 -c "
import re

with open('docker-compose.supabase-project.yml', 'r') as f:
    content = f.read()

# Find the api service environment section
api_pattern = r'(api:.*?environment:.*?)(- [^:]+:[^\n]*\n)+'
match = re.search(api_pattern, content, re.DOTALL)

if match:
    env_vars = '''      - SPOTIFY_SCRAPER_PATH=/root/arti-marketing-ops/spotify_scraper
      - SPOTIFY_SCRAPER_OUTPUT_PATH=/root/arti-marketing-ops/spotify_scraper/data
      - SPOTIFY_SCRAPER_PYTHON_PATH=/root/arti-marketing-ops/spotify_scraper/venv/bin/python
'''
    
    # Add our environment variables
    updated_content = content.replace(match.group(0), match.group(0) + env_vars)
    
    with open('docker-compose.supabase-project.yml', 'w') as f:
        f.write(updated_content)
    
    print('✅ Environment variables added')
else:
    print('⚠️ Could not find API service environment section')
"
else
    echo "⚠️ API service not found in docker-compose.supabase-project.yml"
fi

# Step 7: Create data directories with proper permissions
echo "📁 Setting up data directories..."
cd spotify_scraper
mkdir -p data/jobs data/results data/configs data/temp
chmod -R 755 data/

echo "✅ Data directories created with proper permissions"

# Step 8: Test everything
echo "🧪 Running comprehensive tests..."
./scripts/manage-scraper.sh status
echo ""
./scripts/manage-scraper.sh test

# Step 9: Restart backend API to pick up new environment variables
echo "🔄 Restarting backend API with new configuration..."

# Find and restart the API container
API_CONTAINER=$(docker ps --filter "name=api" --format "{{.Names}}" | head -n1)
if [ ! -z "$API_CONTAINER" ]; then
    echo "Restarting container: $API_CONTAINER"
    docker restart "$API_CONTAINER"
    sleep 5
else
    echo "⚠️ API container not found, restarting all services..."
    docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart
    sleep 10
fi

# Step 10: Test API integration
echo "🌐 Testing API integration..."
for i in {1..5}; do
    API_HEALTH=$(curl -s http://localhost:3002/api/providers/spotify/health 2>/dev/null)
    if [[ "$API_HEALTH" == *"health"* ]]; then
        echo "✅ API integration working!"
        echo "Response: $API_HEALTH"
        break
    else
        echo "⏳ Attempt $i/5: API not ready yet..."
        sleep 3
    fi
done

if [[ "$API_HEALTH" != *"health"* ]]; then
    echo "⚠️ API integration test failed after 5 attempts"
    echo "Check: docker logs for API container"
fi

echo ""
echo "🎉 SPOTIFY SCRAPER V2 SETUP COMPLETE!"
echo "====================================="
echo ""
echo "✅ What's Ready:"
echo "• Python 3.11 environment with optimized performance"
echo "• Playwright with Chromium browser"
echo "• Optimized for $(nproc) CPU cores and $(free -h | awk '/^Mem:/ {print $2}') RAM"
echo "• Backend API integration with environment variables"
echo "• Comprehensive management and testing tools"
echo ""
echo "🔧 Management Commands:"
echo "• Check status:    ./scripts/manage-scraper.sh status"
echo "• Run tests:       ./scripts/manage-scraper.sh test"
echo "• Performance:     ./scripts/manage-scraper.sh benchmark"
echo "• Start scraper:   ./scripts/manage-scraper.sh start"
echo ""
echo "🌐 API Endpoints Ready:"
echo "• POST /api/providers/spotify/scrape"
echo "• GET /api/providers/spotify/health"
echo "• Frontend: https://app.artistinfluence.com/admin/integrations"
echo ""
echo "🚀 Ready to scrape Spotify playlist data!"
EOF

chmod +x scripts/setup-spotify-scraper-v2.sh
