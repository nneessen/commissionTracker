// scripts/check-invitation.mjs
// Check the specific invitation and why it's not showing

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const envPath = join(projectRoot, '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('='))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const invitationId = 'f9a42f91-9906-4e38-b882-c733c5b94e7b';
  const inviteeEmail = 'nickneessen.ffl@gmail.com';

  console.log('🔍 Checking invitation:', invitationId);
  console.log('📧 Expected invitee:', inviteeEmail);
  console.log('='.repeat(60));

  // Check the invitation exists
  const { data: invitation, error: invError } = await supabase
    .from('hierarchy_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (invError) {
    console.error('❌ Failed to fetch invitation:', invError);
    return;
  }

  console.log('\n📋 Invitation Record:');
  console.log(JSON.stringify(invitation, null, 2));

  // Check if invitee_id was set
  if (!invitation.invitee_id) {
    console.log('\n⚠️  WARNING: invitee_id is NULL!');
    console.log('The trigger set_invitee_id_on_insert may not have worked.');
  } else {
    console.log('\n✅ invitee_id is set:', invitation.invitee_id);
  }

  // Get the user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('❌ Failed to fetch users:', userError);
    return;
  }

  const user = users.find(u => u.email === inviteeEmail);

  if (!user) {
    console.error('❌ User not found with email:', inviteeEmail);
    return;
  }

  console.log('\n👤 User Record:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);

  // Check if invitee_id matches
  if (invitation.invitee_id !== user.id) {
    console.log('\n❌ MISMATCH!');
    console.log(`  Invitation invitee_id: ${invitation.invitee_id}`);
    console.log(`  Actual user id: ${user.id}`);
  } else {
    console.log('\n✅ invitee_id matches user id');
  }

  // Try to query as the invitee would
  console.log('\n🔍 Testing query as invitee would see it...');

  const { data: invitations, error: queryError } = await supabase
    .from('hierarchy_invitations')
    .select('*')
    .eq('invitee_id', user.id)
    .eq('status', 'pending');

  if (queryError) {
    console.error('❌ Query failed:', queryError);
  } else {
    console.log(`✅ Query returned ${invitations.length} invitation(s)`);
    invitations.forEach((inv, i) => {
      console.log(`  ${i + 1}. ${inv.invitee_email} - ${inv.status}`);
    });
  }

  // Check RLS policies
  console.log('\n🔒 Checking RLS policies...');

  const { data: policies, error: policyError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'hierarchy_invitations');

  if (policyError) {
    console.error('❌ Failed to fetch policies:', policyError);
  } else {
    console.log(`Found ${policies?.length || 0} RLS policies`);
    policies?.forEach(p => {
      console.log(`  - ${p.policyname}: ${p.cmd} for ${p.roles}`);
    });
  }
}

main().catch(console.error);
