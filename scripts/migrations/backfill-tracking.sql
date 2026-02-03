-- scripts/migrations/backfill-tracking.sql
-- Backfill schema_migrations tracking table with all new-format migrations
-- These migrations were applied via direct psql but never tracked
-- Safe to run multiple times - uses ON CONFLICT DO NOTHING

-- First, let's see what we have before
SELECT 'BEFORE: ' || COUNT(*) || ' migrations tracked' as status FROM supabase_migrations.schema_migrations;

-- Insert all new-format migrations (YYYYMMDDHHMMSS_*)
-- These have unique version numbers so no collision issues
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
('20260118122916', 'add_uw_wizard_user_access'),
('20260120160219', 'landing_page_settings'),
('20260120180120', 'landing_page_imo_admin_rls'),
('20260121120112', 'fix_broken_hierarchy_paths'),
('20260121134419', 'vendor_hard_delete'),
('20260121155549', 'fix_uw_rule_field_names'),
('20260121165335', 'fix_foresters_diabetes_product_rules'),
('20260121180000', 'baltimore_life_apriority_acceptance_rules'),
('20260121190000', 'fix_foresters_copd_product_rules'),
('20260121200000', 'fix_transamerica_fe_express_predicates'),
('20260121210000', 'fix_baltimore_life_condition_codes_case'),
('20260121220000', 'migrate_baltimore_life_v1_to_v2'),
('20260126125128', 'unified_first_sale'),
('20260127091516', 'gmail_oauth_integration'),
('20260127102829', 'training_documents'),
('20260127132900', 'fix_pipeline_rls_policies'),
('20260127135651', 'add_subscription_admin_system'),
('20260127144007', 'fix_subscription_rls_and_remove_starter'),
('20260127161944', 'add_premium_branding_features'),
('20260127164337', 'uw_wizard_tiered_usage'),
('20260127174607', 'fix_subscription_feature_gating'),
('20260128075800', 'subscription_settings'),
('20260128085225', 'add_analytics_feature'),
('20260128093306', 'fix_subscription_gating'),
('20260128094641', 'add_slack_linkedin_messaging_features'),
('20260128101722', 'fix_recruit_contract_level_validation'),
('20260128102349', 'allow_admin_update_users'),
('20260128104619', 'graduate_recruit_rpc'),
('20260128110130', 'fix_graduate_rpc_columns'),
('20260128110341', 'fix_graduate_rpc_schema'),
('20260128133905', 'slack_trigger_submit_date_filter'),
('20260128134836', 'fix_slack_trigger_remove_submit_date'),
('20260128135940', 'add_submit_date_column'),
('20260128160119', 'fix_instagram_conversations_user_fk'),
('20260128163807', 'leaderboard_rpc'),
('20260128165513', 'leaderboard_rpc_v2'),
('20260128170509', 'leaderboard_fix_column_name'),
('20260128174229', 'restore_slack_trigger_submit_date_check'),
('20260128211514', 'recruit_pipeline_rls_policies'),
('20260129081122', 'fix_submit_recruit_registration_overload'),
('20260129084814', 'fix_submit_registration_date_handling'),
('20260129093145', 'registration_with_password'),
('20260129100106', 'allow_reinvite_same_email'),
('20260129103421', 'fix_admin_deleteuser_recruit_invitations'),
('20260129110250', 'fix_registration_onboarding_started'),
('20260129111320', 'fix_admin_deleteuser_user_id_column'),
('20260129120447', 'fix_licensed_agent_roles'),
('20260129124021', 'fix_phase_progress_imo_id'),
('20260129125124', 'agency_leaderboard_recursive_hierarchy'),
('20260129132352', 'team_leaderboard_recursive_hierarchy'),
('20260129141235', 'fix_slack_backdated_policies_defense_in_depth'),
('20260129152701', 'fix_leaderboard_submit_date_filter'),
('20260129171835', 'agent_milestone_celebrations'),
('20260130085131', 'fix_hierarchy_path_on_insert'),
('20260130093141', 'add_team_analytics_function'),
('20260130115116', 'add_team_analytics_feature'),
('20260130122606', 'fix_policy_client_cascade_deletion'),
('20260130122627', 'add_agent_policy_delete_rls'),
('20260130124459', 'recruiters_can_view_their_recruits'),
('20260130160840', 'require_submit_date'),
('20260131103758', 'fix_default_subscription_to_free'),
('20260131113838', 'agent_view_team_contacts'),
('20260131113937', 'email_cost_tracking'),
('20260131120353', 'slack_auto_complete_first_sale_cron'),
('20260201150609', 'fix_agent_count_filtering'),
('20260201150823', 'fix_graduate_rpc_preserve_roles'),
('20260202105355', 'daily_submits_leaderboard'),
('20260202142045', 'slack_workspace_logo'),
('20260202152642', 'user_slack_member_overrides'),
('20260202155739', 'the_standard_team_management'),
('20260202161443', 'agency_members_can_view_each_other'),
('20260202184953', 'slack_wtd_mtd_functions'),
('20260202185104', 'fix_orphaned_policy_commissions'),
('20260202191101', 'fix_agency_submit_totals_hierarchy'),
('20260202191502', 'fix_submit_totals_no_status_filter'),
('20260202211533', 'fix_agency_totals_include_by_agency_id'),
('20260203111935', 'fix_slack_leaderboard_submit_date_only')
ON CONFLICT (version) DO NOTHING;

-- Show what we have after
SELECT 'AFTER: ' || COUNT(*) || ' migrations tracked' as status FROM supabase_migrations.schema_migrations;

-- Show the newly added migrations
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version::bigint > 20260117999999
ORDER BY version;
