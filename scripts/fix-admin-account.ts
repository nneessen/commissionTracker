// /home/nneessen/projects/commissionTracker/scripts/fix-admin-account.ts
// Quick script to fix admin account approval status

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminEmail = 'nick@nickneessen.com';
const adminUserId = process.env.USER_ID!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminAccount() {
  console.log('🔧 Fixing admin account...');
  console.log(`Admin Email: ${adminEmail}`);
  console.log(`Admin User ID: ${adminUserId}`);

  // First, check if user_profiles table exists
  const { error: tableCheckError } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1);

  if (tableCheckError) {
    console.error('❌ user_profiles table does not exist!');
    console.error('You need to run the migration on your remote Supabase first.');
    console.error('Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new');
    console.error('And paste the contents of: supabase/migrations/20251120144703_add_user_approval_system.sql');
    process.exit(1);
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', adminUserId)
    .single();

  if (existingProfile) {
    console.log('✅ Profile exists, updating...');
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'approved',
        is_admin: true,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminUserId);

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError);
      process.exit(1);
    }
    console.log('✅ Admin profile updated successfully!');
  } else {
    console.log('📝 Creating new profile...');
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: adminUserId,
        email: adminEmail,
        approval_status: 'approved',
        is_admin: true,
        approved_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Failed to create profile:', insertError);
      process.exit(1);
    }
    console.log('✅ Admin profile created successfully!');
  }

  // Verify
  const { data: verifyProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', adminUserId)
    .single();

  console.log('\n✅ Admin account fixed!');
  console.log('Profile:', verifyProfile);
  console.log('\nYou should now be able to log in!');
}

fixAdminAccount().catch(console.error);
