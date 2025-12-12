#!/usr/bin/env node
// scripts/set-user-admin.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setUserAsAdmin(userEmail) {
  try {
    console.log(`Setting admin status for user: ${userEmail}`);

    // First, find the user by email in user_profiles table
    const { data: users, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, is_admin')
      .eq('email', userEmail)
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError);
      return;
    }

    if (!users || users.length === 0) {
      console.error(`❌ User with email "${userEmail}" not found`);
      return;
    }

    const user = users[0];
    console.log('Found user:', { id: user.id, email: user.email, currentAdminStatus: user.is_admin });

    // Update the user to be an admin
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_admin: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }

    console.log(`✅ Successfully set ${userEmail} as admin`);

    // Verify the update
    const { data: updatedUser, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, email, is_admin')
      .eq('id', user.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('✅ Verification successful:', updatedUser);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Check if email was provided as command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node scripts/set-user-admin.js <email>');
  console.log('Example: node scripts/set-user-admin.js nick@nickneessen.com');
  process.exit(1);
}

setUserAsAdmin(userEmail);