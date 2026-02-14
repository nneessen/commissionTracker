-- Batch 00 RPC cleanup (safe, staged)
-- Date: 2026-02-14
--
-- This migration is intentionally conservative:
-- 1) Preflight checks for dependent objects via pg_depend
-- 2) Snapshots current function DDL/comments/grants before drop
-- 3) Drops only exact overload signatures discovered at runtime
--
-- Rollback migration:
--   supabase/migrations/reverts/20260214_001_restore_rpc_batch00_candidates.sql

CREATE TABLE IF NOT EXISTS public.rpc_function_drop_backup (
  id bigserial PRIMARY KEY,
  batch_id text NOT NULL,
  function_schema text NOT NULL,
  function_name text NOT NULL,
  identity_args text NOT NULL,
  function_def text NOT NULL,
  function_comment text,
  dropped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, function_schema, function_name, identity_args)
);

CREATE TABLE IF NOT EXISTS public.rpc_function_drop_backup_grants (
  id bigserial PRIMARY KEY,
  batch_id text NOT NULL,
  function_schema text NOT NULL,
  function_name text NOT NULL,
  identity_args text NOT NULL,
  grant_sql text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, function_schema, function_name, identity_args, grant_sql)
);

DO $$
DECLARE
  v_batch_id constant text := 'rpc_batch00_2026_02_14';
  v_target_names text[] := ARRAY[
    'admin_delete_domain',
    'admin_get_user_by_id',
    'admin_update_user',
    'assign_user_role',
    'award_training_xp',
    'calculate_client_age',
    'calculate_earned_amount',
    'calculate_months_paid',
    'calculate_next_run_time',
    'calculate_premium'
  ];
  v_missing text[];
  v_dependency_count integer;
  v_dependency_details text;
  v_drop_count integer := 0;
  r record;
BEGIN
  CREATE TEMP TABLE _rpc_batch00_targets ON COMMIT DROP AS
  SELECT
    p.oid,
    n.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_args,
    pg_get_functiondef(p.oid) AS function_def,
    obj_description(p.oid, 'pg_proc') AS function_comment,
    p.proacl,
    p.proowner
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = ANY (v_target_names);

  SELECT array_agg(name ORDER BY name)
  INTO v_missing
  FROM unnest(v_target_names) AS t(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM _rpc_batch00_targets x
    WHERE x.function_name = t.name
  );

  IF v_missing IS NOT NULL THEN
    RAISE NOTICE 'Batch %: function names not found in current DB: %', v_batch_id, array_to_string(v_missing, ', ');
  END IF;

  SELECT
    COUNT(*),
    string_agg(
      format(
        '%I.%I(%s) <- %s [deptype=%s]',
        t.function_schema,
        t.function_name,
        t.identity_args,
        pg_describe_object(d.classid, d.objid, d.objsubid),
        d.deptype
      ),
      E'\n'
      ORDER BY t.function_name, t.identity_args
    )
  INTO v_dependency_count, v_dependency_details
  FROM _rpc_batch00_targets t
  JOIN pg_depend d ON d.refobjid = t.oid
  WHERE d.deptype IN ('n', 'a', 'i', 'e');

  IF v_dependency_count > 0 THEN
    RAISE EXCEPTION
      'Batch % aborted: found % dependent objects on target functions. Details:%s%s',
      v_batch_id,
      v_dependency_count,
      E'\n',
      COALESCE(v_dependency_details, '(none)');
  END IF;

  INSERT INTO public.rpc_function_drop_backup (
    batch_id,
    function_schema,
    function_name,
    identity_args,
    function_def,
    function_comment
  )
  SELECT
    v_batch_id,
    function_schema,
    function_name,
    identity_args,
    function_def,
    function_comment
  FROM _rpc_batch00_targets
  ON CONFLICT (batch_id, function_schema, function_name, identity_args)
  DO NOTHING;

  INSERT INTO public.rpc_function_drop_backup_grants (
    batch_id,
    function_schema,
    function_name,
    identity_args,
    grant_sql
  )
  SELECT
    v_batch_id,
    t.function_schema,
    t.function_name,
    t.identity_args,
    format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO %s%s;',
      t.function_schema,
      t.function_name,
      t.identity_args,
      CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE quote_ident(pg_get_userbyid(acl.grantee))
      END,
      CASE
        WHEN acl.is_grantable THEN ' WITH GRANT OPTION'
        ELSE ''
      END
    ) AS grant_sql
  FROM _rpc_batch00_targets t
  CROSS JOIN LATERAL aclexplode(COALESCE(t.proacl, acldefault('f', t.proowner))) AS acl
  WHERE acl.privilege_type = 'EXECUTE'
  ON CONFLICT (batch_id, function_schema, function_name, identity_args, grant_sql)
  DO NOTHING;

  FOR r IN
    SELECT function_schema, function_name, identity_args
    FROM _rpc_batch00_targets
    ORDER BY function_name, identity_args
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s);',
      r.function_schema,
      r.function_name,
      r.identity_args
    );
    v_drop_count := v_drop_count + 1;
  END LOOP;

  RAISE NOTICE 'Batch % complete. Dropped % function overload(s).', v_batch_id, v_drop_count;
END;
$$;
