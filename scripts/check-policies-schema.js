// /home/nneessen/projects/commissionTracker/scripts/check-policies-schema.js
// Check the actual policies table schema

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

async function checkPoliciesSchema() {
  console.log('🔍 Checking policies table schema...\n');

  // Try to select from policies with all columns
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error accessing policies table:', error);

    // If table doesn't exist, we need to create it
    if (error.message.includes('does not exist')) {
      console.log('\n❌ Policies table does not exist!');
      console.log('   Need to create the policies table first.\n');

      console.log('📝 Here\'s the SQL to create the policies table:\n');
      console.log('```sql');
      console.log(`CREATE TABLE IF NOT EXISTS policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  policy_number TEXT NOT NULL UNIQUE,
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  product_id UUID REFERENCES products(id),

  -- Client information (stored as JSONB)
  client_name TEXT NOT NULL,
  client_state TEXT NOT NULL,
  client_age INTEGER NOT NULL,

  -- Policy details
  product_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  effective_date TIMESTAMPTZ NOT NULL,
  annual_premium DECIMAL(10,2) NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'monthly',
  commission_percentage DECIMAL(5,2) NOT NULL,
  expected_commission DECIMAL(10,2) NOT NULL,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CHECK (status IN ('pending', 'active', 'lapsed', 'cancelled')),
  CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual'))
);

-- Create indexes for better performance
CREATE INDEX idx_policies_user_id ON policies(user_id);
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX idx_policies_product_id ON policies(product_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);`);
      console.log('```');
    }
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Policies table exists with columns:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      console.log(`   - ${col}: ${typeof data[0][col]} (value: ${JSON.stringify(data[0][col])?.substring(0, 50)}...)`);
    });
  } else {
    console.log('✅ Policies table exists but is empty');

    // Try to get schema information another way
    console.log('\n📋 Attempting to get table structure...');

    // Insert a dummy record to see what columns are expected
    const dummyPolicy = {
      user_id: 'dummy',
      policy_number: 'DUMMY-TEST',
      carrier_id: '00001000-0000-0000-0000-000000000000',
      product_id: null,
      client_name: 'Test Client',
      client_state: 'TX',
      client_age: 30,
      product_type: 'term_life',
      status: 'pending',
      effective_date: new Date().toISOString(),
      annual_premium: 1000,
      payment_frequency: 'monthly',
      commission_percentage: 100,
      expected_commission: 1000,
      notes: 'Schema test'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('policies')
      .insert([dummyPolicy])
      .select();

    if (insertError) {
      console.log('\n🔍 Based on the error, analyzing required fields:');
      console.log('Error:', insertError.message);

      // Check if it's about missing columns
      if (insertError.message.includes('column')) {
        console.log('\n⚠️  The table structure seems different than expected.');
        console.log('   The error suggests the table might have different column names.');
      }
    } else if (insertData) {
      console.log('\n✅ Successfully inserted test record!');
      console.log('Table columns from inserted data:');
      const cols = Object.keys(insertData[0]);
      cols.forEach(col => {
        console.log(`   - ${col}`);
      });

      // Clean up
      await supabase.from('policies').delete().eq('id', insertData[0].id);
      console.log('\n🧹 Test record cleaned up');
    }
  }
}

checkPoliciesSchema().then(() => {
  console.log('\n✅ Schema check complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});