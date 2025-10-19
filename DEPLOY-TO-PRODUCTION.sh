#!/bin/bash

# Production Deployment Script for ARTi Marketing Ops
# Run this script on the production server

set -e  # Exit on error

echo "=========================================================================="
echo "🚀 ARTi Marketing Ops - Production Deployment"
echo "=========================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/root/arti-marketing-ops"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "ℹ️  $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  print_error "Please run as root (use sudo)"
  exit 1
fi

# Navigate to project directory
cd $PROJECT_DIR || { print_error "Project directory not found!"; exit 1; }

echo "=========================================================================="
echo "Phase 1: Pre-Deployment Backup"
echo "=========================================================================="
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
print_info "Creating database backup..."
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres -d postgres > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
print_success "Database backed up to: $BACKUP_DIR/backup_$TIMESTAMP.sql"

# Backup current code (if any changes)
print_info "Backing up current code..."
git stash save "backup_before_deployment_$TIMESTAMP" 2>/dev/null || true
print_success "Code backed up"

echo ""
echo "=========================================================================="
echo "Phase 2: Pull Latest Code"
echo "=========================================================================="
echo ""

# Pull latest code
print_info "Pulling latest code from GitHub..."
git pull origin main
print_success "Code updated"

# Install dependencies
print_info "Installing Node.js dependencies..."
npm install
print_success "Dependencies installed"

echo ""
echo "=========================================================================="
echo "Phase 3: Database Migrations"
echo "=========================================================================="
echo ""

# Apply migration 033
print_info "Applying migration 033 (algorithmic playlists)..."
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/033_add_algorithmic_playlists.sql 2>&1 | grep -q "ERROR"; then
  print_warning "Migration 033 may already be applied (this is OK if column exists)"
else
  print_success "Migration 033 applied"
fi

# Verify migration 033
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_playlists" | grep -q "is_algorithmic"; then
  print_success "Verified: is_algorithmic column exists"
else
  print_error "Migration 033 failed: is_algorithmic column missing"
  exit 1
fi

# Apply migration 034
print_info "Applying migration 034 (enhanced campaign tracking)..."
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/034_enhance_campaign_tracking.sql 2>&1 | grep -q "ERROR"; then
  print_warning "Migration 034 may already be applied (this is OK if columns exist)"
else
  print_success "Migration 034 applied"
fi

# Verify migration 034
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_groups" | grep -q "total_goal"; then
  print_success "Verified: Enhanced tracking columns exist"
else
  print_error "Migration 034 failed: tracking columns missing"
  exit 1
fi

echo ""
echo "=========================================================================="
echo "Phase 4: Data Import"
echo "=========================================================================="
echo ""

# Set environment variables
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY=$(grep SERVICE_ROLE_KEY .env | cut -d '=' -f 2 | tr -d '"' | tr -d ' ')

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  print_error "SUPABASE_SERVICE_ROLE_KEY not found in .env file"
  exit 1
fi

print_success "Environment variables set"

# Check if CSV file exists
if [ ! -f "Spotify Playlisting-Active Campaigns.csv" ]; then
  print_warning "CSV file not found - skipping CSV import"
else
  # Import CSV data
  print_info "Importing CSV data..."
  node scripts/import-csv-campaigns-full.js 2>&1 | tee "$BACKUP_DIR/csv_import_$TIMESTAMP.log"
  print_success "CSV import completed (check log for details)"

  # Fix duplicates
  print_info "Removing duplicate clients..."
  node scripts/fix-duplicates-batch.js 2>&1 | tee "$BACKUP_DIR/fix_duplicates_$TIMESTAMP.log"
  print_success "Duplicates fixed"

  # Link vendors
  print_info "Linking vendors to campaigns..."
  node scripts/fix-duplicates-and-vendors.js 2>&1 | tee "$BACKUP_DIR/link_vendors_$TIMESTAMP.log"
  print_success "Vendors linked"

  # Create playlists
  print_info "Creating playlists from CSV data..."
  node scripts/create-playlists-from-csv-data.js 2>&1 | tee "$BACKUP_DIR/create_playlists_$TIMESTAMP.log"
  print_success "Playlists created"

  # Fix statuses
  print_info "Fixing campaign statuses..."
  node scripts/fix-csv-campaign-statuses.js 2>&1 | tee "$BACKUP_DIR/fix_statuses_$TIMESTAMP.log"
  print_success "Statuses fixed"

  # Create missing vendor
  print_info "Creating missing vendors..."
  node scripts/create-missing-vendor-and-playlists.js 2>&1 | tee "$BACKUP_DIR/missing_vendors_$TIMESTAMP.log"
  print_success "Missing vendors created"

  # Sync to playlists table
  print_info "Syncing to playlists table..."
  node scripts/sync-campaign-playlists-to-playlists-v2.js 2>&1 | tee "$BACKUP_DIR/sync_playlists_$TIMESTAMP.log"
  print_success "Playlists synced"
fi

echo ""
echo "=========================================================================="
echo "Phase 5: Verification"
echo "=========================================================================="
echo ""

# Run verification queries
print_info "Verifying database state..."

# Get counts
COUNTS=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT 
  'Clients: ' || COUNT(*)::text FROM clients
UNION ALL
SELECT 'Vendors: ' || COUNT(*)::text FROM vendors
UNION ALL
SELECT 'Campaigns: ' || COUNT(*)::text FROM spotify_campaigns
UNION ALL
SELECT 'Campaign Playlists: ' || COUNT(*)::text FROM campaign_playlists
UNION ALL
SELECT 'Active Campaigns: ' || COUNT(*)::text FROM spotify_campaigns WHERE LOWER(status) = 'active';
" | tr -d ' ')

echo "$COUNTS"

# Check for duplicates
DUPLICATES=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM (SELECT name FROM clients GROUP BY name HAVING COUNT(*) > 1) x;")

if [ "$DUPLICATES" -eq 0 ]; then
  print_success "No duplicate clients found"
else
  print_warning "Found $DUPLICATES duplicate client names"
fi

echo ""
echo "=========================================================================="
echo "Phase 6: Docker Services"
echo "=========================================================================="
echo ""

# Restart services
print_info "Restarting Docker services..."
docker-compose restart
print_success "Services restarted"

# Check service status
print_info "Checking service status..."
docker ps | grep arti-marketing-ops

echo ""
echo "=========================================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================================================="
echo ""
print_success "Code deployed: Latest from GitHub"
print_success "Migrations applied: 033, 034"
print_success "Data imported: CSV and fixes applied"
print_success "Backup created: $BACKUP_DIR/backup_$TIMESTAMP.sql"
echo ""
print_info "Frontend deployment (Vercel) should be automatic"
print_info "Check https://vercel.com for frontend deployment status"
echo ""
print_warning "NEXT STEPS:"
echo "1. Test the frontend UI"
echo "2. Check campaign details modals"
echo "3. Verify playlist data is showing"
echo "4. Monitor for any errors in the next 24 hours"
echo ""
echo "=========================================================================="
echo "📝 Logs saved to: $BACKUP_DIR/*_$TIMESTAMP.log"
echo "=========================================================================="
