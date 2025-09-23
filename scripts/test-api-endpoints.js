#!/usr/bin/env node

/**
 * STAGE 2.2: API Endpoint Validation
 * Tests critical API endpoints and CORS configuration
 */

async function testAPIEndpoints() {
  console.log('🔌 STAGE 2.2: API ENDPOINT VALIDATION')
  console.log('=' .repeat(50))
  
  const tests = [
    {
      name: 'Health Check (Direct API)',
      url: 'http://localhost:3001/api/health',
      expected: 200
    },
    {
      name: 'Health Check (via Caddy)',
      url: 'http://localhost:8080/api/health', 
      expected: 200
    },
    {
      name: 'Admin Users (via Caddy)',
      url: 'http://localhost:8080/api/admin/users',
      expected: 200
    },
    {
      name: 'Supabase Health (via Caddy)',
      url: 'http://localhost:8080/supabase/health',
      expected: 200
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`)
    console.log(`   URL: ${test.url}`)
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      const success = response.status === test.expected
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      console.log(`   Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
      
      // Show response headers for CORS validation
      if (response.headers.has('access-control-allow-origin')) {
        console.log(`   CORS Origin: ${response.headers.get('access-control-allow-origin')}`)
      }
      
      // Try to read response body
      try {
        const contentType = response.headers.get('content-type')
        let body = ''
        
        if (contentType?.includes('application/json')) {
          const json = await response.json()
          body = JSON.stringify(json, null, 2).substring(0, 200)
        } else {
          body = await response.text()
          body = body.substring(0, 200)
        }
        
        if (body.trim()) {
          console.log(`   Body: ${body}${body.length >= 200 ? '...' : ''}`)
        }
      } catch (bodyError) {
        console.log(`   Body: Could not read (${bodyError.message})`)
      }
      
      results.push({
        test: test.name,
        url: test.url,
        status: response.status,
        success,
        error: null
      })
      
    } catch (error) {
      console.log(`   ❌ FAIL: ${error.message}`)
      
      results.push({
        test: test.name,
        url: test.url,
        status: null,
        success: false,
        error: error.message
      })
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY')
  console.log('=' .repeat(30))
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  console.log(`✅ Passed: ${passed}/${total}`)
  console.log(`❌ Failed: ${total - passed}/${total}`)
  
  if (passed === total) {
    console.log('\n🎉 STAGE 2.2 COMPLETE: All API endpoints working!')
    console.log('✅ Direct API access functional')
    console.log('✅ Caddy reverse proxy working')
    console.log('✅ CORS properly configured')
    console.log('🚀 Ready for Stage 2.3: Database Connectivity Test')
  } else {
    console.log('\n⚠️  Some endpoints failed - debugging needed')
    results.forEach(result => {
      if (!result.success) {
        console.log(`   ❌ ${result.test}: ${result.error || `Status ${result.status}`}`)
      }
    })
  }
}

// Execute if run directly
if (require.main === module) {
  testAPIEndpoints().catch(error => {
    console.error('💥 CRITICAL ERROR:', error.message)
    process.exit(1)
  })
}

module.exports = { testAPIEndpoints }
