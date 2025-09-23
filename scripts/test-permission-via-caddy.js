#!/usr/bin/env node

console.log('🔧 TESTING PERMISSION ENDPOINT VIA CADDY');
console.log('==========================================');

async function testPermissionViaCaddy() {
  try {
    // Test via Caddy (port 8080) since that's working
    console.log('\n1️⃣ Testing basic health via Caddy...');
    const healthResponse = await fetch('http://localhost:8080/api/health');
    console.log(`Health Status: ${healthResponse.status}`);
    
    if (!healthResponse.ok) {
      console.log('❌ Health check failed, API might not be ready');
      return;
    }
    
    console.log('✅ Health check passed');
    
    console.log('\n2️⃣ Testing admin users endpoint via Caddy...');
    const usersResponse = await fetch('http://localhost:8080/api/admin/users');
    console.log(`Users Status: ${usersResponse.status}`);
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log(`✅ Found ${usersData.users?.length || 0} users`);
      
      if (usersData.users && usersData.users.length > 0) {
        const testUser = usersData.users[0];
        console.log(`\n3️⃣ Testing permission update for user: ${testUser.email}`);
        
        const testPermissions = [
          { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
          { platform: 'spotify', can_read: true, can_write: true, can_delete: false }
        ];
        
        const permissionResponse = await fetch(`http://localhost:8080/api/admin/users/${testUser.id}/permissions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permissions: testPermissions })
        });
        
        console.log(`Permission Update Status: ${permissionResponse.status}`);
        
        if (permissionResponse.ok) {
          const result = await permissionResponse.json();
          console.log('✅ Permission update successful!', result);
        } else {
          const errorText = await permissionResponse.text();
          console.log('❌ Permission update failed:', errorText);
        }
      }
    } else {
      const errorText = await usersResponse.text();
      console.log('❌ Users endpoint failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPermissionViaCaddy();
