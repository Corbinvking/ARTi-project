#!/usr/bin/env node

console.log('🔧 TESTING PERMISSION UPDATE WORKAROUND');
console.log('=========================================');

async function testWorkaround() {
  try {
    // Test if we can at least create users with permissions (since that's working)
    console.log('\n1️⃣ Testing user creation with permissions...');
    
    const newUserData = {
      email: `test-permission-${Date.now()}@arti-demo.com`,
      password: 'TestPassword123!',
      name: 'Permission Test User',
      role: 'vendor',
      permissions: [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false }
      ]
    };
    
    const createResponse = await fetch('http://localhost:8080/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUserData)
    });
    
    if (createResponse.ok) {
      const userData = await createResponse.json();
      console.log('✅ User created successfully with permissions:', userData.user?.permissions);
      
      // Now let's check if permissions are in the database
      console.log('\n2️⃣ Checking if user appears in user list with permissions...');
      const usersResponse = await fetch('http://localhost:8080/api/admin/users');
      const usersData = await usersResponse.json();
      
      const createdUser = usersData.users?.find(u => u.email === newUserData.email);
      if (createdUser) {
        console.log('✅ User found in list with permissions:', createdUser.permissions);
        return createdUser;
      } else {
        console.log('❌ User not found in list');
      }
      
    } else {
      const errorText = await createResponse.text();
      console.log('❌ User creation failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkaround();
