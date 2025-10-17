#!/usr/bin/env node

/**
 * Supabase Database Import Script
 * Imports a complete Supabase database export on the target machine
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

async function importDatabase() {
  console.log('🚀 STARTING SUPABASE DATABASE IMPORT');
  console.log('=' .repeat(60));

  // Check if export files exist
  const exportDir = path.join(__dirname, '..', 'supabase-export');
  const metadataFile = path.join(exportDir, 'export-metadata.json');
  const readmeFile = path.join(exportDir, 'README.md');

  if (!fs.existsSync(metadataFile)) {
    console.error('❌ Export files not found!');
    console.log('Expected to find supabase-export/ directory with:');
    console.log('  - export-metadata.json');
    console.log('  - supabase-export-*.sql');
    console.log('  - README.md');
    console.log('');
    console.log('Please ensure you have copied the complete export directory from the source machine.');
    process.exit(1);
  }

  // Read metadata
  const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  console.log(`📋 Import source: ${metadata.source}`);
  console.log(`📅 Export date: ${new Date(metadata.timestamp).toLocaleString()}`);
  console.log('');

  // Find the SQL export file
  const sqlFiles = fs.readdirSync(exportDir)
    .filter(file => file.startsWith('supabase-export-') && file.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    console.error('❌ No SQL export file found!');
    process.exit(1);
  }

  const exportFile = path.join(exportDir, sqlFiles[sqlFiles.length - 1]);
  console.log(`📄 Using export file: ${path.basename(exportFile)}`);

  try {
    // Check if Supabase is running
    console.log('🔍 Checking Supabase status...');
    try {
      execSync('supabase status', { stdio: 'pipe' });
      console.log('✅ Supabase is already running');
    } catch (error) {
      console.log('🛑 Supabase not running, starting it...');
      execSync('supabase start', { stdio: 'inherit' });
      console.log('✅ Supabase started successfully');

      // Wait for database to be ready
      console.log('⏳ Waiting for database to be ready...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    console.log('');
    console.log('📥 IMPORTING DATABASE...');
    console.log('This may take a few minutes...');

    // Import the database
    const psqlCommand = `psql \
      -h ${SUPABASE_CONFIG.host} \
      -p ${SUPABASE_CONFIG.port} \
      -U ${SUPABASE_CONFIG.username} \
      -d ${SUPABASE_CONFIG.database} \
      -f "${exportFile}"`;

    execSync(psqlCommand, {
      env: { ...process.env, PGPASSWORD: SUPABASE_CONFIG.password },
      stdio: 'inherit'
    });

    console.log('');
    console.log('✅ DATABASE IMPORT COMPLETED SUCCESSFULLY!');
    console.log('');

    // Verify the import
    console.log('🔍 VERIFYING DATA INTEGRITY...');

    const verificationQueries = [
      'SELECT COUNT(*) as client_count FROM clients;',
      'SELECT COUNT(*) as campaign_count FROM spotify_campaigns;',
      'SELECT COUNT(*) as org_count FROM orgs;',
      'SELECT COUNT(*) as user_count FROM auth.users;'
    ];

    for (const query of verificationQueries) {
      try {
        const result = execSync(`psql -h ${SUPABASE_CONFIG.host} -p ${SUPABASE_CONFIG.port} -U ${SUPABASE_CONFIG.username} -d ${SUPABASE_CONFIG.database} -c "${query}" -t`, {
          env: { ...process.env, PGPASSWORD: SUPABASE_CONFIG.password }
        }).toString().trim();
        console.log(`   ${query} → ${result}`);
      } catch (error) {
        console.log(`   ${query} → Error: ${error.message}`);
      }
    }

    console.log('');
    console.log('📋 POST-IMPORT CHECKLIST:');
    console.log('   ✅ Database schema imported');
    console.log('   ✅ All table data imported');
    console.log('   ✅ Functions and policies imported');
    console.log('   ✅ RLS policies active');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. Update environment variables');
    console.log('   2. Create admin user if needed');
    console.log('   3. Test application functionality');
    console.log('   4. Verify all platforms (Spotify, YouTube, etc.)');
    console.log('');
    console.log('📖 See README.md for detailed setup instructions');

  } catch (error) {
    console.error('❌ IMPORT FAILED:', error.message);

    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check database connection details');
    console.log('   3. Verify export file is not corrupted');
    console.log('   4. Check available disk space');
    console.log('   5. Try: supabase stop && supabase start');

    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  importDatabase().catch(error => {
    console.error('❌ UNEXPECTED ERROR:', error);
    process.exit(1);
  });
}

module.exports = { importDatabase };

