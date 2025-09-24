#!/bin/bash

# Quick deployment script for DigitalOcean droplet
# IP: 164.90.129.146
# Run this ON THE DROPLET after initial setup

echo "🚀 ARTi Platform Quick Deploy"
echo "Droplet IP: 164.90.129.146"
echo "Domain: artistinfluence.com"
echo "=============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${GREEN}[1/8] Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}[2/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    apt install -y docker-compose-plugin
else
    echo "Docker already installed"
fi

echo -e "${GREEN}[3/8] Setting up firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

echo -e "${GREEN}[4/8] Creating directories...${NC}"
mkdir -p /var/log/caddy
chmod 755 /var/log/caddy

echo -e "${GREEN}[5/8] Cloning repository...${NC}"
if [ ! -d "/root/arti-marketing-ops" ]; then
    cd /root
    echo "Enter your GitHub repository URL (e.g., https://github.com/username/ARTi-project.git):"
    read REPO_URL
    git clone $REPO_URL arti-marketing-ops
else
    echo "Repository already exists"
fi

cd /root/arti-marketing-ops

echo -e "${GREEN}[6/8] Setting up environment...${NC}"
if [ ! -f "apps/api/.env" ]; then
    cp apps/api/environment.template apps/api/.env
    echo -e "${YELLOW}Please edit apps/api/.env with your actual values:${NC}"
    echo "nano apps/api/.env"
    echo ""
    echo "Required values:"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- JWT_SECRET"
    echo "- N8N_ENCRYPTION_KEY"
    echo "- N8N_BASIC_AUTH_PASSWORD"
    echo ""
    echo "Press ENTER when you've configured the environment file..."
    read
fi

echo -e "${GREEN}[7/8] Building and starting services...${NC}"
docker compose -f docker-compose.production.yml up -d --build

echo -e "${GREEN}[8/8] Checking service status...${NC}"
sleep 10
docker compose -f docker-compose.production.yml ps

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📋 Service Status:"
docker compose -f docker-compose.production.yml ps
echo ""
echo "🔗 Local Health Checks:"
echo "API: curl http://localhost:3001/healthz"
echo "n8n: curl http://localhost:5678"
echo "Caddy: curl http://localhost:80"
echo ""
echo "🌐 Once DNS propagates, your services will be available at:"
echo "• API: https://api.artistinfluence.com"
echo "• n8n: https://link.artistinfluence.com"
echo "• Root: https://artistinfluence.com (redirects to app)"
echo ""
echo "📊 Monitor logs with:"
echo "docker compose -f docker-compose.production.yml logs -f"
echo ""
echo "🔄 Restart services with:"
echo "docker compose -f docker-compose.production.yml restart"
echo ""

# Run health checks
echo -e "${GREEN}Running health checks...${NC}"
if curl -f http://localhost:3001/healthz >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
fi

if curl -f http://localhost:5678 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ n8n health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ n8n may still be starting up${NC}"
fi

if curl -f http://localhost:80 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Caddy health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Caddy may be waiting for DNS/SSL${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Next: Configure DNS records to point to 164.90.129.146${NC}"
