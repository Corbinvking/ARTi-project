#!/usr/bin/env node

console.log('🔍 TESTING PERMISSION UPDATE ENDPOINT');
console.log('=====================================');

async function testPermissionEndpoint() {
  try {
    // First get users to get a valid user ID
    console.log('\n1️⃣ Getting users...');
    const usersResponse = await fetch('http://localhost:8080/api/admin/users');
    const usersData = await usersResponse.json();
    
    if (!usersData.users || usersData.users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const testUser = usersData.users[0];
    console.log(`✅ Found test user: ${testUser.email} (ID: ${testUser.id})`);
    
    // Test the permission update endpoint
    console.log('\n2️⃣ Testing permission update endpoint...');
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
    
    console.log(`Status: ${permissionResponse.status}`);
    
    if (permissionResponse.ok) {
      const permissionData = await permissionResponse.json();
      console.log('✅ Permission update successful:', permissionData);
    } else {
      const errorText = await permissionResponse.text();
      console.log('❌ Permission update failed:', errorText);
      
      // Check if the route exists by testing OPTIONS
      console.log('\n3️⃣ Testing if route exists with OPTIONS...');
      const optionsResponse = await fetch(`http://localhost:8080/api/admin/users/${testUser.id}/permissions`, {
        method: 'OPTIONS'
      });
      console.log(`OPTIONS Status: ${optionsResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPermissionEndpoint();
