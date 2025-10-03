// /home/nneessen/projects/commissionTracker/scripts/test-policy-direct.js
// Test policy creation directly with correct schema

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPolicyCreation() {
  console.log('🧪 Testing Policy Creation\n');

  // First, let's see what columns the policies table actually has
  console.log('📋 Checking policies table structure...');

  // Try to insert an empty policy to see what columns are required
  const { error: structureError } = await supabase
    .from('policies')
    .insert([{}])
    .select();

  if (structureError) {
    console.log('Error message reveals required fields:', structureError.message);
    console.log('');
  }

  // Now let's try different approaches based on what we've discovered

  // Approach 1: Using client_id (original schema)
  console.log('🔍 Approach 1: Testing with client_id foreign key...');

  // Create a test client first
  const { data: testClient, error: clientError } = await supabase
    .from('clients')
    .insert([{
      name: 'Test Client Schema Check',
      email: 'test@example.com',
      phone: '555-1234',
      address: { state: 'TX' }
    }])
    .select()
    .single();

  if (clientError) {
    console.log('❌ Could not create client:', clientError.message);
  } else {
    console.log('✅ Created test client:', testClient.id);

    // Try creating policy with client_id
    const testPolicy1 = {
      user_id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
      policy_number: `TEST-CLIENT-ID-${Date.now()}`,
      carrier_id: '00001000-0000-0000-0000-000000000000', // United Home Life
      client_id: testClient.id,
      product: 'term_life',
      status: 'pending',
      effective_date: new Date().toISOString().split('T')[0], // Date only
      annual_premium: 1200, // $1200/year
      monthly_premium: 100, // $100/month - required field!
      payment_frequency: 'monthly',
      commission_percentage: 1.025 // From products table
    };

    const { data: policy1, error: policy1Error } = await supabase
      .from('policies')
      .insert([testPolicy1])
      .select()
      .single();

    if (policy1Error) {
      console.log('❌ Approach 1 failed:', policy1Error.message);
    } else {
      console.log('✅ Approach 1 succeeded! Policy created:', policy1.id);
      // Clean up
      await supabase.from('policies').delete().eq('id', policy1.id);
    }

    // Clean up client
    await supabase.from('clients').delete().eq('id', testClient.id);
  }

  // Approach 2: Using inline client data (if schema was modified)
  console.log('\n🔍 Approach 2: Testing with inline client data...');

  const testPolicy2 = {
    user_id: '00000000-0000-0000-0000-000000000000',
    policy_number: `TEST-INLINE-${Date.now()}`,
    carrier_id: '00001000-0000-0000-0000-000000000000',
    client: {
      name: 'Test Client Inline',
      state: 'TX',
      age: 30
    },
    product: 'term_life',
    status: 'pending',
    effective_date: new Date().toISOString().split('T')[0],
    annual_premium: 1000,
    payment_frequency: 'monthly'
  };

  const { data: policy2, error: policy2Error } = await supabase
    .from('policies')
    .insert([testPolicy2])
    .select()
    .single();

  if (policy2Error) {
    console.log('❌ Approach 2 failed:', policy2Error.message);
  } else {
    console.log('✅ Approach 2 succeeded! Policy created:', policy2.id);
    // Clean up
    await supabase.from('policies').delete().eq('id', policy2.id);
  }

  // Approach 3: Using separate client fields
  console.log('\n🔍 Approach 3: Testing with separate client fields...');

  const testPolicy3 = {
    user_id: '00000000-0000-0000-0000-000000000000',
    policy_number: `TEST-FIELDS-${Date.now()}`,
    carrier_id: '00001000-0000-0000-0000-000000000000',
    client_name: 'Test Client Fields',
    client_state: 'TX',
    client_age: 30,
    product: 'term_life',
    status: 'pending',
    effective_date: new Date().toISOString().split('T')[0],
    annual_premium: 1000,
    payment_frequency: 'monthly'
  };

  const { data: policy3, error: policy3Error } = await supabase
    .from('policies')
    .insert([testPolicy3])
    .select()
    .single();

  if (policy3Error) {
    console.log('❌ Approach 3 failed:', policy3Error.message);
  } else {
    console.log('✅ Approach 3 succeeded! Policy created:', policy3.id);
    console.log('   Policy details:', policy3);
    // Clean up
    await supabase.from('policies').delete().eq('id', policy3.id);
  }

  // Final summary
  console.log('\n📊 Summary:');
  console.log('The correct approach is the one that succeeded above.');
  console.log('Update the code to use that schema format.');
}

testPolicyCreation().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});