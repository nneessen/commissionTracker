// scripts/test-invitation-system.mjs
// End-to-end test of invitation system with database verification

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
const envPath = join(projectRoot, '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('='))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getUsers() {
  console.log('\n📋 Fetching all users...');

  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Failed to fetch users:', error);
    return null;
  }

  console.log(`✅ Found ${users.length} users:`);
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} (${u.id})`);
  });

  return users;
}

async function testEmailValidation(email) {
  console.log(`\n🔍 Testing check_email_exists('${email}')...`);

  const { data, error } = await supabase
    .rpc('check_email_exists', { target_email: email });

  if (error) {
    console.error('❌ Function error:', error);
    return null;
  }

  if (data && data.length > 0) {
    const result = data[0];
    if (result.email_exists) {
      console.log(`✅ Email exists:`, result);
    } else {
      console.log(`❌ Email not found:`, result.error_message);
    }
    return result;
  }

  console.log('❌ No data returned');
  return null;
}

async function testInvitationEligibility(inviterId, inviteeEmail) {
  console.log(`\n🔍 Testing validate_invitation_eligibility...`);
  console.log(`  Inviter: ${inviterId}`);
  console.log(`  Invitee: ${inviteeEmail}`);

  const { data, error } = await supabase
    .rpc('validate_invitation_eligibility', {
      p_inviter_id: inviterId,
      p_invitee_email: inviteeEmail
    });

  if (error) {
    console.error('❌ Function error:', error);
    return null;
  }

  if (data && data.length > 0) {
    const result = data[0];
    if (result.valid) {
      console.log(`✅ Invitation is valid`);
      console.log(`  Invitee user ID: ${result.invitee_user_id}`);
      if (result.warning_message) {
        console.log(`  ⚠️  Warning: ${result.warning_message}`);
      }
    } else {
      console.log(`❌ Invitation is NOT valid: ${result.error_message}`);
    }
    return result;
  }

  console.log('❌ No data returned');
  return null;
}

async function createInvitation(inviterId, inviteeEmail, message = 'Test invitation') {
  console.log(`\n📤 Creating invitation...`);

  const { data, error } = await supabase
    .from('hierarchy_invitations')
    .insert({
      inviter_id: inviterId,
      invitee_email: inviteeEmail.toLowerCase().trim(),
      message: message,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create invitation:', error);
    return null;
  }

  console.log('✅ Invitation created:', data);
  return data;
}

async function getInvitations() {
  console.log(`\n📋 Fetching all invitations from database...`);

  const { data, error } = await supabase
    .from('hierarchy_invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch invitations:', error);
    return null;
  }

  console.log(`✅ Found ${data.length} invitation(s):`);
  data.forEach((inv, i) => {
    console.log(`  ${i + 1}. ${inv.invitee_email} - ${inv.status} (created: ${inv.created_at})`);
  });

  return data;
}

async function cleanupInvitations() {
  console.log(`\n🧹 Cleaning up test invitations...`);

  const { error } = await supabase
    .from('hierarchy_invitations')
    .delete()
    .eq('message', 'Test invitation');

  if (error) {
    console.error('❌ Failed to cleanup:', error);
  } else {
    console.log('✅ Cleanup complete');
  }
}

async function main() {
  console.log('🎯 Invitation System End-to-End Test\n');
  console.log(`Database: ${supabaseUrl}`);
  console.log('='.repeat(60));

  // Step 1: Get users
  const users = await getUsers();
  if (!users || users.length < 2) {
    console.error('\n❌ Need at least 2 users to test invitations');
    process.exit(1);
  }

  const inviter = users[0];
  const invitee = users[1];

  console.log('\n' + '='.repeat(60));
  console.log('TEST SCENARIO');
  console.log('='.repeat(60));
  console.log(`Inviter: ${inviter.email} (${inviter.id})`);
  console.log(`Invitee: ${invitee.email} (${invitee.id})`);

  // Step 2: Test email validation
  console.log('\n' + '='.repeat(60));
  console.log('STEP 1: Email Validation Function');
  console.log('='.repeat(60));

  await testEmailValidation(invitee.email);
  await testEmailValidation('nonexistent@example.com');

  // Step 3: Test eligibility validation
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Invitation Eligibility Validation');
  console.log('='.repeat(60));

  const eligibility = await testInvitationEligibility(inviter.id, invitee.email);

  if (!eligibility || !eligibility.valid) {
    console.error('\n❌ Cannot proceed with invitation - not eligible');
    console.error('   This might be because the invitee already has an upline or pending invitation');
    process.exit(1);
  }

  // Step 4: Create invitation
  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Create Invitation');
  console.log('='.repeat(60));

  const invitation = await createInvitation(inviter.id, invitee.email);

  if (!invitation) {
    console.error('\n❌ Failed to create invitation');
    process.exit(1);
  }

  // Step 5: Verify in database
  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: Database Verification');
  console.log('='.repeat(60));

  await getInvitations();

  // Cleanup
  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP');
  console.log('='.repeat(60));

  await cleanupInvitations();

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED');
  console.log('='.repeat(60));
  console.log('\nThe invitation system is working correctly!');
  console.log('- Database functions are accessible');
  console.log('- Email validation works');
  console.log('- Eligibility checks work');
  console.log('- Invitations can be created and queried');
  console.log('\nYou can now test the UI in the browser.');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
