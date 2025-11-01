-- ============================================================================
-- CHECK COMMISSION DISCREPANCY - Dashboard shows $817 but should show $743
-- ============================================================================

-- 1. Check ALL commissions with pending or earned status
SELECT
  c.id,
  c.policy_id,
  p.policy_number,
  p.status as policy_status,
  c.status as commission_status,
  c.amount,
  cl.name as client_name,
  car.name as carrier_name
FROM commissions c
LEFT JOIN policies p ON p.id = c.policy_id
LEFT JOIN clients cl ON cl.id = p.client_id
LEFT JOIN carriers car ON car.id = c.carrier_id
WHERE c.status IN ('pending', 'earned')
  AND c.user_id = auth.uid()
ORDER BY c.amount DESC;

-- 2. Sum of pending pipeline from ALL commissions (current wrong calculation)
SELECT
  'All Pending/Earned Commissions' as calculation_type,
  SUM(amount) as total,
  COUNT(*) as count
FROM commissions
WHERE status IN ('pending', 'earned')
  AND user_id = auth.uid();

-- 3. Sum of pending pipeline from ONLY ACTIVE/PENDING policies (correct calculation)
SELECT
  'Active/Pending Policy Commissions' as calculation_type,
  SUM(c.amount) as total,
  COUNT(*) as count
FROM commissions c
JOIN policies p ON p.id = c.policy_id
WHERE c.status IN ('pending', 'earned')
  AND p.status IN ('active', 'pending')
  AND c.user_id = auth.uid();

-- 4. Find the difference - which commissions are included incorrectly?
SELECT
  'Commissions from Cancelled/Lapsed Policies' as issue,
  c.id,
  c.amount,
  p.policy_number,
  p.status as policy_status,
  c.status as commission_status,
  cl.name as client_name
FROM commissions c
JOIN policies p ON p.id = c.policy_id
LEFT JOIN clients cl ON cl.id = p.client_id
WHERE c.status IN ('pending', 'earned')
  AND p.status NOT IN ('active', 'pending')  -- These are being incorrectly included!
  AND c.user_id = auth.uid();

-- 5. Breakdown by policy status to see where the extra $74 is coming from
SELECT
  p.status as policy_status,
  c.status as commission_status,
  COUNT(*) as count,
  SUM(c.amount) as total_amount
FROM commissions c
JOIN policies p ON p.id = c.policy_id
WHERE c.status IN ('pending', 'earned')
  AND c.user_id = auth.uid()
GROUP BY p.status, c.status
ORDER BY p.status, c.status;

-- 6. What the policies table shows (for comparison)
SELECT
  'Policies Table View' as source,
  SUM(
    CASE
      WHEN c.status IN ('pending', 'earned') THEN c.amount
      ELSE 0
    END
  ) as pending_pipeline,
  COUNT(DISTINCT p.id) as policy_count
FROM policies p
LEFT JOIN commissions c ON c.policy_id = p.id
WHERE p.status IN ('active', 'pending')
  AND p.user_id = auth.uid();