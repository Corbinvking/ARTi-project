const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const AirtableToPostgresMigrator = require('./migrate-airtable-to-postgres');

class DatabaseSetupAndMigration {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your-super-secret-and-long-postgres-password'
    });
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testDatabaseConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      this.log(`Database connection successful: ${result.rows[0].current_time}`, 'success');
      this.log(`PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`, 'info');
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async setupDatabaseSchema() {
    try {
      this.log('Setting up PostgreSQL database schema...', 'info');
      
      // Read the SQL file
      const sqlFilePath = path.join(__dirname, 'create-airtable-mirror-db.sql');
      const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
      
      // Split into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      const client = await this.pool.connect();
      
      this.log(`Executing ${statements.length} SQL statements...`, 'info');
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await client.query(statement);
            this.log(`Executed statement ${i + 1}/${statements.length}`, 'success');
          } catch (error) {
            // Some statements might fail if they already exist, which is fine
            if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
              this.log(`Statement ${i + 1} skipped (already exists): ${error.message}`, 'warning');
            } else {
              this.log(`Statement ${i + 1} failed: ${error.message}`, 'error');
              throw error;
            }
          }
        }
      }
      
      client.release();
      this.log('Database schema setup completed successfully!', 'success');
      return true;
    } catch (error) {
      this.log(`Database schema setup failed: ${error.message}`, 'error');
      return false;
    }
  }

  async verifySchemaSetup() {
    try {
      this.log('Verifying database schema setup...', 'info');
      
      const client = await this.pool.connect();
      
      // Check if schema exists
      const schemaResult = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'airtable_mirror'
      `);
      
      if (schemaResult.rows.length === 0) {
        this.log('Schema "airtable_mirror" not found!', 'error');
        client.release();
        return false;
      }
      
      // Check if tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'airtable_mirror'
        ORDER BY table_name
      `);
      
      const expectedTables = [
        'campaign_tracker_2025',
        'youtube',
        'soundcloud',
        'spotify_playlisting',
        'instagram_seeding',
        'tiktok_ugc',
        'soundcloud_playlisting',
        'salespeople',
        'vendors',
        'invoice_requests',
        'invoices',
        'sp_vendor_updates',
        'clipscale_va_updates'
      ];
      
      const foundTables = tablesResult.rows.map(row => row.table_name);
      const missingTables = expectedTables.filter(table => !foundTables.includes(table));
      
      if (missingTables.length > 0) {
        this.log(`Missing tables: ${missingTables.join(', ')}`, 'error');
        client.release();
        return false;
      }
      
      this.log(`Found ${foundTables.length} tables in airtable_mirror schema`, 'success');
      foundTables.forEach(table => {
        this.log(`   ✅ ${table}`, 'success');
      });
      
      // Check sync status view
      const viewResult = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'airtable_mirror' AND table_name = 'sync_status'
      `);
      
      if (viewResult.rows.length > 0) {
        this.log('✅ Sync status view created successfully', 'success');
      } else {
        this.log('⚠️ Sync status view not found', 'warning');
      }
      
      client.release();
      return true;
    } catch (error) {
      this.log(`Schema verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runMigration() {
    try {
      this.log('Starting data migration from Airtable to PostgreSQL...', 'info');
      
      const migrator = new AirtableToPostgresMigrator();
      await migrator.migrateAllTables();
      await migrator.close();
      
      return true;
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      return false;
    }
  }

  async verifyMigration() {
    try {
      this.log('Verifying migration results...', 'info');
      
      const client = await this.pool.connect();
      
      // Check sync status
      const syncStatusResult = await client.query(`
        SELECT * FROM airtable_mirror.sync_status 
        ORDER BY record_count DESC
      `);
      
      this.log('Migration Results:', 'info');
      syncStatusResult.rows.forEach(row => {
        const status = row.record_count > 0 ? '✅' : '❌';
        this.log(`${status} ${row.table_name}: ${row.record_count} records (last synced: ${row.last_synced})`, 'info');
      });
      
      // Get total record count
      const totalResult = await client.query(`
        SELECT SUM(record_count) as total_records 
        FROM airtable_mirror.sync_status
      `);
      
      const totalRecords = totalResult.rows[0].total_records || 0;
      this.log(`Total records migrated: ${totalRecords}`, 'success');
      
      client.release();
      return true;
    } catch (error) {
      this.log(`Migration verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runCompleteSetup() {
    console.log('🚀 Airtable to PostgreSQL Complete Setup');
    console.log('=======================================\n');

    try {
      // Step 1: Test database connection
      this.log('Step 1: Testing database connection...', 'info');
      const dbConnected = await this.testDatabaseConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Step 2: Setup database schema
      this.log('\nStep 2: Setting up database schema...', 'info');
      const schemaSetup = await this.setupDatabaseSchema();
      if (!schemaSetup) {
        throw new Error('Database schema setup failed');
      }

      // Step 3: Verify schema setup
      this.log('\nStep 3: Verifying schema setup...', 'info');
      const schemaVerified = await this.verifySchemaSetup();
      if (!schemaVerified) {
        throw new Error('Schema verification failed');
      }

      // Step 4: Run migration
      this.log('\nStep 4: Running data migration...', 'info');
      const migrationSuccess = await this.runMigration();
      if (!migrationSuccess) {
        throw new Error('Data migration failed');
      }

      // Step 5: Verify migration
      this.log('\nStep 5: Verifying migration results...', 'info');
      await this.verifyMigration();

      console.log('\n🎉 Complete setup and migration finished successfully!');
      console.log('\n💡 Your Airtable data is now available in PostgreSQL:');
      console.log('   - Schema: airtable_mirror');
      console.log('   - Tables: 13 mirrored tables');
      console.log('   - View: sync_status (for monitoring)');
      console.log('\n📋 Next steps:');
      console.log('   1. Query your data: SELECT * FROM airtable_mirror.campaign_tracker_2025;');
      console.log('   2. Check sync status: SELECT * FROM airtable_mirror.sync_status;');
      console.log('   3. Set up weekly automated sync');
      console.log('   4. Create additional indexes for your specific queries');

    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Main execution
async function runCompleteSetup() {
  const setup = new DatabaseSetupAndMigration();
  
  try {
    await setup.runCompleteSetup();
  } catch (error) {
    console.error('❌ Complete setup failed:', error.message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  runCompleteSetup().catch(console.error);
}

module.exports = DatabaseSetupAndMigration;
