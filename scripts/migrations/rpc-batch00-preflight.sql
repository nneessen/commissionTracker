-- Batch 00 preflight checks
-- Targets:
-- admin_delete_domain, admin_get_user_by_id, admin_update_user,
-- assign_user_role, award_training_xp, calculate_client_age,
-- calculate_earned_amount, calculate_months_paid, calculate_next_run_time,
-- calculate_premium

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
),
resolved AS (
  SELECT
    p.oid,
    n.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_args,
    pg_get_function_result(p.oid) AS return_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN target_names t ON t.name = p.proname
  WHERE n.nspname = 'public'
)
SELECT
  function_schema,
  function_name,
  identity_args,
  return_type
FROM resolved
ORDER BY function_name, identity_args;

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
SELECT t.name AS missing_function_name
FROM target_names t
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = t.name
)
ORDER BY t.name;

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
),
resolved AS (
  SELECT
    p.oid,
    n.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN target_names t ON t.name = p.proname
  WHERE n.nspname = 'public'
)
SELECT
  r.function_schema,
  r.function_name,
  r.identity_args,
  d.deptype,
  pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object
FROM resolved r
JOIN pg_depend d ON d.refobjid = r.oid
WHERE d.deptype IN ('n', 'a', 'i', 'e')
ORDER BY r.function_name, r.identity_args;

SELECT
  batch_id,
  count(*) AS backed_up_functions,
  min(dropped_at) AS first_backup_at,
  max(dropped_at) AS last_backup_at
FROM public.rpc_function_drop_backup
WHERE batch_id = 'rpc_batch00_2026_02_14'
GROUP BY batch_id;
