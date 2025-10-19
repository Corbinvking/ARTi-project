#!/bin/bash
# Supabase Database Import Script
# Run this script on the target machine to import the database

echo "🚀 IMPORTING SUPABASE DATABASE"
echo "================================"

# Stop existing supabase instance
echo "🛑 Stopping existing Supabase instance..."
supabase stop

# Start fresh supabase instance
echo "▶️  Starting fresh Supabase instance..."
supabase start

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Import the database using the JSON export
echo "📥 Importing database from JSON export..."
node scripts/import-json-export.js

echo "✅ Database import completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Verify data integrity"
echo "2. Update environment variables"
echo "3. Test the application"

