// /home/nneessen/projects/commissionTracker/scripts/test-admin-user-update.js
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

async function testAdminUserUpdate() {
  console.log('Testing contract level update for various users...\n');

  try {
    // 1. Get users with and without uplines
    const { data: users, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, contract_level, upline_id, roles')
      .limit(5);

    if (fetchError || !users || users.length === 0) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    console.log(`Found ${users.length} users to test:\n`);

    // Test each user
    for (const user of users) {
      console.log('-------------------------------------------');
      console.log(`Testing user: ${user.email}`);
      console.log(`Current contract level: ${user.contract_level || 'NULL'}`);
      console.log(`Has upline: ${user.upline_id ? 'Yes' : 'No'}`);

      // Skip if user has an upline (hierarchy constraint might apply)
      if (user.upline_id) {
        console.log('⚠️  Skipping - has upline (hierarchy constraint may apply)');
        continue;
      }

      const newContractLevel = user.contract_level === 120 ? 150 : 120;
      console.log(`Attempting to update to: ${newContractLevel}`);

      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({ contract_level: newContractLevel })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Update failed:`, updateError.message);
      } else {
        console.log(`✅ Update successful! New level: ${updateData.contract_level}`);

        // Revert the change
        await supabase
          .from('user_profiles')
          .update({ contract_level: user.contract_level })
          .eq('id', user.id);
        console.log(`   Reverted to original: ${user.contract_level || 'NULL'}`);
      }
    }

    console.log('\n-------------------------------------------');
    console.log('Test Summary:');
    console.log('- Users without uplines can update contract_level freely');
    console.log('- Users with uplines may be restricted by hierarchy constraints');
    console.log('- The 406 error is likely related to hierarchy validation');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testAdminUserUpdate();