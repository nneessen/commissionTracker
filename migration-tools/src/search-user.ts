// /home/nneessen/projects/commissionTracker/migration-tools/src/search-user.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const oldSupabase = createClient(
  process.env.OLD_SUPABASE_URL!,
  process.env.OLD_SUPABASE_SERVICE_KEY!
);

async function searchUser(searchTerm: string) {
  console.log(`\n🔍 Searching OLD system for: "${searchTerm}"\n`);

  // Search in agents table by email-like pattern in full_name
  console.log('📋 Checking agents table (by full_name)...');
  const { data: agentsByName } = await oldSupabase
    .from('agents')
    .select('*')
    .ilike('full_name', `%${searchTerm}%`);

  if (agentsByName && agentsByName.length > 0) {
    console.log(`✅ Found ${agentsByName.length} agent(s):`);
    agentsByName.forEach(agent => {
      console.log(`   - ${agent.full_name} (${agent.user_id})`);
    });
  } else {
    console.log('   No matches\n');
  }

  // Search in profiles table
  console.log('📋 Checking profiles table...');
  const { data: profiles } = await oldSupabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${searchTerm}%`);

  if (profiles && profiles.length > 0) {
    console.log(`✅ Found ${profiles.length} profile(s):`);
    profiles.forEach(profile => {
      console.log(`   - ${profile.username} (${profile.id})`);
    });
  } else {
    console.log('   No matches\n');
  }

  // Search in deals by client_email
  console.log('📋 Checking deals table (by client_email)...');
  const { data: dealsByEmail } = await oldSupabase
    .from('deals')
    .select('user_id, client_name, client_email')
    .ilike('client_email', `%${searchTerm}%`)
    .limit(5);

  if (dealsByEmail && dealsByEmail.length > 0) {
    console.log(`✅ Found ${dealsByEmail.length} deal(s) with matching client email:`);
    const uniqueUserIds = [...new Set(dealsByEmail.map(d => d.user_id))];

    for (const userId of uniqueUserIds) {
      const { data: agent } = await oldSupabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { count } = await oldSupabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      console.log(`\n   👤 AGENT: ${agent?.full_name || 'Unknown'}`);
      console.log(`      User ID: ${userId}`);
      console.log(`      Total Deals: ${count}`);
      console.log(`      Sample clients with this email: ${dealsByEmail.filter(d => d.user_id === userId).map(d => d.client_name).join(', ')}`);
    }
  } else {
    console.log('   No matches\n');
  }

  // Search auth.users directly (if accessible)
  console.log('📋 Checking auth.users table...');
  const { data: authUsers, error } = await oldSupabase
    .from('users')
    .select('*')
    .ilike('email', `%${searchTerm}%`);

  if (error) {
    console.log(`   ⚠️  Cannot access: ${error.message}\n`);
  } else if (authUsers && authUsers.length > 0) {
    console.log(`✅ Found ${authUsers.length} auth user(s):`);
    authUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
    });
  } else {
    console.log('   No matches\n');
  }

  // List ALL agents to help identify
  console.log('\n📋 ALL AGENTS IN SYSTEM (for reference):');
  console.log('─'.repeat(80));
  const { data: allAgents } = await oldSupabase
    .from('agents')
    .select('user_id, full_name, role')
    .order('full_name');

  if (allAgents) {
    allAgents.forEach(agent => {
      console.log(`   ${agent.full_name || 'Unnamed'} - ${agent.user_id}`);
    });
  }
}

const searchTerm = process.argv[2];
if (!searchTerm) {
  console.error('❌ Please provide a search term');
  console.log('Usage: npm run search-user <email or name>');
  process.exit(1);
}

searchUser(searchTerm).catch(console.error);
