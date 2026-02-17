-- supabase/migrations/20260217134733_remove_remaining_duplicate_rls_policies.sql
--
-- Phase 2 Part 2 - Batch 3: Remove 8 remaining duplicate/subsumed RLS policies
--
-- Categories:
--   A. Subsumed by auth.role()='authenticated' (4) — all-authenticated policy covers role-specific
--   B. Operand-order duplicates (3) — a = b vs b = a
--   C. Semantic equivalent (1) — IN subquery ≡ EXISTS correlated subquery
--
-- Verified: Zero access changes. Each dropped policy's conditions are fully
-- covered by remaining policies on the same table/cmd/role.

-- ============================================================================
-- A. Subsumed by "Authenticated users can view phase checklist items"
--    Condition: auth.role() = 'authenticated' — always true for TO authenticated
--    All 4 role-specific SELECT policies are fully subsumed
-- ============================================================================

-- 1. phase_checklist_items SELECT: super_admin check subsumed by all-authenticated
DROP POLICY IF EXISTS "phase_checklist_items_super_admin_select" ON public.phase_checklist_items;

-- 2. phase_checklist_items SELECT: imo_admin/staff check subsumed by all-authenticated
DROP POLICY IF EXISTS "phase_checklist_items_imo_select" ON public.phase_checklist_items;

-- 3. phase_checklist_items SELECT: agency_owner check subsumed by all-authenticated
DROP POLICY IF EXISTS "phase_checklist_items_agency_owner_select" ON public.phase_checklist_items;

-- 4. phase_checklist_items SELECT: recruit check subsumed by all-authenticated
DROP POLICY IF EXISTS "phase_checklist_items_recruit_select" ON public.phase_checklist_items;

-- ============================================================================
-- B. Operand-order duplicates (auth.uid() = col vs col = auth.uid())
-- ============================================================================

-- 5. user_expense_categories SELECT: "Users can read own..." ≡ "Users can view own..."
--    Dropping: USING (auth.uid() = user_id)
--    Keeping:  "Users can view own expense categories" USING (user_id = auth.uid())
DROP POLICY IF EXISTS "Users can read own expense categories" ON public.user_expense_categories;

-- 6. user_expense_categories INSERT: "Users can create own..." ≡ "Users can insert own..."
--    Dropping: WITH CHECK (auth.uid() = user_id)
--    Keeping:  "Users can insert own expense categories" WITH CHECK (user_id = auth.uid())
DROP POLICY IF EXISTS "Users can create own expense categories" ON public.user_expense_categories;

-- 7. lead_purchases INSERT: "Enable insert for users..." ≡ "Users can create own..."
--    Dropping: WITH CHECK (auth.uid() = user_id)
--    Keeping:  "Users can create own lead purchases" WITH CHECK (user_id = auth.uid())
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.lead_purchases;

-- ============================================================================
-- C. Semantic equivalent: IN subquery ≡ EXISTS correlated subquery
-- ============================================================================

-- 8. workflow_actions ALL: "Users can manage actions for own workflows"
--    Dropping: workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
--    Keeping:  "Users can manage actions for their workflows"
--             EXISTS (SELECT 1 FROM workflows WHERE id = workflow_actions.workflow_id AND created_by = auth.uid())
--    Both match exactly the same rows; EXISTS form is preferred (correlated subquery)
DROP POLICY IF EXISTS "Users can manage actions for own workflows" ON public.workflow_actions;
