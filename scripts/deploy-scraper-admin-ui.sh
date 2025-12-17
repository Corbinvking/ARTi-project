#!/bin/bash
# Deploy scraper admin UI backend changes

set -e

echo "🚀 Deploying Scraper Admin UI Backend..."
echo "========================================="

cd /root/arti-marketing-ops

# Pull latest code
echo "📥 Pulling latest code..."
git pull

# Build API
echo "🔨 Building API..."
cd apps/api
npm run build

# Restart API service
echo "🔄 Restarting API service..."
cd /root/arti-marketing-ops
docker-compose restart arti-api

# Wait for API to start
echo "⏳ Waiting for API to start..."
sleep 5

# Test scraper status endpoint
echo "🧪 Testing scraper status endpoint..."
if curl -s http://localhost:3001/api/scraper/status > /dev/null; then
    echo "✅ Scraper status endpoint is working!"
else
    echo "⚠️  Scraper status endpoint may not be responding yet (might need more time)"
fi

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "📋 Test endpoints:"
echo "  curl http://localhost:3001/api/scraper/status"
echo "  curl http://localhost:3001/api/scraper/health"
echo "  curl http://localhost:3001/api/scraper/logs?type=production&lines=50"
echo ""
echo "🌐 Frontend Admin Panel:"
echo "  https://app.artistinfluence.com/admin"
echo ""

