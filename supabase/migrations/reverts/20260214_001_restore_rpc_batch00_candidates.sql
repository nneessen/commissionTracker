-- Rollback for Batch 00 RPC cleanup
-- Restores function definitions/comments/grants from the backup snapshot
-- created by:
--   supabase/migrations/20260214113000_drop_rpc_batch00_candidates.sql

DO $$
DECLARE
  v_batch_id constant text := 'rpc_batch00_2026_02_14';
  v_restore_count integer := 0;
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.rpc_function_drop_backup
    WHERE batch_id = v_batch_id
  ) THEN
    RAISE EXCEPTION 'Rollback aborted: no backup rows found for batch_id=%', v_batch_id;
  END IF;

  FOR r IN
    SELECT function_def
    FROM public.rpc_function_drop_backup
    WHERE batch_id = v_batch_id
    ORDER BY id
  LOOP
    EXECUTE r.function_def;
    v_restore_count := v_restore_count + 1;
  END LOOP;

  FOR r IN
    SELECT function_schema, function_name, identity_args, function_comment
    FROM public.rpc_function_drop_backup
    WHERE batch_id = v_batch_id
      AND function_comment IS NOT NULL
    ORDER BY id
  LOOP
    EXECUTE format(
      'COMMENT ON FUNCTION %I.%I(%s) IS %L;',
      r.function_schema,
      r.function_name,
      r.identity_args,
      r.function_comment
    );
  END LOOP;

  FOR r IN
    SELECT grant_sql
    FROM public.rpc_function_drop_backup_grants
    WHERE batch_id = v_batch_id
    ORDER BY id
  LOOP
    EXECUTE r.grant_sql;
  END LOOP;

  RAISE NOTICE 'Rollback complete for %. Restored % function overload(s).', v_batch_id, v_restore_count;
END;
$$;
