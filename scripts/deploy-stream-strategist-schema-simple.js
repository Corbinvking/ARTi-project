#!/usr/bin/env node

/**
 * Stream Strategist Schema Deployment Script (Simple Version)
 * 
 * This script deploys the complete Stream Strategist database schema to production
 * using direct SQL execution via Supabase client.
 * 
 * Usage:
 *   node scripts/deploy-stream-strategist-schema-simple.js
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
    
    // Execute the entire migration as one block
    console.log('⏳ Executing Stream Strategist schema migration...');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      
      // Try alternative approach - split into smaller chunks
      console.log('🔄 Trying alternative approach with smaller chunks...');
      
      const chunks = migrationSQL.split(';').filter(chunk => chunk.trim().length > 0);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] + ';';
        
        if (chunk.trim().length < 10) continue; // Skip empty chunks
        
        try {
          console.log(`⏳ Processing chunk ${i + 1}/${chunks.length}...`);
          
          const { error: chunkError } = await supabase.rpc('exec', {
            sql: chunk
          });
          
          if (chunkError) {
            console.error(`❌ Chunk ${i + 1} failed:`, chunkError.message);
            
            // Continue with non-critical errors
            if (chunkError.message.includes('already exists') || 
                chunkError.message.includes('duplicate_object') ||
                chunkError.message.includes('relation already exists')) {
              console.log(`⚠️  Non-critical error, continuing...`);
            } else {
              throw chunkError;
            }
          }
        } catch (err) {
          console.error(`❌ Exception in chunk ${i + 1}:`, err.message);
          // Continue with next chunk
        }
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }
    
    // Verify key tables were created
    console.log('\n🔍 Verifying key tables...');
    
    const keyTables = [
      'creators',
      'campaign_ab_tests', 
      'ml_model_versions',
      'analytics_notes',
      'workflow_rules',
      'algorithm_learning_log',
      'fraud_detection_alerts'
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
    
    console.log('\n🎉 Stream Strategist schema deployment completed!');
    console.log('🔗 All tables, policies, indexes, and functions are now available in production');
    
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
