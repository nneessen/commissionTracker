// /home/nneessen/projects/commissionTracker/migration-tools/src/find-user.ts
import {createClient} from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const oldSupabase = createClient(
  process.env.OLD_SUPABASE_URL!,
  process.env.OLD_SUPABASE_SERVICE_KEY!
);

const newSupabase = createClient(
  process.env.NEW_SUPABASE_URL!,
  process.env.NEW_SUPABASE_SERVICE_KEY!
);

async function findUser(email: string) {
  console.log(`\n🔍 Searching for user: ${email}\n`);

  // Search in OLD system (selfmade)
  console.log('📁 OLD SYSTEM (selfmade):');
  console.log('─'.repeat(60));

  const { data: oldAgents, error: oldError } = await oldSupabase
    .from('agents')
    .select('user_id, full_name, created_at, role')
    .or(`full_name.ilike.%${email}%`);

  if (oldError) {
    console.error('❌ Error querying old system:', oldError.message);
  } else if (!oldAgents || oldAgents.length === 0) {
    console.log('⚠️  No user found with email in agents table');
    console.log('   Trying to find by associated deals...\n');

    // Try to find via deals table
    const { data: deals } = await oldSupabase
      .from('deals')
      .select('user_id, client_email, client_name')
      .eq('client_email', email)
      .limit(1);

    if (deals && deals.length > 0) {
      const userId = deals[0].user_id;
      const { data: agent } = await oldSupabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (agent) {
        console.log(`✅ Found user via client email match:`);
        console.log(`   User ID: ${agent.user_id}`);
        console.log(`   Name: ${agent.full_name || 'N/A'}`);
        console.log(`   Role: ${agent.role}`);
        console.log(`   Created: ${agent.created_at}`);

        // Count their data
        const { count } = await oldSupabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', agent.user_id);

        console.log(`   📊 Total deals: ${count || 0}\n`);
      }
    } else {
      console.log('❌ User not found in old system\n');
    }
  } else {
    console.log(`✅ Found ${oldAgents.length} matching user(s):\n`);
    for (const agent of oldAgents) {
      console.log(`   User ID: ${agent.user_id}`);
      console.log(`   Name: ${agent.full_name || 'N/A'}`);
      console.log(`   Role: ${agent.role}`);
      console.log(`   Created: ${agent.created_at}`);

      // Count their data
      const { count } = await oldSupabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', agent.user_id);

      console.log(`   📊 Total deals: ${count || 0}\n`);
    }
  }

  // Search in NEW system (commissionTracker)
  console.log('📁 NEW SYSTEM (commissionTracker):');
  console.log('─'.repeat(60));

  const { data: newUsers, error: newError } = await newSupabase
    .from('user_profiles')
    .select('user_id, email, first_name, last_name, created_at')
    .eq('email', email);

  if (newError) {
    console.error('❌ Error querying new system:', newError.message);
  } else if (!newUsers || newUsers.length === 0) {
    console.log('⚠️  User does NOT exist in new system yet');
    console.log('   👉 User must sign up at commissionTracker first!\n');
  } else {
    console.log(`✅ Found user in new system:\n`);
    for (const user of newUsers) {
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`);
      console.log(`   Created: ${user.created_at}`);

      // Check for existing data
      const { count: policyCount } = await newSupabase
        .from('policies')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id);

      const { count: clientCount } = await newSupabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id);

      console.log(`   📊 Existing policies: ${policyCount || 0}`);
      console.log(`   📊 Existing clients: ${clientCount || 0}`);

      if (policyCount && policyCount > 0) {
        console.log(`   ⚠️  WARNING: User already has data in new system!`);
      }
      console.log();
    }
  }

  console.log('═'.repeat(60));
  console.log('💡 Next Steps:');
  console.log('─'.repeat(60));
  console.log('1. If user exists in BOTH systems → ready to migrate');
  console.log('2. If user missing from NEW system → have them sign up first');
  console.log('3. Create user-mapping.csv with old_user_id,new_user_id');
  console.log('4. Run: npm run migrate');
  console.log('═'.repeat(60));
}

// Get email from command line args
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npm run find-user andrewengel1999@gmail.com');
  process.exit(1);
}

findUser(email).catch(console.error);
