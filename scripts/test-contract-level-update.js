// /home/nneessen/projects/commissionTracker/scripts/test-contract-level-update.js
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

async function testContractLevelUpdate() {
  console.log('Testing contract level update functionality...\n');

  try {
    // 1. First, get a test user
    const { data: users, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, contract_level')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('No users found in database');
      return;
    }

    const testUser = users[0];
    console.log('Test user:', {
      id: testUser.id,
      email: testUser.email,
      name: `${testUser.first_name} ${testUser.last_name}`,
      current_contract_level: testUser.contract_level
    });

    // 2. Update the contract level
    const newContractLevel = testUser.contract_level === 120 ? 130 : 120;
    console.log(`\nUpdating contract level from ${testUser.contract_level} to ${newContractLevel}...`);

    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ contract_level: newContractLevel })
      .eq('id', testUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating contract level:', updateError);
      return;
    }

    console.log('✅ Update successful!');
    console.log('Updated data:', {
      id: updateData.id,
      email: updateData.email,
      contract_level: updateData.contract_level
    });

    // 3. Verify the update persisted
    console.log('\nVerifying update persisted...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, email, contract_level')
      .eq('id', testUser.id)
      .single();

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }

    if (verifyData.contract_level === newContractLevel) {
      console.log('✅ Contract level successfully persisted!');
      console.log('Verified contract level:', verifyData.contract_level);
    } else {
      console.error('❌ Contract level did not persist correctly');
      console.log('Expected:', newContractLevel);
      console.log('Actual:', verifyData.contract_level);
    }

    // 4. Revert the change
    console.log('\nReverting to original contract level...');
    const { error: revertError } = await supabase
      .from('user_profiles')
      .update({ contract_level: testUser.contract_level })
      .eq('id', testUser.id);

    if (revertError) {
      console.error('Error reverting contract level:', revertError);
    } else {
      console.log('✅ Reverted to original contract level:', testUser.contract_level);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testContractLevelUpdate();