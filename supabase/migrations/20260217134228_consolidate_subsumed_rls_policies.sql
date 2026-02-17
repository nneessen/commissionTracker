-- supabase/migrations/20260217134228_consolidate_subsumed_rls_policies.sql
--
-- Phase 2 Part 2 - Batch 2: Remove 25 subsumed/duplicate RLS policies
--
-- Categories:
--   A. Exact condition duplicates (5) — same table/cmd/role/qual/with_check
--   B. Functional equivalent (1) — same USING, WITH CHECK NULL→defaults to USING
--   C. Subsumption within user_profiles (3)
--   D. ALL-policy subsumption on clients (6) — ALL owner-check subsumes stricter per-cmd
--   E. ALL-policy subsumption on expenses (7) — same pattern as clients
--   F. Simple subsumption (2) — broader policy covers stricter one
--   G. Near-exact functional duplicate (1) — policies UPDATE WITH CHECK equivalence
--
-- Verified: Zero access changes. Each dropped policy's conditions are fully
-- covered by remaining policies on the same table/cmd/role.

-- ============================================================================
-- A. Exact condition duplicates (now on same role after Phase 3)
-- ============================================================================

-- 1. user_profiles SELECT: "Admins can view all users" ≡ "Admins can view all user profiles"
--    Both: is_admin()
DROP POLICY IF EXISTS "Admins can view all users" ON public.user_profiles;

-- 2. user_profiles UPDATE: "Admins can update all users" ≡ "Admins can update all user profiles"
--    Both: is_admin()
DROP POLICY IF EXISTS "Admins can update all users" ON public.user_profiles;

-- 3. commissions UPDATE: "commissions_update_own_simple" ≡ "Users can update own commissions"
--    Both: USING + WITH CHECK = user_id = auth.uid()
DROP POLICY IF EXISTS "commissions_update_own_simple" ON public.commissions;

-- 4. policies DELETE: "policies_delete_own" ≡ "Agents can delete their own policies"
--    Both: user_id = auth.uid(), no WITH CHECK
DROP POLICY IF EXISTS "policies_delete_own" ON public.policies;

-- 5. policies INSERT: "policies_insert_own" ≡ "Agents can insert their own policies"
--    Both: WITH CHECK = user_id = auth.uid()
DROP POLICY IF EXISTS "policies_insert_own" ON public.policies;

-- ============================================================================
-- B. Functional equivalent (WITH CHECK NULL defaults to USING)
-- ============================================================================

-- 6. policies UPDATE: "policies_update_own" has WITH CHECK NULL (defaults to USING)
--    "Agents can update their own policies" has explicit WITH CHECK = USING
--    Both effectively: USING + WITH CHECK = user_id = auth.uid()
DROP POLICY IF EXISTS "policies_update_own" ON public.policies;

-- ============================================================================
-- C. Subsumption within user_profiles
-- ============================================================================

-- 7. user_profiles SELECT: "Recruiters can view their recruits"
--    Condition: recruiter_id = auth.uid()
--    Subsumed by: user_profiles_select_hierarchy first OR branch:
--    (recruiter_id = auth.uid() OR id IN get_downline_ids(...) OR upline_id = auth.uid())
DROP POLICY IF EXISTS "Recruiters can view their recruits" ON public.user_profiles;

-- 8. user_profiles SELECT: "Users can view downline profiles"
--    Condition: id IN get_downline_ids(auth.uid()) AND is_user_approved()
--    Subsumed by: user_profiles_select_hierarchy second OR branch:
--    id IN get_downline_ids(auth.uid()) — grants access WITHOUT requiring is_user_approved()
--    Since permissive policies OR together, the approval restriction adds zero access.
DROP POLICY IF EXISTS "Users can view downline profiles" ON public.user_profiles;

-- 9. user_profiles DELETE: "Admins can delete user profiles"
--    Condition: is_admin() — checks is_admin = true column
--    Subsumed by: delete_user_policy first branch:
--    auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true) — equivalent check
--    delete_user_policy also adds self-delete (auth.uid() = id)
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.user_profiles;

-- ============================================================================
-- D. ALL-policy subsumption on clients
--    ALL policy "Users can CRUD own clients": USING (auth.uid() = user_id)
--    Effective WITH CHECK (NULL defaults to USING): auth.uid() = user_id
--    Subsumes all specific-command owner policies with EQUAL or STRICTER conditions
-- ============================================================================

-- 10. clients SELECT: owner check identical to ALL
DROP POLICY IF EXISTS "clients_select_own_only" ON public.clients;

-- 11-12. clients DELETE: owner + is_user_approved / has_permission — both stricter than ALL
DROP POLICY IF EXISTS "Approved users can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_own" ON public.clients;

-- 13-14. clients INSERT: owner + is_user_approved / has_permission — both stricter than ALL
DROP POLICY IF EXISTS "Approved users can create own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;

-- 15-16. clients UPDATE: owner + is_user_approved / has_permission — both stricter than ALL
DROP POLICY IF EXISTS "Approved users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_update_own" ON public.clients;

-- ============================================================================
-- E. ALL-policy subsumption on expenses
--    ALL policy "Users can CRUD own expenses": USING (auth.uid() = user_id)
--    Same pattern as clients above
-- ============================================================================

-- 17. expenses SELECT: owner check identical to ALL
DROP POLICY IF EXISTS "expenses_select_own_only" ON public.expenses;

-- 18-19. expenses DELETE
DROP POLICY IF EXISTS "Approved users can delete own expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON public.expenses;

-- 20-21. expenses INSERT
DROP POLICY IF EXISTS "Approved users can create own expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON public.expenses;

-- 22-23. expenses UPDATE
DROP POLICY IF EXISTS "Approved users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON public.expenses;

-- ============================================================================
-- F. Simple subsumption
-- ============================================================================

-- 24. workflows INSERT: "Users can create workflows if they have permission"
--     WITH CHECK: created_by = auth.uid() AND can_manage_workflows(auth.uid())
--     Subsumed by: "Users can create workflows"
--     WITH CHECK: auth.uid() = created_by (broader — no permission requirement)
DROP POLICY IF EXISTS "Users can create workflows if they have permission" ON public.workflows;

-- 25. commissions DELETE: "Approved users can delete own commissions"
--     Condition: auth.uid() = user_id AND is_user_approved()
--     Subsumed by: "Users can delete own commissions"
--     Condition: user_id = auth.uid() (broader — no approval requirement)
DROP POLICY IF EXISTS "Approved users can delete own commissions" ON public.commissions;
