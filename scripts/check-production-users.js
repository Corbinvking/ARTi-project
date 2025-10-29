#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking production users...');
console.log(`   URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsers() {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📋 Found ${users.length} users in production:\n`);
    
    users.forEach(user => {
      console.log(`   👤 ${user.email}`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`      Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`      Metadata:`, user.user_metadata);
      console.log('');
    });
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

checkUsers();

