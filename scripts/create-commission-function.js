#!/usr/bin/env node
// scripts/create-commission-function.js
// Creates the getuser_commission_profile function via Supabase client

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL function definition
const createFunctionSQL = `
-- Drop function if it exists to allow clean recreation
DROP FUNCTION IF EXISTS public.getuser_commission_profile(uuid, integer);

-- Create the function to calculate user commission profile
CREATE OR REPLACE FUNCTION public.getuser_commission_profile(
    puser_id uuid,
    p_lookback_months integer DEFAULT 12
)
RETURNS TABLE (
    contract_level integer,
    simple_avg_rate numeric,
    weighted_avg_rate numeric,
    product_breakdown jsonb,
    data_quality text,
    calculated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contract_level integer;
    v_start_date date;
    v_total_premium numeric := 0;
    v_weighted_sum numeric := 0;
    v_simple_sum numeric := 0;
    v_rate_count integer := 0;
    v_product_data jsonb := '[]'::jsonb;
    v_data_quality text;
    v_policy_count integer := 0;
BEGIN
    -- Get user's current contract level
    SELECT current_contract_level INTO v_contract_level
    FROM users
    WHERE id = puser_id;

    -- If user not found or no contract level, return error
    IF v_contract_level IS NULL THEN
        RAISE EXCEPTION 'User not found or contract level not configured';
    END IF;

    -- Calculate lookback date
    v_start_date := CURRENT_DATE - INTERVAL '1 month' * p_lookback_months;

    -- Build product breakdown with commission rates and premium weights
    WITH policy_data AS (
        -- Get all policies for the user in the lookback period
        SELECT
            p.id as policy_id,
            p.product_id,
            pr.product_name,
            c.name as carrier_name,
            p.premium,
            p.effective_date,
            cr.commission_percentage
        FROM policies p
        INNER JOIN products pr ON p.product_id = pr.id
        INNER JOIN carriers c ON pr.carrier_id = c.id
        LEFT JOIN commission_rates cr ON
            cr.product_id = p.product_id AND
            cr.carrier_id = pr.carrier_id AND
            cr.contract_level = v_contract_level
        WHERE p.user_id = puser_id
            AND p.status = 'active'
            AND p.effective_date >= v_start_date
            AND p.premium > 0
    ),
    product_aggregates AS (
        -- Aggregate by product
        SELECT
            product_id,
            MAX(product_name) as product_name,
            MAX(carrier_name) as carrier_name,
            AVG(COALESCE(commission_percentage, 0)) as avg_commission_rate,
            SUM(premium) as total_premium,
            COUNT(*) as policy_count,
            MIN(effective_date) as earliest_date
        FROM policy_data
        GROUP BY product_id
    )
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'productId', product_id,
                'productName', product_name,
                'carrierName', carrier_name,
                'commissionRate', ROUND(avg_commission_rate, 4),
                'premiumWeight', CASE
                    WHEN SUM(total_premium) OVER() > 0
                    THEN ROUND(total_premium / SUM(total_premium) OVER(), 4)
                    ELSE 0
                END,
                'totalPremium', ROUND(total_premium, 2),
                'policyCount', policy_count,
                'effectiveDate', earliest_date
            )
            ORDER BY total_premium DESC
        ) INTO v_product_data
    FROM product_aggregates;

    -- Calculate simple and weighted averages
    WITH rate_data AS (
        SELECT
            cr.commission_percentage,
            COUNT(DISTINCT p.id) as policy_count,
            SUM(p.premium) as total_premium
        FROM commission_rates cr
        INNER JOIN products pr ON cr.product_id = pr.id AND cr.carrier_id = pr.carrier_id
        INNER JOIN policies p ON p.product_id = pr.id
        WHERE cr.contract_level = v_contract_level
            AND p.user_id = puser_id
            AND p.status = 'active'
            AND p.effective_date >= v_start_date
            AND p.premium > 0
        GROUP BY cr.commission_percentage
    )
    SELECT
        COALESCE(SUM(total_premium), 0),
        COALESCE(SUM(commission_percentage * total_premium), 0),
        COALESCE(SUM(commission_percentage), 0),
        COALESCE(COUNT(DISTINCT commission_percentage), 0),
        COALESCE(SUM(policy_count), 0)
    INTO v_total_premium, v_weighted_sum, v_simple_sum, v_rate_count, v_policy_count
    FROM rate_data;

    -- Determine data quality based on policy count and time range
    IF v_policy_count >= 20 AND v_rate_count >= 3 THEN
        v_data_quality := 'HIGH';
    ELSIF v_policy_count >= 10 OR v_rate_count >= 2 THEN
        v_data_quality := 'MEDIUM';
    ELSIF v_policy_count > 0 THEN
        v_data_quality := 'LOW';
    ELSE
        -- No policies found, try to get default rates
        SELECT
            AVG(commission_percentage),
            COUNT(*)
        INTO v_simple_sum, v_rate_count
        FROM commission_rates
        WHERE contract_level = v_contract_level;

        IF v_rate_count > 0 THEN
            v_data_quality := 'DEFAULT';
        ELSE
            v_data_quality := 'NONE';
        END IF;
    END IF;

    -- Return the results
    RETURN QUERY
    SELECT
        v_contract_level,
        CASE
            WHEN v_rate_count > 0 THEN ROUND(v_simple_sum / v_rate_count, 4)
            ELSE 0
        END as simple_avg_rate,
        CASE
            WHEN v_total_premium > 0 THEN ROUND(v_weighted_sum / v_total_premium, 4)
            WHEN v_rate_count > 0 THEN ROUND(v_simple_sum / v_rate_count, 4)
            ELSE 0
        END as weighted_avg_rate,
        COALESCE(v_product_data, '[]'::jsonb) as product_breakdown,
        v_data_quality as data_quality,
        NOW() as calculated_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO service_role;
`;

async function createFunction() {
  console.log('Creating getuser_commission_profile function...');

  // We can't execute raw SQL directly through the client library
  // So we'll test if the function exists by trying to call it
  try {
    // Test if function exists by calling it with a test UUID
    const { error: testError } = await supabase.rpc('getuser_commission_profile', {
      puser_id: '00000000-0000-0000-0000-000000000000',
      p_lookback_months: 12
    });

    if (testError && testError.message.includes('Could not find the function')) {
      console.log('Function does not exist yet.');
      console.log('\n⚠️  Please apply the migration manually through one of these methods:');
      console.log('\n1. Supabase Dashboard:');
      console.log('   - Go to https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new');
      console.log('   - Copy and paste the SQL from: supabase/migrations/20251213_001_add_getuser_commission_profile_function.sql');
      console.log('   - Click "Run" to execute the SQL');

      console.log('\n2. Use Supabase CLI with password:');
      console.log('   - Run: npx supabase db push');
      console.log('   - Enter your database password when prompted');
      console.log('   - Password can be reset at: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/settings/database');

      console.log('\n3. Direct psql connection (if you have the password):');
      console.log('   psql -h aws-1-us-east-2.pooler.supabase.com -p 5432 -U postgres.pcyaqwodnyrpkaiojnpz -d postgres < supabase/migrations/20251213_001_add_getuser_commission_profile_function.sql');
    } else if (testError) {
      // Function exists but returned an error (expected since we used a fake UUID)
      if (testError.message.includes('User not found')) {
        console.log('✅ Function already exists and is working!');
      } else {
        console.error('Function exists but returned unexpected error:', testError.message);
      }
    } else {
      console.log('✅ Function exists and is working!');
    }
  } catch (error) {
    console.error('Error checking function:', error);
  }
}

createFunction();