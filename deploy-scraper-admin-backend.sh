#!/bin/bash
#
# Deploy Scraper Admin Controls - Backend Only
# Run this on the production server
#

set -e

echo "🚀 Deploying Scraper Admin Controls - Backend"
echo "=============================================="

# Navigate to project root
cd /root/arti-marketing-ops

echo "📥 Pulling latest code..."
git pull origin main

echo "🔧 Making health check scripts executable..."
chmod +x spotify_scraper/health_check.py
chmod +x spotify_scraper/run_health_check.sh

echo "✅ Testing health check..."
cd spotify_scraper
bash run_health_check.sh
cd ..

echo "📦 Installing API dependencies..."
cd apps/api
pnpm install

echo "🏗️ Building API..."
pnpm build

echo "🔄 Restarting API server..."
pm2 restart api

echo "⏳ Waiting for API to start..."
sleep 5

echo "🧪 Testing API endpoints..."
curl -s http://localhost:3002/api/scraper/status | jq '.'

echo ""
echo "✅ Backend deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Frontend will auto-deploy via Vercel (check https://vercel.com/dashboard)"
echo "  2. Hard refresh your browser (Ctrl+Shift+R) once Vercel deploys"
echo "  3. Go to /admin page to see the new Scraper Status Card"
echo "  4. Click 'Health Check' to verify everything works"
echo ""
echo "🔍 To check logs:"
echo "  pm2 logs api --lines 50"
echo ""
echo "🎯 API Endpoints Available:"
echo "  GET  /api/scraper/status"
echo "  GET  /api/scraper/health"
echo "  POST /api/scraper/trigger"
echo "  GET  /api/scraper/logs?type=production&lines=100"

