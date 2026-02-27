-- Migration: drop_dead_functions
-- Purpose: Remove 12 verified dead functions with zero references from
-- client code, edge functions, other PG functions, triggers, or RLS policies.
-- Verified via full cross-reference audit on 2026-02-27.
--
-- NOTE: get_current_user_hierarchy_path, get_current_user_profile_id, and
-- hierarchy_path_array were NOT dropped — they are used by RLS policies and indexes.

-- Orphaned trigger functions (exist but not attached to any table)
DROP FUNCTION IF EXISTS public.auto_create_commission_record();
DROP FUNCTION IF EXISTS public.on_target_milestone_reached();
DROP FUNCTION IF EXISTS public.trigger_calculate_next_run();
DROP FUNCTION IF EXISTS public.update_carrier_build_tables_updated_at();
DROP FUNCTION IF EXISTS public.update_product_build_tables_updated_at();

-- Replaced functions
DROP FUNCTION IF EXISTS public.check_first_seller_naming(uuid);  -- replaced by check_first_seller_naming_unified

-- Debug/one-time functions
DROP FUNCTION IF EXISTS public.test_rls_for_user(uuid);
DROP FUNCTION IF EXISTS public.setup_baltimore_life_apriority_rules(uuid, uuid, uuid);

-- Unreferenced business logic
DROP FUNCTION IF EXISTS public.calculate_quiz_score(jsonb, jsonb);  -- replaced by submit_training_quiz_attempt
DROP FUNCTION IF EXISTS public.calculate_unearned_amount(numeric, integer, integer);
DROP FUNCTION IF EXISTS public.check_module_completion(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_training_badges(uuid);
