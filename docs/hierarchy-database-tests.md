# Hierarchy System - Database Trigger Tests

**Purpose:** Manual testing procedures for database triggers and RLS policies in the hierarchy system.

**Date:** 2025-11-23

---

## Database Triggers to Test

### 1. Hierarchy Path Update Trigger

**Trigger:** `update_hierarchy_path_trigger`
**Function:** `update_hierarchy_path()`
**Purpose:** Automatically maintains `hierarchy_path` and `hierarchy_depth` when `upline_id` changes

#### Test Cases

**Test 1.1: New User Creation**
```sql
-- Create a new user with no upline (root agent)
INSERT INTO user_profiles (id, email, upline_id)
VALUES ('test-root', 'root@test.com', NULL);

-- Verify hierarchy_path and depth
SELECT id, email, hierarchy_path, hierarchy_depth
FROM user_profiles
WHERE id = 'test-root';

-- Expected:
-- hierarchy_path: 'test-root'
-- hierarchy_depth: 0
```

**Test 1.2: Create Downline Agent**
```sql
-- Create a downline under test-root
INSERT INTO user_profiles (id, email, upline_id)
VALUES ('test-downline-1', 'downline1@test.com', 'test-root');

-- Verify
SELECT id, email, hierarchy_path, hierarchy_depth, upline_id
FROM user_profiles
WHERE id = 'test-downline-1';

-- Expected:
-- hierarchy_path: 'test-root.test-downline-1'
-- hierarchy_depth: 1
-- upline_id: 'test-root'
```

**Test 1.3: Multi-Level Hierarchy**
```sql
-- Create second-level downline
INSERT INTO user_profiles (id, email, upline_id)
VALUES ('test-downline-2', 'downline2@test.com', 'test-downline-1');

-- Verify
SELECT id, email, hierarchy_path, hierarchy_depth, upline_id
FROM user_profiles
WHERE id = 'test-downline-2';

-- Expected:
-- hierarchy_path: 'test-root.test-downline-1.test-downline-2'
-- hierarchy_depth: 2
```

**Test 1.4: Move Agent to New Upline**
```sql
-- Move test-downline-2 to be directly under test-root
UPDATE user_profiles
SET upline_id = 'test-root'
WHERE id = 'test-downline-2';

-- Verify path updated
SELECT id, email, hierarchy_path, hierarchy_depth, upline_id
FROM user_profiles
WHERE id = 'test-downline-2';

-- Expected:
-- hierarchy_path: 'test-root.test-downline-2'
-- hierarchy_depth: 1
-- upline_id: 'test-root'
```

**Test 1.5: Promote to Root Agent**
```sql
-- Remove upline (make root)
UPDATE user_profiles
SET upline_id = NULL
WHERE id = 'test-downline-1';

-- Verify
SELECT id, email, hierarchy_path, hierarchy_depth, upline_id
FROM user_profiles
WHERE id = 'test-downline-1';

-- Expected:
-- hierarchy_path: 'test-downline-1'
-- hierarchy_depth: 0
-- upline_id: NULL
```

---

### 2. Circular Reference Prevention Trigger

**Trigger:** `check_circular_reference_trigger`
**Function:** `check_circular_reference()`
**Purpose:** Prevents circular references in hierarchy (agent can't be upline of their own upline)

#### Test Cases

**Test 2.1: Prevent Direct Circular Reference**
```sql
-- Try to set an agent's upline to themselves
UPDATE user_profiles
SET upline_id = 'test-root'
WHERE id = 'test-root';

-- Expected: ERROR - "Cannot set yourself as upline"
```

**Test 2.2: Prevent Indirect Circular Reference**
```sql
-- Setup: test-root -> test-downline-1 -> test-downline-2
-- Try to set test-root's upline to test-downline-2
UPDATE user_profiles
SET upline_id = 'test-downline-2'
WHERE id = 'test-root';

-- Expected: ERROR - "Circular reference detected"
```

**Test 2.3: Valid Move (No Circle)**
```sql
-- Create independent root
INSERT INTO user_profiles (id, email, upline_id)
VALUES ('test-root-2', 'root2@test.com', NULL);

-- Move test-downline-1 under test-root-2 (valid)
UPDATE user_profiles
SET upline_id = 'test-root-2'
WHERE id = 'test-downline-1';

-- Expected: SUCCESS
-- Verify hierarchy_path updated
```

---

### 3. Override Commission Creation Trigger

**Trigger:** `create_override_commissions_trigger`
**Function:** `create_override_commissions()`
**Purpose:** Automatically creates override commissions for entire upline chain when policy is created

#### Test Cases

**Test 3.1: Create Policy with Downline**
```sql
-- Setup hierarchy: root (L120) -> downline (L100)
-- Create policy from downline perspective
INSERT INTO policies (
  id, user_id, client_id, carrier_id, product_id,
  policy_number, annual_premium, status, effective_date
) VALUES (
  'test-policy-1', 'test-downline-1', 'client-1', 'carrier-1', 'product-1',
  'POL-TEST-001', 10000, 'active', '2025-01-01'
);

-- Verify override created for upline
SELECT
  id, policy_id, base_agent_id, override_agent_id,
  hierarchy_depth, base_commission_amount, override_commission_amount
FROM override_commissions
WHERE policy_id = 'test-policy-1';

-- Expected: One override record
-- base_agent_id: 'test-downline-1'
-- override_agent_id: 'test-root'
-- hierarchy_depth: 1
-- override_commission_amount: (upline_rate - downline_rate) * premium
```

**Test 3.2: Multi-Level Override Cascade**
```sql
-- Setup: root (L120) -> level1 (L110) -> level2 (L100)
-- Create policy from level2
INSERT INTO policies (...) VALUES (...);

-- Verify TWO override records created
SELECT
  override_agent_id, hierarchy_depth, override_commission_amount
FROM override_commissions
WHERE policy_id = 'test-policy-2'
ORDER BY hierarchy_depth;

-- Expected:
-- Row 1: override_agent_id = level1, hierarchy_depth = 1, amount = (110 - 100)
-- Row 2: override_agent_id = root, hierarchy_depth = 2, amount = (120 - 100)
```

**Test 3.3: No Override for Root Agent Policy**
```sql
-- Root agent writes their own policy
INSERT INTO policies (user_id = 'test-root', ...) VALUES (...);

-- Verify no overrides created
SELECT COUNT(*) FROM override_commissions
WHERE policy_id = 'test-policy-root';

-- Expected: 0 rows
```

---

### 4. Override Update on Policy Change Trigger

**Trigger:** `update_override_on_policy_change_trigger`
**Function:** `update_override_commissions_on_policy_change()`
**Purpose:** Updates override statuses when policy status changes (lapse, cancel, reinstate)

#### Test Cases

**Test 4.1: Lapse Policy - Chargeback Overrides**
```sql
-- Update policy to lapsed
UPDATE policies
SET status = 'lapsed'
WHERE id = 'test-policy-1';

-- Verify overrides marked as chargedback
SELECT status, chargeback_amount
FROM override_commissions
WHERE policy_id = 'test-policy-1';

-- Expected:
-- status: 'chargedback'
-- chargeback_amount: override_commission_amount
```

**Test 4.2: Cancel Policy - Chargeback Overrides**
```sql
-- Update policy to cancelled
UPDATE policies
SET status = 'cancelled'
WHERE id = 'test-policy-1';

-- Verify overrides chargedback
SELECT status
FROM override_commissions
WHERE policy_id = 'test-policy-1';

-- Expected: status = 'chargedback'
```

**Test 4.3: Reinstate Policy - Restore Overrides**
```sql
-- Reinstate policy
UPDATE policies
SET status = 'active'
WHERE id = 'test-policy-1';

-- Verify overrides restored
SELECT status, chargeback_amount
FROM override_commissions
WHERE policy_id = 'test-policy-1';

-- Expected:
-- status: 'pending' (or 'earned' based on months)
-- chargeback_amount: 0
```

---

## RLS Policy Tests

### 1. Hierarchical Data Access

**Test 1.1: User Can View Own Policies**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-downline-1';

SELECT COUNT(*) FROM policies
WHERE user_id = 'test-downline-1';

-- Expected: Can see own policies
```

**Test 1.2: Upline Can View Downline Policies**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-root';

SELECT COUNT(*) FROM policies
WHERE user_id = 'test-downline-1';

-- Expected: Can see downline's policies (RLS allows)
```

**Test 1.3: Downline Cannot View Upline Policies**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-downline-1';

SELECT COUNT(*) FROM policies
WHERE user_id = 'test-root';

-- Expected: 0 rows (RLS denies)
```

**Test 1.4: User Can Only Modify Own Policies**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-downline-1';

UPDATE policies
SET annual_premium = 15000
WHERE user_id = 'test-root';

-- Expected: 0 rows updated (RLS denies)
```

### 2. Override Commission Access

**Test 2.1: User Sees Own Overrides**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-root';

SELECT COUNT(*) FROM override_commissions
WHERE override_agent_id = 'test-root';

-- Expected: Can see overrides where they are the override_agent
```

**Test 2.2: User Cannot See Other's Overrides**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-downline-1';

SELECT COUNT(*) FROM override_commissions
WHERE override_agent_id = 'test-root';

-- Expected: 0 rows (RLS denies)
```

**Test 2.3: Admin Sees All Overrides**
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = '<admin-user-id>';

SELECT COUNT(*) FROM override_commissions;

-- Expected: Can see all overrides
```

---

## Integration Test Scenarios

### Scenario 1: Complete Hierarchy Lifecycle

```sql
-- 1. Create root agent
INSERT INTO user_profiles (id, email) VALUES ('agent-root', 'root@agency.com');

-- 2. Add downline
INSERT INTO user_profiles (id, email, upline_id) VALUES ('agent-l1', 'l1@agency.com', 'agent-root');

-- 3. Add second-level downline
INSERT INTO user_profiles (id, email, upline_id) VALUES ('agent-l2', 'l2@agency.com', 'agent-l1');

-- 4. Level-2 agent writes policy
INSERT INTO policies (...user_id = 'agent-l2'...) VALUES (...);

-- 5. Verify two overrides created (one for l1, one for root)
SELECT override_agent_id, hierarchy_depth, override_commission_amount
FROM override_commissions
WHERE policy_id = '<new-policy-id>'
ORDER BY hierarchy_depth;

-- 6. Policy lapses
UPDATE policies SET status = 'lapsed' WHERE id = '<new-policy-id>';

-- 7. Verify overrides chargedback
SELECT status, chargeback_amount
FROM override_commissions
WHERE policy_id = '<new-policy-id>';

-- 8. Reinstate policy
UPDATE policies SET status = 'active' WHERE id = '<new-policy-id>';

-- 9. Verify overrides restored
```

---

## Performance Tests

### Test 1: Query Performance with Large Hierarchy

```sql
-- Create 100 agents in hierarchy
-- Measure query time for:

EXPLAIN ANALYZE
SELECT * FROM user_profiles
WHERE hierarchy_path LIKE 'root-agent%';

-- Expected: Uses index on hierarchy_path
-- Execution time: < 100ms
```

### Test 2: Override Creation Performance

```sql
-- Create policy with 5-level deep hierarchy
-- Measure time to create all override records

EXPLAIN ANALYZE
SELECT create_override_commissions('<policy-id>');

-- Expected: < 200ms for 5 levels
```

---

## Cleanup

```sql
-- Remove test data
DELETE FROM override_commissions WHERE policy_id LIKE 'test-%';
DELETE FROM policies WHERE id LIKE 'test-%';
DELETE FROM user_profiles WHERE id LIKE 'test-%';
```

---

## Summary

**Total Test Cases:** 25+

**Coverage:**
- ✅ Hierarchy path maintenance
- ✅ Circular reference prevention
- ✅ Override creation cascade
- ✅ Override status updates
- ✅ RLS hierarchical access
- ✅ Admin bypass
- ✅ Performance benchmarks

**Test Execution:**
- Manual execution via SQL client connected to Supabase
- Document results in test log
- Re-run after any migration changes
