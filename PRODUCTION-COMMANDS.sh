#!/bin/bash
# Production Deployment Commands - Run these in order

echo "==================================================================="
echo "PRODUCTION DEPLOYMENT - Vendor Portal"
echo "==================================================================="
echo ""

# ============================================
# STEP 1: Pull latest code
# ============================================
echo "📥 STEP 1: Pulling latest code from Git..."
cd /root/ARTi-project
git pull origin main
echo "✅ Code updated"
echo ""

# ============================================
# STEP 2: Install dependencies
# ============================================
echo "📦 STEP 2: Installing/updating dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# ============================================
# STEP 3: Apply RLS migration to production database
# ============================================
echo "🔧 STEP 3: Applying RLS migration to production database..."
echo "⚠️  YOU NEED TO SET YOUR DATABASE URL BELOW"
echo ""
echo "Get your connection string from:"
echo "https://supabase.com/dashboard → Your Project → Settings → Database"
echo ""
read -p "Press Enter after you've set the DATABASE_URL below, or Ctrl+C to exit and edit this file..."

# EDIT THIS LINE - Replace with your actual production database URL
DATABASE_URL="postgresql://postgres.rtdjjqbxhnjxmsjltblg:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

psql "$DATABASE_URL" -f supabase/migrations/999_fix_vendor_users_rls.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"
else
    echo "❌ Migration failed - check the error above"
    exit 1
fi
echo ""

# ============================================
# STEP 4: Create vendor users
# ============================================
echo "👥 STEP 4: Creating vendor users..."
node scripts/fix-vendor-passwords.js
echo ""

# ============================================
# STEP 5: Sync auth users to public.users
# ============================================
echo "🔄 STEP 5: Syncing auth users to public.users..."
node scripts/sync-auth-to-users.js
echo ""

# ============================================
# STEP 6: Create vendor associations
# ============================================
echo "🔗 STEP 6: Creating vendor associations..."
node scripts/create-vendor-associations.js
echo ""

# ============================================
# STEP 7: Verify setup
# ============================================
echo "✅ STEP 7: Verifying vendor setup..."
node scripts/check-vendor-data.js
echo ""

echo "==================================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "==================================================================="
echo ""
echo "Next steps:"
echo "1. Wait for Vercel to finish deploying (check https://vercel.com)"
echo "2. Test login at your production URL"
echo "   Email: vendor1@arti-demo.com"
echo "   Password: password123"
echo ""
echo "Test other vendors:"
echo "   vendor2@arti-demo.com (Glenn)"
echo "   vendor3@arti-demo.com (Majed)"
echo ""

