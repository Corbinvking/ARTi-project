#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing API route query logic...\n');
console.log('URL:', supabaseUrl);
console.log('Has Service Key:', !!supabaseKey);
console.log('');

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const userId = 'e9337ebd-df8c-4302-b03c-ee584aa8869f';

async function testQuery() {
  // This is the EXACT query from the API route
  const { data: userRoles, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  console.log('📋 Query result:', userRoles);
  console.log('❌ Query error:', roleError);
  
  if (userRoles) {
    console.log('\n✅ Found', userRoles.length, 'roles');
    console.log('Has admin?', userRoles.some((r) => r.role === 'admin'));
  }
}

testQuery().catch(console.error);

