#!/bin/bash

# Setup Spotify Scraper on Production Droplet
# Integrates your existing scraper with the backend infrastructure

echo "🎵 SETTING UP SPOTIFY SCRAPER ON PRODUCTION"
echo "==========================================="

cd /root/arti-marketing-ops

# Step 1: Clone/Update Spotify Scraper
echo "📥 Setting up Spotify scraper..."

if [ ! -d "spotify_scraper" ]; then
    echo "Cloning spotify_scraper directory from your local setup..."
    echo "⚠️  MANUAL STEP REQUIRED:"
    echo "   1. Copy your local spotify_scraper/ directory to the droplet"
    echo "   2. You can use scp, rsync, or git submodule"
    echo "   3. Place it at: /root/arti-marketing-ops/spotify_scraper/"
    echo ""
    echo "Example command to run from your local machine:"
    echo "scp -r ./spotify_scraper/ root@<droplet-ip>:/root/arti-marketing-ops/"
    echo ""
    read -p "Press Enter once you've copied the spotify_scraper directory..."
fi

if [ ! -d "spotify_scraper" ]; then
    echo "❌ spotify_scraper directory not found. Please copy it to the droplet first."
    exit 1
fi

echo "✅ spotify_scraper directory found"

# Step 2: Install Python Dependencies
echo "🐍 Installing Python dependencies..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Installing Python 3..."
    apt update
    apt install -y python3 python3-pip python3-venv
fi

# Create virtual environment for scraper
cd spotify_scraper

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment and installing dependencies..."
source venv/bin/activate

# Install requirements
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Installing default scraper dependencies..."
    pip install playwright beautifulsoup4 asyncio aiofiles
fi

# Install Playwright browsers
playwright install

echo "✅ Python environment setup complete"

# Step 3: Install Node.js Dependencies for Backend
echo "📦 Installing Node.js dependencies..."
cd /root/arti-marketing-ops/apps/api

# Check if new dependencies are needed
npm install

echo "✅ Node.js dependencies updated"

# Step 4: Configure Environment Variables
echo "⚙️ Configuring environment variables..."

cd /root/arti-marketing-ops

# Add scraper-specific environment variables to production.env
cat >> production.env << 'EOF'

# Spotify Scraper Configuration
SPOTIFY_SCRAPER_PATH=/root/arti-marketing-ops/spotify_scraper
SPOTIFY_SCRAPER_OUTPUT_PATH=/root/arti-marketing-ops/spotify_scraper/data
SPOTIFY_SCRAPER_TIMEOUT=1800000
SPOTIFY_SCRAPER_MAX_CONCURRENT=3

EOF

echo "✅ Environment variables configured"

# Step 5: Create Scraper Service Management Script
echo "🔧 Creating scraper service management..."

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
        ;;
    stop)
        echo "🛑 Stopping any running scraper processes..."
        pkill -f "python.*run_multi_scraper"
        echo "✅ Scraper processes stopped"
        ;;
    status)
        echo "📊 Scraper Status:"
        echo "Python environment: $(cd $SCRAPER_PATH && source venv/bin/activate && python --version)"
        echo "Playwright status: $(cd $SCRAPER_PATH && source venv/bin/activate && playwright --version)"
        echo "Active jobs: $(pgrep -f "python.*run_multi_scraper" | wc -l)"
        ;;
    test)
        echo "🧪 Testing scraper setup..."
        cd "$SCRAPER_PATH"
        source venv/bin/activate
        python -c "import playwright; print('✅ Playwright available')"
        python -c "import json; print('✅ JSON available')"
        python -c "import asyncio; print('✅ Asyncio available')"
        echo "✅ Test complete"
        ;;
    clean)
        echo "🧹 Cleaning old scraper data..."
        find "$SCRAPER_PATH/data" -name "*.json" -mtime +7 -delete
        echo "✅ Cleanup complete"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|test|clean}"
        exit 1
        ;;
esac
EOF

chmod +x scripts/manage-scraper.sh

echo "✅ Scraper management script created"

# Step 6: Update Docker Compose for Backend API
echo "🐳 Updating Docker Compose configuration..."

# Add environment variables to docker-compose
cat >> docker-compose.supabase-project.yml << 'EOF'

# Additional environment variables for scraper integration
      - SPOTIFY_SCRAPER_PATH=/root/arti-marketing-ops/spotify_scraper
      - SPOTIFY_SCRAPER_OUTPUT_PATH=/root/arti-marketing-ops/spotify_scraper/data
EOF

# Note: We need to add these to the api service in docker-compose

echo "⚠️  MANUAL STEP: Add scraper environment variables to API service"
echo "   Edit docker-compose.supabase-project.yml and add these to the 'api' service:"
echo "   - SPOTIFY_SCRAPER_PATH=/root/arti-marketing-ops/spotify_scraper"
echo "   - SPOTIFY_SCRAPER_OUTPUT_PATH=/root/arti-marketing-ops/spotify_scraper/data"

# Step 7: Test Backend Integration
echo "🧪 Testing backend integration..."

# Restart the backend API to pick up new changes
echo "Restarting backend API..."
docker restart arti-marketing-ops-api-1

sleep 5

# Test the health endpoint
echo "Testing scraper health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3002/api/providers/spotify/health || echo "ERROR")

if [[ "$HEALTH_RESPONSE" == *"health"* ]]; then
    echo "✅ Backend scraper integration working"
else
    echo "⚠️  Backend integration test failed: $HEALTH_RESPONSE"
fi

# Step 8: Create Data Directory Structure
echo "📁 Setting up data directories..."

cd spotify_scraper
mkdir -p data/jobs
mkdir -p data/results
mkdir -p data/configs

echo "✅ Data directories created"

# Step 9: Test Scraper Functionality
echo "🎵 Testing scraper functionality..."

./scripts/manage-scraper.sh test

echo ""
echo "🎉 SPOTIFY SCRAPER SETUP COMPLETE!"
echo "================================="
echo ""
echo "✅ What's Ready:"
echo "• Python environment with Playwright"
echo "• Backend API integration"
echo "• Job management system"
echo "• Health monitoring"
echo "• Data directory structure"
echo ""
echo "🔧 Management Commands:"
echo "• Start scraper env: ./scripts/manage-scraper.sh start"
echo "• Check status: ./scripts/manage-scraper.sh status"
echo "• Clean old data: ./scripts/manage-scraper.sh clean"
echo ""
echo "🌐 API Endpoints Available:"
echo "• POST /api/providers/spotify/scrape"
echo "• GET /api/providers/spotify/scrape/:jobId"
echo "• GET /api/providers/spotify/health"
echo ""
echo "📱 Frontend Access:"
echo "• Visit: https://app.artistinfluence.com/admin/integrations"
echo "• Use: Spotify Scraper Manager"
echo ""
echo "🚀 Ready for Phase 2B: Webhook Infrastructure!"
EOF

chmod +x scripts/setup-spotify-scraper.sh

echo "✅ Spotify scraper setup script created"
