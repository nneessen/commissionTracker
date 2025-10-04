#!/usr/bin/env node

// Quick test script to verify policy creation works with RLS

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testPolicyCreation() {
  console.log('Testing policy creation with RLS...\n');

  // 1. First sign in to get a valid session
  console.log('1. Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Replace with your test user email
    password: 'test123' // Replace with your test user password
  });

  if (authError) {
    console.error('Authentication failed:', authError);
    console.log('\nPlease update the email and password in the script with valid credentials.');
    return;
  }

  console.log('✓ Authenticated as:', authData.user.email);
  console.log('  User ID:', authData.user.id);

  // 2. Create or find a test client
  console.log('\n2. Creating test client...');
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: 'Test Client',
      email: 'testclient@example.com',
      phone: '555-0123',
      address: { state: 'CA', city: 'San Francisco' },
      user_id: authData.user.id
    })
    .select()
    .single();

  if (clientError && clientError.code !== '23505') { // Ignore duplicate key errors
    console.error('Failed to create client:', clientError);
    return;
  }

  let clientId = clientData?.id;

  // If client creation failed due to duplicate, find the existing one
  if (!clientId) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('name', 'Test Client')
      .eq('user_id', authData.user.id)
      .single();

    clientId = existingClient?.id;
  }

  console.log('✓ Client ready with ID:', clientId);

  // 3. Get a carrier ID for testing
  console.log('\n3. Getting carrier...');
  const { data: carriers, error: carrierError } = await supabase
    .from('carriers')
    .select('id, name')
    .limit(1);

  if (carrierError || !carriers?.length) {
    console.error('Failed to get carriers:', carrierError);
    return;
  }

  const carrierId = carriers[0].id;
  console.log('✓ Using carrier:', carriers[0].name, `(${carrierId})`);

  // 4. Create a test policy with all required fields
  console.log('\n4. Creating policy...');
  const policyData = {
    policy_number: `TEST-${Date.now()}`,
    status: 'active',
    client_id: clientId, // Foreign key to clients table
    user_id: authData.user.id, // CRITICAL: Required for RLS
    carrier_id: carrierId,
    product: 'term', // Product type enum
    effective_date: new Date().toISOString().split('T')[0],
    term_length: 20,
    annual_premium: 1200,
    monthly_premium: 100,
    payment_frequency: 'monthly',
    commission_percentage: 0.50, // 50% as decimal
    notes: 'Test policy created via script'
  };

  console.log('Policy data:', JSON.stringify(policyData, null, 2));

  const { data: policyResult, error: policyError } = await supabase
    .from('policies')
    .insert(policyData)
    .select();

  if (policyError) {
    console.error('\n❌ Failed to create policy:', policyError);
    console.error('Error details:', JSON.stringify(policyError, null, 2));
    return;
  }

  console.log('\n✅ SUCCESS! Policy created:', policyResult[0]);
  console.log('Policy ID:', policyResult[0].id);
  console.log('Policy Number:', policyResult[0].policy_number);

  // 5. Verify we can read it back
  console.log('\n5. Verifying policy can be read...');
  const { data: readPolicy, error: readError } = await supabase
    .from('policies')
    .select('*, clients(*)')
    .eq('id', policyResult[0].id)
    .single();

  if (readError) {
    console.error('Failed to read policy:', readError);
  } else {
    console.log('✓ Policy retrieved successfully with client data');
    console.log('  Client name:', readPolicy.clients?.name);
  }

  console.log('\n✨ All tests passed! Policy creation is working correctly.');
}

// Run the test
testPolicyCreation().catch(console.error);