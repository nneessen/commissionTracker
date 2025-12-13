// /home/nneessen/projects/commissionTracker/scripts/test-userservice-update.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserServiceUpdate() {
  console.log('Testing UserService update method simulation...\n');

  try {
    // 1. Get a test user
    const { data: users, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (fetchError || !users || users.length === 0) {
      console.error('Error fetching user:', fetchError);
      return;
    }

    const testUser = users[0];
    console.log('Test user:', {
      id: testUser.id,
      email: testUser.email,
      name: `${testUser.first_name} ${testUser.last_name}`,
      contract_level: testUser.contract_level,
      roles: testUser.roles
    });

    // 2. Simulate the UserService update method with contract_level
    const newContractLevel = testUser.contract_level === 120 ? 140 : 120;
    console.log(`\nSimulating UserService.update() with contract_level: ${newContractLevel}...`);

    // This simulates what happens in the fixed UserService.update method
    const updates = {
      contract_level: newContractLevel,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    };

    // Simulate the update query (matching the fixed UserService.update)
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', testUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed with error:', updateError);

      // Try the fallback approach (like in UserService)
      if (updateError.code === 'PGRST116') {
        console.log('Trying fallback with maybeSingle...');
        const { data: retryData, error: retryError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', testUser.id)
          .select()
          .maybeSingle();

        if (!retryError && retryData) {
          console.log('✅ Fallback update successful!');
          console.log('Updated contract_level:', retryData.contract_level);
        }
      }
      return;
    }

    console.log('✅ Update successful!');
    console.log('Updated data:', {
      id: updateData.id,
      email: updateData.email,
      contract_level: updateData.contract_level
    });

    // 3. Verify persistence
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('contract_level')
      .eq('id', testUser.id)
      .single();

    if (verifyError) {
      console.error('Error verifying:', verifyError);
      return;
    }

    if (verifyData.contract_level === newContractLevel) {
      console.log('✅ Contract level persisted correctly:', verifyData.contract_level);
    } else {
      console.error('❌ Contract level did not persist');
      console.log('Expected:', newContractLevel, 'Got:', verifyData.contract_level);
    }

    // 4. Test with additional fields (like from EditUserDialog)
    console.log('\nTesting update with multiple fields (simulating EditUserDialog)...');

    const dialogUpdates = {
      contract_level: testUser.contract_level, // Revert to original
      phone: testUser.phone || '555-1234',
      city: testUser.city || 'Test City'
    };

    const { data: dialogData, error: dialogError } = await supabase
      .from('user_profiles')
      .update(dialogUpdates)
      .eq('id', testUser.id)
      .select()
      .single();

    if (dialogError) {
      console.error('❌ Dialog simulation failed:', dialogError);
    } else {
      console.log('✅ Dialog simulation successful!');
      console.log('Reverted contract_level to:', dialogData.contract_level);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testUserServiceUpdate();