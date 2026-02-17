-- supabase/migrations/20260217124800_remove_duplicate_rls_policies.sql
-- =============================================================================
-- Remove duplicate/redundant RLS policies (Phase 1)
-- =============================================================================
--
-- Removes 31 policies that are provably redundant:
--   Category A: 13 exact textual duplicates (identical USING + WITH CHECK)
--   Category B: 18 specific-command policies fully subsumed by ALL policies
--
-- Each DROP is safe because an identical-condition policy remains on the table.
-- Zero functional impact — authorization behavior is unchanged.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Category A: Exact textual duplicates
-- For each pair with identical expressions, drop the less-conventionally-named one
-- ---------------------------------------------------------------------------

-- recruit_checklist_progress: two INSERT pairs with identical WITH CHECK
DROP POLICY "Agency owners can insert recruit_checklist_progress in own agen" ON public.recruit_checklist_progress;
DROP POLICY "IMO admins can insert recruit_checklist_progress in own IMO" ON public.recruit_checklist_progress;

-- recruit_phase_progress: identical INSERT WITH CHECK
DROP POLICY "Agency owners can insert recruit_phase_progress in own agency" ON public.recruit_phase_progress;

-- training_challenge_participants: identical INSERT WITH CHECK
DROP POLICY "Users join challenges" ON public.training_challenge_participants;

-- training_quiz_attempts: identical INSERT WITH CHECK
DROP POLICY "Users insert own quiz_attempts" ON public.training_quiz_attempts;

-- training_user_badges: identical INSERT WITH CHECK
DROP POLICY "System insert user_badges" ON public.training_user_badges;

-- training_xp_entries: identical INSERT WITH CHECK
DROP POLICY "System insert xp_entries" ON public.training_xp_entries;

-- user_targets: all four CRUD policies duplicated
DROP POLICY user_targets_delete_own ON public.user_targets;
DROP POLICY user_targets_insert_own ON public.user_targets;
DROP POLICY user_targets_select_own ON public.user_targets;
DROP POLICY user_targets_update_own ON public.user_targets;

-- workflows: DELETE and UPDATE duplicates (exact same expression)
DROP POLICY "Users can delete their workflows" ON public.workflows;
DROP POLICY "Users can update their workflows" ON public.workflows;


-- ---------------------------------------------------------------------------
-- Category B: Specific-command policies subsumed by ALL policies
-- The ALL policy already covers the specific command with the same condition
-- ---------------------------------------------------------------------------

-- carrier_contracts: "Staff can manage contracts" ALL already covers SELECT
DROP POLICY "Staff can view all contracts" ON public.carrier_contracts;

-- commissions: "Super admins can manage all commissions" ALL covers SELECT
DROP POLICY "Super admins can view all commissions" ON public.commissions;

-- constants: "Approved users can manage constants" ALL covers SELECT
DROP POLICY "Approved users can read constants" ON public.constants;

-- email_queue: "System can manage email queue" ALL covers SELECT
DROP POLICY "Admins can view all queued emails" ON public.email_queue;

-- email_quota_tracking: "Admins can manage all quotas" ALL covers SELECT
DROP POLICY "Admins can view all quotas" ON public.email_quota_tracking;

-- override_commissions: "Super admins can manage all override_commissions" ALL covers SELECT
DROP POLICY "Super admins can view all override_commissions" ON public.override_commissions;

-- policies: "Super admins can manage all policies" ALL covers SELECT
DROP POLICY "Super admins can view all policies" ON public.policies;

-- product_commission_overrides: "Admins can manage commission overrides" ALL covers SELECT
DROP POLICY "Authenticated users can view commission overrides" ON public.product_commission_overrides;

-- training_progress: "Users manage own training_progress" ALL covers INSERT and UPDATE
DROP POLICY "Users can insert own progress" ON public.training_progress;
DROP POLICY "Users can update own progress" ON public.training_progress;

-- training_user_certifications: "Staff manage user_certifications" ALL covers SELECT
DROP POLICY "Staff view all certifications in IMO" ON public.training_user_certifications;

-- training_user_stats: "Users manage own stats" ALL covers INSERT, SELECT, and UPDATE
DROP POLICY "Users can insert own stats" ON public.training_user_stats;
DROP POLICY "Users view own stats" ON public.training_user_stats;
DROP POLICY "Users can update own stats" ON public.training_user_stats;

-- user_subscription_addons: "Super admins can manage user addons" ALL covers SELECT
DROP POLICY "Super admins can view all user addons" ON public.user_subscription_addons;

-- user_subscriptions: "user_subscriptions_admin_all" ALL covers INSERT
DROP POLICY user_subscriptions_insert_admin ON public.user_subscriptions;

-- workflow_actions: "Admins/trainers can manage all workflow actions" ALL covers SELECT
DROP POLICY "Admins/trainers can view all workflow actions" ON public.workflow_actions;

-- workflow_actions: "Users can manage actions for their workflows" ALL covers SELECT
DROP POLICY "Users can view actions for their workflows" ON public.workflow_actions;
