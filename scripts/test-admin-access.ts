/**
 * Test script to verify admin user can access their profile and User Management
 * Run with: npx tsx scripts/test-admin-access.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminAccess() {
  console.log('🔍 Testing Admin Access...\n');

  // Test 1: Get current user
  console.log('1️⃣ Getting current authenticated user...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Not authenticated or error getting user:', authError);
    console.log('\n💡 Please ensure you are logged in to test admin access');
    return;
  }

  console.log(`✅ Authenticated as: ${user.email} (ID: ${user.id})\n`);

  // Test 2: Fetch user profile
  console.log('2️⃣ Fetching user profile from user_profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
    console.log('\n🔍 Detailed error:');
    console.log(JSON.stringify(profileError, null, 2));

    // Test if it's an RLS issue
    if (profileError.code === 'PGRST116' || profileError.message.includes('0 rows')) {
      console.log('\n⚠️  This looks like an RLS (Row Level Security) issue!');
      console.log('The query returned 0 rows, which means RLS policies are blocking access.');
    }

    return;
  }

  console.log('✅ Profile fetched successfully:\n');
  console.log(`   Email: ${profile.email}`);
  console.log(`   Is Admin: ${profile.is_admin}`);
  console.log(`   Approval Status: ${profile.approval_status}`);
  console.log(`   Created: ${profile.created_at}\n`);

  // Test 3: Check admin status
  console.log('3️⃣ Checking admin status...');
  if (profile.is_admin) {
    console.log('✅ User IS an admin\n');
  } else {
    console.log('❌ User is NOT an admin\n');
  }

  // Test 4: Try to fetch all users (admin operation)
  console.log('4️⃣ Testing admin operation: Fetch all users...');
  const { data: allUsers, error: usersError } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ Error fetching all users:', usersError.message);
  } else {
    console.log(`✅ Successfully fetched ${allUsers?.length || 0} user(s)\n`);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Authenticated: ✅`);
  console.log(`Profile Access: ${profileError ? '❌' : '✅'}`);
  console.log(`Is Admin: ${profile?.is_admin ? '✅' : '❌'}`);
  console.log(`Can Access User Management: ${profile?.is_admin && !profileError ? '✅' : '❌'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (profile?.is_admin && !profileError) {
    console.log('🎉 Everything looks good! The User Management tab SHOULD be visible.');
    console.log('\nIf the tab is still not showing:');
    console.log('  1. Check browser console for JavaScript errors');
    console.log('  2. Clear browser cache and hard refresh (Cmd+Shift+R)');
    console.log('  3. Check if TanStack Query is returning loading state indefinitely');
  }
}

testAdminAccess().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
