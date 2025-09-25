#!/usr/bin/env node

/**
 * Production API Testing Script
 * Tests all Supabase endpoints to diagnose routing issues
 */

// Using native Node.js fetch (available in Node 18+)

const PROD_BASE_URL = 'https://api.artistinfluence.com';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function testEndpoint(path, method = 'GET', body = null) {
  try {
    const url = `${PROD_BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`🔍 Testing: ${method} ${path}`);
    
    const response = await fetch(url, options);
    const status = response.status;
    const statusText = response.statusText;
    
    if (status === 404) {
      console.log(`❌ ${path}: 404 Not Found - Route missing`);
    } else if (status >= 200 && status < 300) {
      console.log(`✅ ${path}: ${status} Success`);
    } else {
      console.log(`⚠️  ${path}: ${status} ${statusText}`);
    }
    
    return { status, ok: response.ok };
    
  } catch (error) {
    console.log(`💥 ${path}: Connection failed - ${error.message}`);
    return { status: 0, ok: false, error: error.message };
  }
}

async function testProductionAPI() {
  console.log('🔍 TESTING PRODUCTION SUPABASE API ENDPOINTS\n');
  
  const tests = [
    // Basic health checks
    { path: '/', desc: 'Root endpoint' },
    { path: '/health', desc: 'Health check' },
    { path: '/healthz', desc: 'Health check (alt)' },
    
    // Kong API Gateway
    { path: '/kong', desc: 'Kong status' },
    
    // Auth endpoints (GoTrue)
    { path: '/auth/v1/health', desc: 'Auth health' },
    { path: '/auth/v1/settings', desc: 'Auth settings' },
    { path: '/auth/v1/admin/users', method: 'GET', desc: 'List auth users' },
    
    // REST API (PostgREST)
    { path: '/rest/v1/', desc: 'REST API root' },
    { path: '/rest/v1/orgs?select=count', desc: 'Orgs count' },
    { path: '/rest/v1/memberships?select=count', desc: 'Memberships count' },
    { path: '/rest/v1/spotify_campaigns?select=count', desc: 'Spotify campaigns count' },
    
    // Realtime
    { path: '/realtime/v1/health', desc: 'Realtime health' },
    
    // Storage
    { path: '/storage/v1/health', desc: 'Storage health' },
    
    // Meta
    { path: '/meta/health', desc: 'Meta health' }
  ];
  
  console.log('📊 ENDPOINT TEST RESULTS:');
  console.log('========================\n');
  
  const results = {
    working: [],
    missing: [],
    errors: []
  };
  
  for (const test of tests) {
    const result = await testEndpoint(test.path, test.method || 'GET');
    
    if (result.status === 404) {
      results.missing.push(test.path);
    } else if (result.ok) {
      results.working.push(test.path);
    } else {
      results.errors.push({ path: test.path, status: result.status, error: result.error });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('===========');
  console.log(`✅ Working endpoints: ${results.working.length}`);
  console.log(`❌ Missing endpoints: ${results.missing.length}`);
  console.log(`⚠️  Error endpoints: ${results.errors.length}`);
  
  if (results.working.length > 0) {
    console.log('\n✅ WORKING ENDPOINTS:');
    results.working.forEach(path => console.log(`   • ${path}`));
  }
  
  if (results.missing.length > 0) {
    console.log('\n❌ MISSING ENDPOINTS (404):');
    results.missing.forEach(path => console.log(`   • ${path}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  ERROR ENDPOINTS:');
    results.errors.forEach(item => console.log(`   • ${item.path}: ${item.status} ${item.error || ''}`));
  }
  
  // Diagnosis
  console.log('\n🔍 DIAGNOSIS:');
  if (results.missing.includes('/auth/v1/admin/users') && results.missing.includes('/rest/v1/orgs')) {
    console.log('❌ Major routing issue: Both Auth and REST APIs are missing');
    console.log('   This suggests Kong is not routing to Supabase services');
    console.log('   or Supabase services are not running properly');
  } else if (results.missing.includes('/auth/v1/admin/users')) {
    console.log('❌ Auth API (GoTrue) routing issue');
  } else if (results.missing.includes('/rest/v1/orgs')) {
    console.log('❌ REST API (PostgREST) routing issue');
  }
  
  console.log('\n🚀 RECOMMENDED ACTIONS:');
  console.log('1. Check if all Supabase services are running');
  console.log('2. Verify Kong API Gateway configuration');
  console.log('3. Check Docker network connectivity');
  console.log('4. Review Caddy proxy routing');
  
  return results;
}

if (require.main === module) {
  testProductionAPI().catch(console.error);
}

module.exports = { testProductionAPI };
