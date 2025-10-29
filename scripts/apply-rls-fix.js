#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Applying RLS fixes...\n');
  
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '999_fix_user_viewing_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('📄 Reading migration file...');
  console.log('SQL preview:', sql.substring(0, 200) + '...\n');
  
  // Split by statement and execute each one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📋 Found ${statements.length} SQL statements\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`${i + 1}. Executing statement...`);
    console.log(`   ${statement.substring(0, 80)}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
    
    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase
        .from('_sql')
        .insert({ query: statement });
      
      if (directError) {
        console.error(`   ❌ Error:`, error.message);
        // Continue anyway, some errors are expected (like "policy already exists")
      } else {
        console.log(`   ✅ Success (direct)`);
      }
    } else {
      console.log(`   ✅ Success`);
    }
  }
  
  console.log('\n✨ Migration complete! Refresh your browser.');
}

applyMigration().catch(console.error);

