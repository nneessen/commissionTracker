-- Test file to verify commission fix
-- This tests that new commissions are created with 'pending' status, not 'paid'

-- Connect to local database
\c postgres

-- Create a test user (if not exists)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test@example.com',
  '{"contract_comp_level": 100}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert a test policy with status='active'
-- This should create a commission with status='pending' (NOT 'paid')
INSERT INTO policies (
  id,
  user_id,
  policy_number,
  client_name,
  client_state,
  carrier_id,
  product,
  status,
  annual_premium,
  monthly_premium,
  commission_percentage,
  effective_date
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'TEST-001',
  'Test Client',
  'CA',
  (SELECT id FROM carriers LIMIT 1),
  'Test Product',
  'active',  -- Policy is active
  12000,     -- $12,000 annual
  1000,      -- $1,000 monthly
  0.50,      -- 50% commission
  CURRENT_DATE
);

-- Check the commission that was auto-created
SELECT
  p.policy_number,
  p.status as policy_status,
  c.status as commission_status,
  c.amount as commission_amount,
  c.notes
FROM policies p
LEFT JOIN commissions c ON c.policy_id = p.id
WHERE p.policy_number = 'TEST-001';

-- Expected result:
-- policy_status = 'active'
-- commission_status = 'pending' (NOT 'paid')
-- This proves the fix is working

-- Clean up test data
DELETE FROM commissions WHERE policy_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM policies WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';