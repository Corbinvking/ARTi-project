#!/bin/bash
# Complete Ratio Fixer Integration Deployment Script
# Run this on the droplet: bash deploy-ratio-fixer-integration.sh

set -e  # Exit on error

echo "=========================================="
echo "Ratio Fixer Full Integration Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Add API Endpoints
echo -e "${YELLOW}Step 1: Adding API endpoints to Flask...${NC}"
cd /opt/ratio-fixer

# Check if already patched
if grep -q "from flask_cors import CORS" main.py && grep -q "/api/create_campaign" main.py; then
    echo -e "${GREEN}✅ API endpoints already added${NC}"
else
    # Check if patch script exists
    if [ -f "flask-api-endpoints-patch.py" ]; then
        source venv/bin/activate
        python3 flask-api-endpoints-patch.py main.py
    else
        echo -e "${RED}❌ flask-api-endpoints-patch.py not found${NC}"
        echo "Please copy it from the repo or create it manually"
        exit 1
    fi
fi

# Install flask-cors
echo -e "${YELLOW}Installing flask-cors...${NC}"
source venv/bin/activate
pip install flask-cors > /dev/null 2>&1
echo -e "${GREEN}✅ flask-cors installed${NC}"

# Step 2: Configure API Keys
echo ""
echo -e "${YELLOW}Step 2: Configuring API keys...${NC}"

# Generate API key if not set
if ! grep -q "RATIO_FIXER_API_KEY" .env; then
    API_KEY=$(openssl rand -hex 32)
    echo "RATIO_FIXER_API_KEY=$API_KEY" >> .env
    echo -e "${GREEN}✅ Generated RATIO_FIXER_API_KEY: $API_KEY${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Add this key to apps/api/production.env${NC}"
else
    API_KEY=$(grep "RATIO_FIXER_API_KEY" .env | cut -d '=' -f2)
    echo -e "${GREEN}✅ RATIO_FIXER_API_KEY already set${NC}"
fi

# Add GOOGLE_APPLICATION_CREDENTIALS if not set
if ! grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env; then
    echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json" >> .env
    echo -e "${GREEN}✅ Added GOOGLE_APPLICATION_CREDENTIALS${NC}"
fi

# Step 3: Set Up Systemd Service
echo ""
echo -e "${YELLOW}Step 3: Setting up systemd service...${NC}"

if [ -f "/etc/systemd/system/ratio-fixer.service" ]; then
    echo -e "${GREEN}✅ Systemd service already exists${NC}"
else
    cat > /tmp/ratio-fixer.service << 'EOF'
[Unit]
Description=Ratio Fixer Flask App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ratio-fixer
Environment="PATH=/opt/ratio-fixer/venv/bin"
EnvironmentFile=/opt/ratio-fixer/.env
ExecStart=/opt/ratio-fixer/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo cp /tmp/ratio-fixer.service /etc/systemd/system/ratio-fixer.service
    sudo systemctl daemon-reload
    sudo systemctl enable ratio-fixer
    echo -e "${GREEN}✅ Systemd service created and enabled${NC}"
fi

# Step 4: Start Flask Service
echo ""
echo -e "${YELLOW}Step 4: Starting Flask service...${NC}"
sudo systemctl restart ratio-fixer
sleep 3

if sudo systemctl is-active --quiet ratio-fixer; then
    echo -e "${GREEN}✅ Flask service is running${NC}"
else
    echo -e "${RED}❌ Flask service failed to start${NC}"
    echo "Check logs: sudo journalctl -u ratio-fixer -n 50"
    exit 1
fi

# Step 5: Test Flask Health
echo ""
echo -e "${YELLOW}Step 5: Testing Flask health endpoint...${NC}"
sleep 2
HEALTH_RESPONSE=$(curl -s http://localhost:5000/healthz || echo "FAILED")
if [ "$HEALTH_RESPONSE" = '{"status":"healthy"}' ]; then
    echo -e "${GREEN}✅ Flask health check passed${NC}"
else
    echo -e "${RED}❌ Flask health check failed: $HEALTH_RESPONSE${NC}"
    echo "Check logs: sudo journalctl -u ratio-fixer -n 50"
fi

# Step 6: Update YouTube Manager Backend
echo ""
echo -e "${YELLOW}Step 6: Updating YouTube Manager backend...${NC}"
cd ~/arti-marketing-ops

# Check if API keys need to be added
if ! grep -q "RATIO_FIXER_URL" apps/api/production.env; then
    echo ""
    echo -e "${YELLOW}⚠️  Manual step required:${NC}"
    echo "Add these lines to apps/api/production.env:"
    echo ""
    echo "RATIO_FIXER_URL=http://localhost:5000"
    echo "RATIO_FIXER_API_KEY=$API_KEY"
    echo "JINGLE_SMM_API_KEY=708ff328d63c1ce1548596a16f5f67b1"
    echo ""
    read -p "Press Enter after you've added these to production.env..."
else
    echo -e "${GREEN}✅ API keys already configured${NC}"
fi

# Rebuild API container
echo -e "${YELLOW}Rebuilding API container...${NC}"
docker compose build --no-cache api > /dev/null 2>&1
docker compose up -d api
sleep 5
echo -e "${GREEN}✅ API container rebuilt and restarted${NC}"

# Step 7: Run Database Migration
echo ""
echo -e "${YELLOW}Step 7: Running database migration...${NC}"
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'youtube_campaigns' AND column_name = 'ratio_fixer_status';" | grep -q "ratio_fixer_status"; then
    echo -e "${GREEN}✅ Migration already applied${NC}"
else
    if [ -f "supabase/migrations/050_add_ratio_fixer_tracking.sql" ]; then
        docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/050_add_ratio_fixer_tracking.sql
        echo -e "${GREEN}✅ Migration applied${NC}"
    else
        echo -e "${RED}❌ Migration file not found${NC}"
        echo "Expected: supabase/migrations/050_add_ratio_fixer_tracking.sql"
    fi
fi

# Step 8: Final Tests
echo ""
echo -e "${YELLOW}Step 8: Running final tests...${NC}"

# Test Flask health
FLASK_HEALTH=$(curl -s http://localhost:5000/healthz)
if [ "$FLASK_HEALTH" = '{"status":"healthy"}' ]; then
    echo -e "${GREEN}✅ Flask health: OK${NC}"
else
    echo -e "${RED}❌ Flask health: FAILED${NC}"
fi

# Test API bridge health
sleep 3
API_HEALTH=$(curl -s http://localhost:3001/api/ratio-fixer/health | grep -o '"available":true' || echo "FAILED")
if [ "$API_HEALTH" = '"available":true' ]; then
    echo -e "${GREEN}✅ API bridge health: OK${NC}"
else
    echo -e "${YELLOW}⚠️  API bridge health: Check manually${NC}"
    echo "Run: curl http://localhost:3001/api/ratio-fixer/health"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test from frontend: https://app.artistinfluence.com/youtube/campaigns"
echo "2. Monitor logs: sudo journalctl -u ratio-fixer -f"
echo "3. Check API logs: docker compose logs api -f"
echo ""
echo "If API bridge health check failed, verify:"
echo "- Flask is running: curl http://localhost:5000/healthz"
echo "- API keys match in both .env files"
echo "- API container is running: docker compose ps api"
echo ""

