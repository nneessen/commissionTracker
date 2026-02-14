-- Batch 00 post-apply checks

WITH target_names(name) AS (
  VALUES
    ('admin_delete_domain'),
    ('admin_get_user_by_id'),
    ('admin_update_user'),
    ('assign_user_role'),
    ('award_training_xp'),
    ('calculate_client_age'),
    ('calculate_earned_amount'),
    ('calculate_months_paid'),
    ('calculate_next_run_time'),
    ('calculate_premium')
)
SELECT
  p.proname AS remaining_function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN target_names t ON t.name = p.proname
WHERE n.nspname = 'public'
ORDER BY p.proname, identity_args;

SELECT
  count(*) AS backup_function_rows
FROM public.rpc_function_drop_backup
WHERE batch_id = 'rpc_batch00_2026_02_14';

SELECT
  count(*) AS backup_grant_rows
FROM public.rpc_function_drop_backup_grants
WHERE batch_id = 'rpc_batch00_2026_02_14';

SELECT
  version,
  name
FROM supabase_migrations.schema_migrations
WHERE version = '20260214113000';
