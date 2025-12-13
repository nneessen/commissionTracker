#!/usr/bin/env node
// scripts/test-commission-function.js
// Test the getuser_commission_profile function

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testFunction() {
  console.log('Testing getuser_commission_profile function...\n');

  // First get a real user from the database
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, contract_comp_level')
    .limit(1);

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found in database');
    return;
  }

  const testUser = users[0];
  console.log(`Testing with user: ${testUser.email}`);
  console.log(`Contract level: ${testUser.contract_comp_level || 'Not set'}\n`);

  // Now test the function
  const { data, error } = await supabase.rpc('getuser_commission_profile', {
    puser_id: testUser.id,
    p_lookback_months: 12
  });

  if (error) {
    if (error.message.includes('User not found or contract level not configured')) {
      console.log('✅ Function exists and working!');
      console.log('Note: User has no contract level configured, which is expected for new users.');
    } else {
      console.error('❌ Function error:', error.message);
    }
  } else {
    console.log('✅ Function executed successfully!');
    console.log('\nResults:');
    console.log('- Contract Level:', data[0]?.contract_level);
    console.log('- Simple Average Rate:', data[0]?.simple_avg_rate);
    console.log('- Weighted Average Rate:', data[0]?.weighted_avg_rate);
    console.log('- Data Quality:', data[0]?.data_quality);
    console.log('- Product Breakdown:', JSON.stringify(data[0]?.product_breakdown, null, 2));
  }
}

testFunction().catch(console.error);