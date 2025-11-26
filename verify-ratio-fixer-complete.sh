#!/bin/bash
# Comprehensive Ratio Fixer Verification Script
# Tests all components without requiring available comments

FLASK_APP_DIR="/opt/ratio-fixer"
FLASK_DB="${FLASK_APP_DIR}/campaigns.db"
FLASK_SERVICE="ratio-fixer"
FLASK_HOST="164.90.129.146"
FLASK_PORT="5000"
API_KEY="5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7"
API_URL="https://api.artistinfluence.com"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Ratio Fixer Complete Verification"
echo "=========================================="
echo ""

# Test counter
PASSED=0
FAILED=0

# Function to print test result
print_result() {
    local test_name=$1
    local result=$2
    local message=$3
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        [ -n "$message" ] && echo "   $message"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        [ -n "$message" ] && echo "   $message"
        ((FAILED++))
    fi
}

echo "=========================================="
echo "Test 1: Flask Service Status"
echo "=========================================="

if sudo systemctl is-active --quiet "$FLASK_SERVICE"; then
    STATUS=$(sudo systemctl status "$FLASK_SERVICE" --no-pager | grep "Active:" | awk '{print $2}')
    print_result "Flask service running" "pass" "Status: $STATUS"
else
    print_result "Flask service running" "fail" "Service is not active"
fi
echo ""

echo "=========================================="
echo "Test 2: Flask Network Binding"
echo "=========================================="

LISTENING=$(sudo netstat -tlnp 2>/dev/null | grep ":5000" | grep "0.0.0.0" || sudo ss -tlnp 2>/dev/null | grep ":5000" | grep "0.0.0.0")
if [ -n "$LISTENING" ]; then
    print_result "Flask listening on 0.0.0.0:5000" "pass" "Accessible from external hosts"
else
    print_result "Flask listening on 0.0.0.0:5000" "fail" "May only be listening on 127.0.0.1"
fi
echo ""

echo "=========================================="
echo "Test 3: Flask Health Endpoint"
echo "=========================================="

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "http://${FLASK_HOST}:${FLASK_PORT}/healthz" 2>/dev/null)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_CODE" = "200" ]; then
    print_result "Flask health check" "pass" "Response: $HEALTH_BODY"
else
    print_result "Flask health check" "fail" "HTTP $HEALTH_CODE"
fi
echo ""

echo "=========================================="
echo "Test 4: API Bridge Health Check"
echo "=========================================="

BRIDGE_RESPONSE=$(curl -s "${API_URL}/api/ratio-fixer/health" 2>/dev/null)
BRIDGE_STATUS=$(echo "$BRIDGE_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
BRIDGE_AVAILABLE=$(echo "$BRIDGE_RESPONSE" | grep -o '"available":[^,}]*' | cut -d':' -f2)

if [ "$BRIDGE_STATUS" = "healthy" ] && [ "$BRIDGE_AVAILABLE" = "true" ]; then
    print_result "API Bridge connectivity" "pass" "Status: $BRIDGE_STATUS, Available: $BRIDGE_AVAILABLE"
else
    print_result "API Bridge connectivity" "fail" "Status: $BRIDGE_STATUS, Available: $BRIDGE_AVAILABLE"
fi
echo ""

echo "=========================================="
echo "Test 5: Flask API Authentication"
echo "=========================================="

# Test without API key (should fail)
NO_KEY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    "http://${FLASK_HOST}:${FLASK_PORT}/api/create_campaign" 2>/dev/null)
NO_KEY_CODE=$(echo "$NO_KEY_RESPONSE" | tail -n 1)

if [ "$NO_KEY_CODE" = "401" ] || [ "$NO_KEY_CODE" = "403" ]; then
    print_result "API key authentication" "pass" "Correctly rejects requests without API key"
else
    print_result "API key authentication" "fail" "Should return 401/403, got $NO_KEY_CODE"
fi
echo ""

echo "=========================================="
echo "Test 6: Flask Database Structure"
echo "=========================================="

if [ -f "$FLASK_DB" ]; then
    print_result "Database file exists" "pass" "Location: $FLASK_DB"
    
    # Check if campaign_model table exists
    TABLE_EXISTS=$(sqlite3 "$FLASK_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='campaign_model';" 2>/dev/null)
    if [ "$TABLE_EXISTS" = "campaign_model" ]; then
        print_result "campaign_model table exists" "pass"
        
        # Check for required columns
        COLUMNS=$(sqlite3 "$FLASK_DB" "PRAGMA table_info(campaign_model);" 2>/dev/null | cut -d'|' -f2)
        
        # Check for critical columns
        REQUIRED_COLS=("ordered_likes" "ordered_comments" "comment_server_id" "like_server_id" "sheet_tier")
        ALL_COLS_PRESENT=true
        
        for col in "${REQUIRED_COLS[@]}"; do
            if echo "$COLUMNS" | grep -q "^${col}$"; then
                echo -e "   ${GREEN}✓${NC} Column '$col' present"
            else
                echo -e "   ${RED}✗${NC} Column '$col' missing"
                ALL_COLS_PRESENT=false
            fi
        done
        
        if [ "$ALL_COLS_PRESENT" = true ]; then
            print_result "All required columns present" "pass"
        else
            print_result "All required columns present" "fail" "Some columns missing"
        fi
    else
        print_result "campaign_model table exists" "fail"
    fi
else
    print_result "Database file exists" "fail" "Database not found at $FLASK_DB"
fi
echo ""

echo "=========================================="
echo "Test 7: Create Test Campaign (Mock)"
echo "=========================================="

# Create a test campaign with a known video (won't place orders due to no comments)
TEST_VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Astley - Never Gonna Give You Up
TEST_VIDEO_ID="dQw4w9WgXcQ"

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d '{
        "video_id": "'"${TEST_VIDEO_ID}"'",
        "genre": "Test",
        "comments_sheet_url": "https://docs.google.com/spreadsheets/d/1rQVZYIpoYondBniF6oDnTE7eWJ4SslJ_YbTn0RsfXXk",
        "wait_time": 0,
        "minimum_engagement": 0,
        "comment_server_id": 439,
        "like_server_id": 2324,
        "sheet_tier": "1"
    }' \
    "http://${FLASK_HOST}:${FLASK_PORT}/api/create_campaign" 2>/dev/null)

CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n -1)
CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n 1)

if [ "$CREATE_CODE" = "200" ]; then
    CAMPAIGN_ID=$(echo "$CREATE_BODY" | grep -o '"campaign_id":"[^"]*"' | cut -d'"' -f4)
    print_result "Campaign creation endpoint" "pass" "Campaign ID: $CAMPAIGN_ID"
    
    # Wait for campaign to initialize
    sleep 3
    
    # Test 8: Check campaign status
    echo ""
    echo "=========================================="
    echo "Test 8: Campaign Status Endpoint"
    echo "=========================================="
    
    if [ -n "$CAMPAIGN_ID" ]; then
        STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "X-API-Key: ${API_KEY}" \
            "http://${FLASK_HOST}:${FLASK_PORT}/api/campaign_status/${CAMPAIGN_ID}" 2>/dev/null)
        
        STATUS_BODY=$(echo "$STATUS_RESPONSE" | head -n -1)
        STATUS_CODE=$(echo "$STATUS_RESPONSE" | tail -n 1)
        
        if [ "$STATUS_CODE" = "200" ]; then
            print_result "Status endpoint returns data" "pass"
            
            # Check for required fields
            HAS_VIEWS=$(echo "$STATUS_BODY" | grep -o '"views":[0-9]*')
            HAS_LIKES=$(echo "$STATUS_BODY" | grep -o '"likes":[0-9]*')
            HAS_COMMENTS=$(echo "$STATUS_BODY" | grep -o '"comments":[0-9]*')
            HAS_ORDERED_LIKES=$(echo "$STATUS_BODY" | grep -o '"ordered_likes":[0-9]*')
            HAS_ORDERED_COMMENTS=$(echo "$STATUS_BODY" | grep -o '"ordered_comments":[0-9]*')
            HAS_DESIRED_LIKES=$(echo "$STATUS_BODY" | grep -o '"desired_likes":[0-9]*')
            HAS_DESIRED_COMMENTS=$(echo "$STATUS_BODY" | grep -o '"desired_comments":[0-9]*')
            
            ALL_FIELDS_PRESENT=true
            [ -z "$HAS_VIEWS" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: views"
            [ -z "$HAS_LIKES" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: likes"
            [ -z "$HAS_COMMENTS" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: comments"
            [ -z "$HAS_ORDERED_LIKES" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: ordered_likes"
            [ -z "$HAS_ORDERED_COMMENTS" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: ordered_comments"
            [ -z "$HAS_DESIRED_LIKES" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: desired_likes"
            [ -z "$HAS_DESIRED_COMMENTS" ] && ALL_FIELDS_PRESENT=false && echo "   Missing: desired_comments"
            
            if [ "$ALL_FIELDS_PRESENT" = true ]; then
                print_result "All status fields present" "pass"
                echo "   Response: $STATUS_BODY"
            else
                print_result "All status fields present" "fail" "Some fields missing"
            fi
        else
            print_result "Status endpoint returns data" "fail" "HTTP $STATUS_CODE"
        fi
        
        # Test 9: Stop campaign
        echo ""
        echo "=========================================="
        echo "Test 9: Stop Campaign Endpoint"
        echo "=========================================="
        
        STOP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            -H "X-API-Key: ${API_KEY}" \
            "http://${FLASK_HOST}:${FLASK_PORT}/api/stop_campaign/${CAMPAIGN_ID}" 2>/dev/null)
        
        STOP_CODE=$(echo "$STOP_RESPONSE" | tail -n 1)
        
        if [ "$STOP_CODE" = "200" ]; then
            print_result "Stop campaign endpoint" "pass"
        else
            print_result "Stop campaign endpoint" "fail" "HTTP $STOP_CODE"
        fi
    else
        print_result "Campaign status endpoint" "fail" "No campaign ID to test"
    fi
else
    print_result "Campaign creation endpoint" "fail" "HTTP $CREATE_CODE - $CREATE_BODY"
fi
echo ""

echo "=========================================="
echo "Test 10: Flask Logs for Errors"
echo "=========================================="

# Check for recent errors in logs
RECENT_ERRORS=$(sudo journalctl -u "$FLASK_SERVICE" -n 100 --no-pager | grep -i "ERROR" | tail -5)

if [ -z "$RECENT_ERRORS" ]; then
    print_result "No recent errors in logs" "pass"
else
    print_result "No recent errors in logs" "fail" "Found errors (see below)"
    echo "$RECENT_ERRORS" | while read -r line; do
        echo "   $line"
    done
fi
echo ""

echo "=========================================="
echo "Test 11: Google Sheets API Access"
echo "=========================================="

# Check if Google service account file exists
SA_KEY="${FLASK_APP_DIR}/rich-phenomenon-428302-q5-dba5f2f381c1.json"
if [ -f "$SA_KEY" ]; then
    print_result "Google service account key exists" "pass"
    
    # Check if GOOGLE_APPLICATION_CREDENTIALS is set
    if grep -q "GOOGLE_APPLICATION_CREDENTIALS" "${FLASK_APP_DIR}/.env" 2>/dev/null; then
        print_result "GOOGLE_APPLICATION_CREDENTIALS configured" "pass"
    else
        print_result "GOOGLE_APPLICATION_CREDENTIALS configured" "fail" "Not set in .env"
    fi
else
    print_result "Google service account key exists" "fail" "Key file not found"
fi
echo ""

echo "=========================================="
echo "Test 12: JingleSMM API Configuration"
echo "=========================================="

if grep -q "JINGLE_API_KEY" "${FLASK_APP_DIR}/.env" 2>/dev/null; then
    JINGLE_KEY=$(grep "JINGLE_API_KEY" "${FLASK_APP_DIR}/.env" | cut -d'=' -f2 | tr -d ' "' | head -c 20)
    if [ -n "$JINGLE_KEY" ]; then
        print_result "JingleSMM API key configured" "pass" "Key starts with: ${JINGLE_KEY}..."
    else
        print_result "JingleSMM API key configured" "fail" "Key is empty"
    fi
else
    print_result "JingleSMM API key configured" "fail" "Not found in .env"
fi
echo ""

echo "=========================================="
echo "Test 13: Python Dependencies"
echo "=========================================="

# Check if virtual environment exists
if [ -d "${FLASK_APP_DIR}/venv" ]; then
    print_result "Virtual environment exists" "pass"
    
    # Check for key packages
    if [ -f "${FLASK_APP_DIR}/venv/bin/python" ]; then
        PACKAGES=$("${FLASK_APP_DIR}/venv/bin/pip" list 2>/dev/null)
        
        REQUIRED_PACKAGES=("Flask" "google-api-python-client" "pandas" "scikit-learn" "SQLAlchemy" "flask-cors")
        ALL_PACKAGES_PRESENT=true
        
        for pkg in "${REQUIRED_PACKAGES[@]}"; do
            if echo "$PACKAGES" | grep -qi "^${pkg} "; then
                echo -e "   ${GREEN}✓${NC} $pkg installed"
            else
                echo -e "   ${RED}✗${NC} $pkg missing"
                ALL_PACKAGES_PRESENT=false
            fi
        done
        
        if [ "$ALL_PACKAGES_PRESENT" = true ]; then
            print_result "All required packages installed" "pass"
        else
            print_result "All required packages installed" "fail" "Some packages missing"
        fi
    fi
else
    print_result "Virtual environment exists" "fail" "No venv directory found"
fi
echo ""

echo "=========================================="
echo "Test 14: CORS Configuration"
echo "=========================================="

# Check if CORS is configured in main.py
if grep -q "from flask_cors import CORS" "${FLASK_APP_DIR}/main.py" 2>/dev/null; then
    print_result "CORS import present" "pass"
    
    if grep -q "CORS(app" "${FLASK_APP_DIR}/main.py" 2>/dev/null; then
        print_result "CORS initialized" "pass"
    else
        print_result "CORS initialized" "fail" "CORS not initialized"
    fi
else
    print_result "CORS import present" "fail" "CORS not imported"
fi
echo ""

echo "=========================================="
echo "Test 15: External API Access (Production)"
echo "=========================================="

EXTERNAL_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/ratio-fixer/health" 2>/dev/null)
EXTERNAL_BODY=$(echo "$EXTERNAL_RESPONSE" | head -n -1)
EXTERNAL_CODE=$(echo "$EXTERNAL_RESPONSE" | tail -n 1)

if [ "$EXTERNAL_CODE" = "200" ]; then
    print_result "External API accessible" "pass" "Production URL working"
else
    print_result "External API accessible" "fail" "HTTP $EXTERNAL_CODE"
fi
echo ""

echo "=========================================="
echo "Test Results Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "Success Rate: ${PERCENTAGE}%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Ratio Fixer is fully functional."
    echo "The only remaining issue is the Google Sheets comments being marked as 'Used'."
    echo ""
    echo "To fix:"
    echo "1. Open: https://docs.google.com/spreadsheets/d/1rQVZYIpoYondBniF6oDnTE7eWJ4SslJ_YbTn0RsfXXk"
    echo "2. Clear column B (the 'Used' column)"
    echo "3. Start a new campaign from the frontend"
    echo "4. Monitor: sudo journalctl -u ratio-fixer -f"
    exit 0
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY FUNCTIONAL${NC}"
    echo ""
    echo "Most tests passed. Review failed tests above."
    exit 1
else
    echo -e "${RED}❌ CRITICAL ISSUES FOUND${NC}"
    echo ""
    echo "Multiple tests failed. Review the output above for details."
    exit 2
fi

