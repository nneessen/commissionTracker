// /home/nneessen/projects/commissionTracker/migration-tools/src/list-all-users.ts
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

async function listAllUsers() {
  console.log('\n📋 ALL USERS IN OLD SYSTEM (selfmade):');
  console.log('═'.repeat(80));

  const { data: oldAgents, error: oldError } = await oldSupabase
    .from('agents')
    .select('user_id, full_name, role, created_at')
    .order('full_name');

  if (oldError) {
    console.error('❌ Error:', oldError.message);
  } else if (oldAgents) {
    for (const agent of oldAgents) {
      const { count } = await oldSupabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', agent.user_id);

      console.log(`\n👤 ${agent.full_name || 'Unnamed'}`);
      console.log(`   ID: ${agent.user_id}`);
      console.log(`   Role: ${agent.role}`);
      console.log(`   Deals: ${count || 0}`);
    }
    console.log(`\n📊 Total: ${oldAgents.length} users\n`);
  }

  console.log('\n📋 ALL USERS IN NEW SYSTEM (commissionTracker):');
  console.log('═'.repeat(80));

  const { data: newUsers, error: newError } = await newSupabase
    .from('user_profiles')
    .select('user_id, email, first_name, last_name, created_at')
    .order('email');

  if (newError) {
    console.error('❌ Error:', newError.message);
  } else if (newUsers) {
    for (const user of newUsers) {
      const { count: policies } = await newSupabase
        .from('policies')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id);

      console.log(`\n👤 ${user.email}`);
      console.log(`   ID: ${user.user_id}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`);
      console.log(`   Policies: ${policies || 0}`);
    }
    console.log(`\n📊 Total: ${newUsers.length} users\n`);
  }
}

listAllUsers().catch(console.error);
