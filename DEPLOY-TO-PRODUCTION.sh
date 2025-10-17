#!/bin/bash
# Production Deployment Script for ARTi Marketing Platform
# Based on local-to-production-mirror.md documentation

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: SSH into production and pull latest code
echo "${YELLOW}Step 1: Connecting to production server...${NC}"
ssh root@164.90.129.146 << 'ENDSSH'
    set -e
    
    echo "📁 Navigating to project directory..."
    cd /root/arti-marketing-ops
    
    echo "📊 Current status:"
    git status
    git log --oneline -3
    
    echo ""
    echo "⬇️  Pulling latest code from GitHub..."
    git pull origin main
    
    echo ""
    echo "📦 Installing/updating dependencies..."
    cd apps/frontend
    npm install
    cd ../..
    
    echo ""
    echo "🏗️  Building frontend..."
    cd apps/frontend
    npm run build
    cd ../..
    
    echo ""
    echo "🔄 Restarting services..."
    # Frontend is on Vercel, auto-deploys from Git
    # Just restart backend API if needed
    docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml restart api
    
    echo ""
    echo "✅ Checking service status..."
    docker ps | grep arti-marketing-ops
    
    echo ""
    echo "📋 Recent API logs:"
    docker logs arti-marketing-ops-api-1 --tail 20
    
    echo ""
    echo "${GREEN}✨ Deployment complete!${NC}"
    echo ""
    echo "🔍 Verify at:"
    echo "   - Frontend: https://app.artistinfluence.com"
    echo "   - API: https://api.artistinfluence.com/healthz"
    echo "   - Database Studio: https://db.artistinfluence.com"
    
ENDSSH

echo ""
echo "${GREEN}🎉 Production deployment finished!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test Campaign Creation Wizard"
echo "  2. Test Interactive Status Badge"
echo "  3. Test SFA Link Support"
echo "  4. Verify all CRUD operations"

