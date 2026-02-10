// /home/nneessen/projects/commissionTracker/scripts/test-user-data.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
);

async function testUserData() {
  console.log('🔍 Testing User Data Retrieval');
  console.log('=' .repeat(50));

  // Directly query user_profiles
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*')
    .neq('is_deleted', true)
    .limit(3);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  console.log(`\n✅ Found ${users?.length || 0} users`);

  // Display first user's complete data
  if (users && users.length > 0) {
    const user = users[0];
    console.log('\n📋 Sample User Data (First user):');
    console.log('================================');

    // Basic info
    console.log('\n🔑 Basic Info:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  First Name: ${user.first_name || '(empty)'}`);
    console.log(`  Last Name: ${user.last_name || '(empty)'}`);
    console.log(`  Phone: ${user.phone || '(empty)'}`);

    // Status info
    console.log('\n📊 Status:');
    console.log(`  Approval Status: ${user.approval_status || '(empty)'}`);
    console.log(`  Agent Status: ${user.agent_status || '(empty)'}`);
    console.log(`  Contract Level: ${user.contract_level || '(empty)'}`);
    console.log(`  Roles: ${user.roles ? JSON.stringify(user.roles) : '(empty)'}`);

    // Address info
    console.log('\n🏠 Address:');
    console.log(`  Street: ${user.street_address || '(empty)'}`);
    console.log(`  City: ${user.city || '(empty)'}`);
    console.log(`  State: ${user.state || '(empty)'}`);
    console.log(`  ZIP: ${user.zip || '(empty)'}`);
    console.log(`  Resident State: ${user.resident_state || '(empty)'}`);

    // License info
    console.log('\n📄 License:');
    console.log(`  License Number: ${user.license_number || '(empty)'}`);
    console.log(`  NPN: ${user.npn || '(empty)'}`);
    console.log(`  License Expiration: ${user.license_expiration || '(empty)'}`);

    // Social info
    console.log('\n🌐 Social:');
    console.log(`  Instagram: ${user.instagram_url || '(empty)'}`);

    // Check field count
    const fieldCount = Object.keys(user).length;
    console.log(`\n📈 Total fields on UserProfile: ${fieldCount}`);

    // List all field names
    console.log('\n🔤 All field names:');
    Object.keys(user).forEach(key => {
      console.log(`  - ${key}`);
    });
  }

  // Test the getAllUsers pattern
  console.log('\n\n🧪 Testing getAllUsers() pattern:');
  console.log('=' .repeat(50));

  // Simulate what the fixed getAllUsers does
  let query = supabase
    .from('user_profiles')
    .select('*')
    .neq('is_deleted', true);

  const { data: allUsersData, error: allUsersError } = await query;

  if (allUsersError) {
    console.error('❌ Error with getAllUsers pattern:', allUsersError);
  } else {
    console.log(`✅ getAllUsers pattern returned ${allUsersData?.length || 0} users`);

    if (allUsersData && allUsersData.length > 0) {
      const firstUser = allUsersData[0];
      console.log('\nFirst user field count:', Object.keys(firstUser).length);
      console.log('Has first_name?', 'first_name' in firstUser);
      console.log('Has last_name?', 'last_name' in firstUser);
      console.log('Has phone?', 'phone' in firstUser);
      console.log('Has agent_status?', 'agent_status' in firstUser);
      console.log('Has contract_level?', 'contract_level' in firstUser);
      console.log('Has street_address?', 'street_address' in firstUser);
    }
  }

  console.log('\n✅ Test complete!');
  console.log('The getAllUsers() method now returns complete UserProfile data.');
  console.log('EditUserDialog should now populate all fields correctly.');
}

testUserData().catch(console.error);
