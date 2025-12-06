// /home/nneessen/projects/commissionTracker/scripts/check_nick_user.js
// Script to check and fix nick.neessen@gmail.com user

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAndFixNickUser() {
  console.log('\n🔍 Checking nick.neessen@gmail.com user...\n');

  // Check current state
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'nick.neessen@gmail.com')
    .single();

  if (error) {
    console.error('❌ Error fetching user:', error.message);
    return;
  }

  if (!user) {
    console.log('❌ User not found: nick.neessen@gmail.com');
    return;
  }

  console.log('📋 Current User State:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Roles:', user.roles);
  console.log('  Agent Status:', user.agent_status);
  console.log('  Approval Status:', user.approval_status);
  console.log('  Contract Level:', user.contract_level);
  console.log('  Is Admin:', user.is_admin);
  console.log('');

  // Check if user needs fixing
  const needsFix =
    !user.roles?.includes('active_agent') ||
    user.agent_status !== 'licensed' ||
    user.approval_status !== 'approved' ||
    !user.contract_level || user.contract_level < 50;

  if (!needsFix) {
    console.log('✅ User is correctly configured as an active agent!');
    return;
  }

  console.log('⚠️ User needs fixing. Updating...\n');

  // Fix the user
  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .update({
      roles: ['active_agent'],
      agent_status: 'licensed',
      approval_status: 'approved',
      contract_level: 100,
    })
    .eq('email', 'nick.neessen@gmail.com')
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating user:', updateError.message);
    return;
  }

  console.log('✅ User updated successfully!');
  console.log('\n📋 Updated User State:');
  console.log('  Roles:', updated.roles);
  console.log('  Agent Status:', updated.agent_status);
  console.log('  Approval Status:', updated.approval_status);
  console.log('  Contract Level:', updated.contract_level);
  console.log('');

  // Verify permissions
  console.log('🔐 Checking user permissions...');

  // Check if user has proper navigation permissions
  const { data: perms } = await supabase.rpc('get_user_permissions', {
    target_user_id: user.user_id || user.id
  });

  if (perms && perms.length > 0) {
    const navPerms = perms.filter(p => p.permission_code?.startsWith('nav.')).map(p => p.permission_code);
    console.log('  Navigation permissions:', navPerms.length > 0 ? navPerms : 'None');

    const hasFullAccess = navPerms.includes('nav.dashboard') &&
                          navPerms.includes('nav.policies') &&
                          navPerms.includes('nav.clients');

    if (hasFullAccess) {
      console.log('  ✅ User has full navigation access!');
    } else {
      console.log('  ⚠️ User is missing some navigation permissions');
    }
  } else {
    console.log('  ⚠️ Could not fetch permissions (may need to run as admin)');
  }

  console.log('\n✅ Done! The user should now have full access to the application.');
  console.log('🔄 Please have the user log out and log back in for changes to take effect.');
}

checkAndFixNickUser().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});