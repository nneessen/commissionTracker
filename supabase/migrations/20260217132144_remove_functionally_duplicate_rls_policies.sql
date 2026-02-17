-- supabase/migrations/20260217132144_remove_functionally_duplicate_rls_policies.sql
--
-- Phase 2 Part 2 - Batch 1: Remove functionally duplicate RLS policies
--
-- This migration removes 7 policies that are exact functional duplicates of
-- other policies remaining on the same table/cmd/role. Two categories:
--
-- Category A: Operand-order duplicates (a = b vs b = a)
--   - workflows DELETE/SELECT/UPDATE: "Users can X own workflows" duplicates
--     "Users can X their own workflows" (reversed operand order)
--
-- Category B: Equivalent function duplicates (is_staff_role ≡ is_imo_staff_role)
--   - recruit_checklist_progress SELECT/UPDATE
--   - recruit_phase_progress SELECT/UPDATE
--   The functions is_staff_role() and is_imo_staff_role() have identical
--   implementations. The dropped policies also have a redundant
--   "AND imo_id IS NOT NULL" (implied by "imo_id = get_my_imo_id()").
--
-- Verified: Zero access changes. Each dropped policy has an identical-condition
-- counterpart that remains.

-- ============================================================================
-- Category A: Operand-order duplicates on workflows
-- ============================================================================

-- Drop 1: workflows DELETE {public}
-- Dropping: USING (auth.uid() = created_by)
-- Keeping:  "Users can delete their own workflows" USING (created_by = auth.uid())
DROP POLICY IF EXISTS "Users can delete own workflows" ON public.workflows;

-- Drop 2: workflows SELECT {public}
-- Dropping: USING (auth.uid() = created_by)
-- Keeping:  "Users can view workflows they created" USING (created_by = auth.uid())
DROP POLICY IF EXISTS "Users can view own workflows" ON public.workflows;

-- Drop 3: workflows UPDATE {public}
-- Dropping: USING (auth.uid() = created_by), WITH CHECK = NULL (defaults to USING)
-- Keeping:  "Users can update their own workflows" USING + WITH CHECK (created_by = auth.uid())
DROP POLICY IF EXISTS "Users can update own workflows" ON public.workflows;

-- ============================================================================
-- Category B: is_staff_role() ≡ is_imo_staff_role() duplicates
-- ============================================================================

-- Drop 5: recruit_checklist_progress SELECT {authenticated}
-- Dropping: is_imo_staff_role() AND imo_id = get_my_imo_id() AND imo_id IS NOT NULL
-- Keeping:  "Staff can view checklist_progress in own IMO" with is_staff_role() AND imo_id = get_my_imo_id()
DROP POLICY IF EXISTS "imo_staff_view_checklist_progress" ON public.recruit_checklist_progress;

-- Drop 6: recruit_checklist_progress UPDATE {authenticated}
-- Dropping: USING + WITH CHECK: is_imo_staff_role() AND imo_id = get_my_imo_id() AND imo_id IS NOT NULL
-- Keeping:  "Staff can update checklist_progress in own IMO" USING + WITH CHECK: is_staff_role() AND imo_id = get_my_imo_id()
DROP POLICY IF EXISTS "imo_staff_update_checklist_progress" ON public.recruit_checklist_progress;

-- Drop 7: recruit_phase_progress SELECT {authenticated}
-- Dropping: is_imo_staff_role() AND imo_id = get_my_imo_id() AND imo_id IS NOT NULL
-- Keeping:  "Staff can view phase_progress in own IMO" with is_staff_role() AND imo_id = get_my_imo_id()
DROP POLICY IF EXISTS "imo_staff_view_phase_progress" ON public.recruit_phase_progress;

-- Drop 8: recruit_phase_progress UPDATE {authenticated}
-- Dropping: USING + WITH CHECK: is_imo_staff_role() AND imo_id = get_my_imo_id() AND imo_id IS NOT NULL
-- Keeping:  "Staff can update phase_progress in own IMO" USING + WITH CHECK: is_staff_role() AND imo_id = get_my_imo_id()
DROP POLICY IF EXISTS "imo_staff_update_phase_progress" ON public.recruit_phase_progress;
