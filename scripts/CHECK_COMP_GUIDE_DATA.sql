-- ============================================================================
-- CHECK COMP_GUIDE DATA - Debug why only American Home Life FE works
-- ============================================================================

-- 1. Check what's in comp_guide table
SELECT
  cg.id,
  p.name as product_name,
  c.name as carrier_name,
  cg.product_id,
  cg.contract_level,
  cg.commission_percentage,
  cg.bonus_percentage,
  cg.effective_date,
  cg.expiration_date
FROM comp_guide cg
LEFT JOIN products p ON p.id = cg.product_id
LEFT JOIN carriers c ON c.id = p.carrier_id
ORDER BY c.name, p.name, cg.contract_level;

-- 2. Check if American Home Life FE product exists
SELECT
  c.id as carrier_id,
  c.name as carrier_name,
  p.id as product_id,
  p.name as product_name,
  p.product_type,
  p.commission_percentage as product_commission
FROM carriers c
JOIN products p ON p.carrier_id = c.id
WHERE c.name LIKE '%American Home Life%'
ORDER BY p.name;

-- 3. Check ALL products with their commission rates
SELECT
  c.name as carrier_name,
  p.id as product_id,
  p.name as product_name,
  p.product_type,
  p.commission_percentage as product_commission,
  COUNT(cg.id) as comp_guide_entries
FROM carriers c
JOIN products p ON p.carrier_id = c.id
LEFT JOIN comp_guide cg ON cg.product_id = p.id
GROUP BY c.name, p.id, p.name, p.product_type, p.commission_percentage
ORDER BY c.name, p.name;

-- 4. Check user's contract level
SELECT
  id,
  email,
  contract_comp_level
FROM auth.users
WHERE id = auth.uid();

-- 5. Check if there are any comp_guide entries for the user's contract level
SELECT
  COUNT(*) as entries_for_user_level,
  (SELECT contract_comp_level FROM auth.users WHERE id = auth.uid()) as user_contract_level
FROM comp_guide
WHERE contract_level = (SELECT contract_comp_level FROM auth.users WHERE id = auth.uid());

-- 6. Check commission_rates table (if it exists)
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'commission_rates';

-- If commission_rates table exists, check its data
SELECT
  cr.*,
  c.name as carrier_name,
  p.name as product_name
FROM commission_rates cr
LEFT JOIN carriers c ON c.id = cr.carrier_id
LEFT JOIN products p ON p.id = cr.product_id
ORDER BY c.name, p.name, cr.contract_level
LIMIT 20;