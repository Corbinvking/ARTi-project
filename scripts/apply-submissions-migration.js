#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  // Parse the Supabase URL to get PostgreSQL connection details
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.artistinfluence.com';
  
  // For production self-hosted Supabase
  const connectionString = 'postgresql://postgres:your-super-secret-and-long-postgres-password@api.artistinfluence.com:5432/postgres';
  
  const client = new Client({
    connectionString,
    ssl: false // Self-hosted, no SSL
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/999_update_campaign_submissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Applying migration: 999_update_campaign_submissions.sql\n');
    console.log('SQL Preview:');
    console.log(migrationSQL.substring(0, 200) + '...\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify new columns exist
    const { rows } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campaign_submissions' 
      AND column_name IN ('client_id', 'sfa_url', 'vendor_assignments', 'reviewed_at', 'reviewed_by', 'submission_notes')
      ORDER BY column_name;
    `);

    console.log('✅ Verified new columns:');
    rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed');
  }
}

applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

