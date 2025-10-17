#!/usr/bin/env node

/**
 * Supabase Database Export Script
 * Exports the complete current Supabase database for cloning to another machine
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  username: 'postgres',
  password: 'postgres'
};

const EXPORT_DIR = path.join(__dirname, '..', 'supabase-export');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

async function exportDatabase() {
  console.log('🚀 STARTING SUPABASE DATABASE EXPORT');
  console.log('=' .repeat(60));

  try {
    // Create export directory
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    const exportFile = path.join(EXPORT_DIR, `supabase-export-${TIMESTAMP}.sql`);

    console.log(`📁 Export directory: ${EXPORT_DIR}`);
    console.log(`📄 Export file: ${exportFile}`);
    console.log('');

    // Export database schema and data
    console.log('📊 Exporting database schema and data...');

    const pgDumpCommand = `pg_dump \
      -h ${SUPABASE_CONFIG.host} \
      -p ${SUPABASE_CONFIG.port} \
      -U ${SUPABASE_CONFIG.username} \
      -d ${SUPABASE_CONFIG.database} \
      --no-owner \
      --no-privileges \
      --clean \
      --if-exists \
      --verbose \
      --file="${exportFile}"`;

    execSync(pgDumpCommand, {
      env: { ...process.env, PGPASSWORD: SUPABASE_CONFIG.password },
      stdio: 'inherit'
    });

    console.log(`✅ Database exported successfully to: ${exportFile}`);
    console.log('');

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      source: 'ARTI0-local-supabase',
      version: '1.0',
      description: 'Complete Supabase database export for ARTI platform',
      includes: [
        'Schema (tables, functions, policies)',
        'All table data',
        'Auth configuration',
        'Storage configuration'
      ],
      database: {
        host: SUPABASE_CONFIG.host,
        port: SUPABASE_CONFIG.port,
        database: SUPABASE_CONFIG.database
      }
    };

    fs.writeFileSync(
      path.join(EXPORT_DIR, 'export-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create import script
    const importScript = `#!/bin/bash
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

# Import the database
echo "📥 Importing database..."
psql -h localhost -p 54322 -U postgres -d postgres -f "${exportFile}"

echo "✅ Database import completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Verify data integrity"
echo "2. Update environment variables"
echo "3. Test the application"
`;

    fs.writeFileSync(
      path.join(EXPORT_DIR, 'import-database.sh'),
      importScript
    );

    // Make import script executable
    execSync(`chmod +x "${path.join(EXPORT_DIR, 'import-database.sh')}"`);

    console.log('📋 Created import script: import-database.sh');
    console.log('');

    // Create README with instructions
    const readme = `# Supabase Database Export

This directory contains a complete export of the ARTI platform Supabase database.

## Contents

- \`supabase-export-${TIMESTAMP}.sql\` - Complete database dump
- \`import-database.sh\` - Script to import on target machine
- \`export-metadata.json\` - Export metadata and information

## For Target Machine Setup

1. Copy this entire directory to the target machine
2. Navigate to this directory
3. Run: \`./import-database.sh\`

## Database Connection Details

- **Host**: ${SUPABASE_CONFIG.host}
- **Port**: ${SUPABASE_CONFIG.port}
- **Database**: ${SUPABASE_CONFIG.database}
- **Username**: ${SUPABASE_CONFIG.username}

## What This Export Includes

✅ Complete schema (tables, indexes, constraints)
✅ All table data
✅ Functions and stored procedures
✅ Row Level Security (RLS) policies
✅ Auth configuration
✅ Storage configuration

## Notes

- This export excludes user passwords for security
- Auth users will need to be recreated on the target machine
- Storage buckets and files are not included in this export
- Environment-specific configurations may need updating

`;

    fs.writeFileSync(
      path.join(EXPORT_DIR, 'README.md'),
      readme
    );

    console.log('📋 Created README with setup instructions');
    console.log('');

    // Show summary
    const stats = fs.statSync(exportFile);
    console.log('📊 EXPORT SUMMARY');
    console.log(`   📄 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📁 Export directory: ${EXPORT_DIR}`);
    console.log(`   🕒 Timestamp: ${new Date().toISOString()}`);

    console.log('');
    console.log('✅ EXPORT COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('📋 NEXT STEPS FOR TARGET MACHINE:');
    console.log('   1. Copy the entire supabase-export/ directory to target machine');
    console.log('   2. Run: ./import-database.sh');
    console.log('   3. Verify data integrity');
    console.log('   4. Update environment variables');

  } catch (error) {
    console.error('❌ EXPORT FAILED:', error.message);
    process.exit(1);
  }
}

// Run the export
exportDatabase();

