import { createClient } from '@supabase/supabase-js';

console.log('\n================================================================================');
console.log('🔍 CHECKING SUPABASE CONFIGURATION');
console.log('================================================================================\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Variables:\n');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
if (supabaseUrl) console.log(`      → ${supabaseUrl}`);

console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✅' : '❌'}`);
if (anonKey) {
  console.log(`      → ${anonKey.substring(0, 20)}...${anonKey.substring(anonKey.length - 10)}`);
  console.log(`      → Length: ${anonKey.length} chars`);
}

console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅' : '❌'}`);
if (serviceRoleKey) {
  console.log(`      → ${serviceRoleKey.substring(0, 20)}...${serviceRoleKey.substring(serviceRoleKey.length - 10)}`);
  console.log(`      → Length: ${serviceRoleKey.length} chars`);
}

console.log('\n================================================================================');

// Test connections
if (supabaseUrl && anonKey) {
  console.log('\n🧪 Testing ANON KEY connection...\n');
  
  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { count, error } = await supabaseAnon
      .from('spotify_campaigns')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ ANON KEY Error:', error.message);
      console.log('   Code:', error.code);
    } else {
      console.log(`   ✅ ANON KEY works! Found ${count} campaigns`);
    }
  } catch (error) {
    console.log('   ❌ ANON KEY Connection failed:', error.message);
  }
} else {
  console.log('\n⚠️  Cannot test ANON KEY - missing URL or key\n');
}

if (supabaseUrl && serviceRoleKey) {
  console.log('\n🧪 Testing SERVICE ROLE KEY connection...\n');
  
  try {
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);
    const { count, error } = await supabaseService
      .from('spotify_campaigns')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ SERVICE ROLE Error:', error.message);
    } else {
      console.log(`   ✅ SERVICE ROLE works! Found ${count} campaigns`);
    }
  } catch (error) {
    console.log('   ❌ SERVICE ROLE Connection failed:', error.message);
  }
} else {
  console.log('\n⚠️  Cannot test SERVICE ROLE - missing URL or key\n');
}

console.log('\n================================================================================');
console.log('💡 RECOMMENDATIONS');
console.log('================================================================================\n');

if (!anonKey) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing!');
  console.log('   This is required for frontend access.');
  console.log('   Get it from: supabase status OR .env.local\n');
}

if (!supabaseUrl) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL is missing!');
  console.log('   Get it from: supabase status OR .env.local\n');
}

if (anonKey && anonKey.split('.').length !== 3) {
  console.log('⚠️  ANON KEY format looks invalid (should be JWT with 3 parts)');
  console.log('   Example: eyJhbGc...xxxxx.eyJpc3M...xxxxx.xxxxx\n');
}

console.log('');

