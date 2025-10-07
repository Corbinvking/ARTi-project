#!/usr/bin/env node

/**
 * Stream Strategist Schema Deployment Script
 * 
 * This script deploys the complete Stream Strategist database schema to production
 * while maintaining the local-to-production mirror workflow.
 * 
 * Usage:
 *   node scripts/deploy-stream-strategist-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'production.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Make sure production.env file exists and is properly configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySchema() {
  console.log('🚀 Starting Stream Strategist Schema Deployment...');
  console.log(`📍 Target: ${supabaseUrl}`);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '017_stream_strategist_complete_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Loaded migration file: 017_stream_strategist_complete_schema.sql');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
          
          // Continue with non-critical errors (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate_object')) {
            console.log(`⚠️  Non-critical error, continuing...`);
            successCount++;
            errorCount--;
          }
        } else {
          successCount++;
        }
        
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 Deployment Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Stream Strategist schema deployed successfully!');
      console.log('🔗 All tables, policies, indexes, and functions are now available in production');
    } else {
      console.log('\n⚠️  Deployment completed with some errors');
      console.log('   Check the logs above for details');
    }
    
    // Verify key tables were created
    console.log('\n🔍 Verifying key tables...');
    
    const keyTables = [
      'creators',
      'campaign_ab_tests', 
      'ml_model_versions',
      'analytics_notes',
      'workflow_rules'
    ];
    
    for (const tableName of keyTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ Table ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ Table ${tableName}: Ready`);
        }
      } catch (err) {
        console.log(`❌ Table ${tableName}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

if (!isProduction) {
  console.log('⚠️  This script will modify the PRODUCTION database');
  console.log('   Add --production flag to confirm you want to proceed');
  console.log('   Or set NODE_ENV=production');
  process.exit(1);
}

deploySchema().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
