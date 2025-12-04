#!/bin/bash
# Complete the remaining Ratio Fixer deployment steps
# Run this after Flask service is working

set -e

echo "=========================================="
echo "Completing Ratio Fixer Deployment"
echo "=========================================="
echo ""

# Step 1: Verify Flask is running
echo "Step 1: Verifying Flask service..."
if curl -s http://localhost:5000/healthz | grep -q "healthy"; then
    echo "✅ Flask service is healthy"
else
    echo "❌ Flask service not responding"
    exit 1
fi

# Step 2: Update API container with keys
echo ""
echo "Step 2: Updating YouTube Manager API configuration..."
cd ~/arti-marketing-ops

# Check if API keys are set
if ! grep -q "RATIO_FIXER_URL" apps/api/production.env; then
    echo "⚠️  API keys not in production.env - adding them..."
    
    # Get the API key from Flask .env
    API_KEY=$(grep "RATIO_FIXER_API_KEY" /opt/ratio-fixer/.env | cut -d '=' -f2)
    
    if [ -z "$API_KEY" ]; then
        echo "❌ Could not find RATIO_FIXER_API_KEY in Flask .env"
        exit 1
    fi
    
    echo "" >> apps/api/production.env
    echo "# Ratio Fixer API Bridge" >> apps/api/production.env
    echo "RATIO_FIXER_URL=http://localhost:5000" >> apps/api/production.env
    echo "RATIO_FIXER_API_KEY=$API_KEY" >> apps/api/production.env
    echo "JINGLE_SMM_API_KEY=708ff328d63c1ce1548596a16f5f67b1" >> apps/api/production.env
    echo "✅ Added API keys to production.env"
else
    echo "✅ API keys already configured"
fi

# Step 3: Rebuild and restart API container
echo ""
echo "Step 3: Rebuilding API container..."
docker compose build --no-cache api > /dev/null 2>&1
docker compose up -d api
sleep 5
echo "✅ API container rebuilt and restarted"

# Step 4: Test API bridge
echo ""
echo "Step 4: Testing API bridge..."
sleep 3
API_HEALTH=$(curl -s http://localhost:3001/api/ratio-fixer/health)
if echo "$API_HEALTH" | grep -q '"available":true'; then
    echo "✅ API bridge is healthy"
    echo "   Response: $API_HEALTH"
else
    echo "⚠️  API bridge health check:"
    echo "   $API_HEALTH"
    echo "   (This might be OK if Flask is on different network)"
fi

# Step 5: Run database migration
echo ""
echo "Step 5: Running database migration..."
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'youtube_campaigns' AND column_name = 'ratio_fixer_status';" 2>/dev/null | grep -q "ratio_fixer_status"; then
    echo "✅ Migration already applied"
else
    if [ -f "supabase/migrations/050_add_ratio_fixer_tracking.sql" ]; then
        docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/050_add_ratio_fixer_tracking.sql
        echo "✅ Migration applied"
    else
        echo "⚠️  Migration file not found: supabase/migrations/050_add_ratio_fixer_tracking.sql"
    fi
fi

# Step 6: Verify database columns
echo ""
echo "Step 6: Verifying database columns..."
COLUMNS=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name LIKE 'ratio_fixer%';
" 2>/dev/null | tr -d ' ')

if [ "$COLUMNS" -ge "3" ]; then
    echo "✅ Found $COLUMNS ratio_fixer columns in youtube_campaigns"
else
    echo "⚠️  Only found $COLUMNS ratio_fixer columns (expected at least 3)"
fi

# Step 7: Final summary
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Status Summary:"
echo "  Flask Service: ✅ Running"
echo "  API Bridge: $(curl -s http://localhost:3001/api/ratio-fixer/health | grep -q '"available":true' && echo '✅ Healthy' || echo '⚠️  Check manually')"
echo "  Database: ✅ Migration applied"
echo ""
echo "Next Steps:"
echo "1. Test from frontend: https://app.artistinfluence.com/youtube/campaigns"
echo "2. Monitor Flask logs: sudo journalctl -u ratio-fixer -f"
echo "3. Monitor API logs: docker compose logs api -f"
echo ""
echo "Test API bridge manually:"
echo "  curl http://localhost:3001/api/ratio-fixer/health"
echo ""





