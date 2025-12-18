#!/bin/bash
# Test CORS OPTIONS handling

echo "=========================================="
echo "Testing CORS OPTIONS Handling"
echo "=========================================="
echo ""

echo "Test 1: OPTIONS request to /api/health"
echo "----------------------------------------"
curl -X OPTIONS https://api.artistinfluence.com/api/health \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control|204|200)"

echo ""
echo "Test 2: GET request to /api/health (should work now)"
echo "----------------------------------------"
curl -X GET https://api.artistinfluence.com/api/health \
  -H 'Origin: https://app.artistinfluence.com' \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control|status|ok)"

echo ""
echo "Test 3: OPTIONS request to /api/youtube-data-api/fetch-all-campaigns"
echo "----------------------------------------"
curl -X OPTIONS https://api.artistinfluence.com/api/youtube-data-api/fetch-all-campaigns \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control|204|200)"

echo ""
echo "=========================================="
echo "✅ Tests complete!"
echo "=========================================="
echo ""
echo "If you see '204 No Content' and 'Access-Control-Allow-Origin' headers,"
echo "the CORS fix is working. Try the YouTube API test in the frontend now!"

