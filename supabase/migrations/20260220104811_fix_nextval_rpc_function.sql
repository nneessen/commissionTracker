-- supabase/migrations/20260220104811_fix_nextval_rpc_function.sql
-- Migration: Fix nextval RPC wrapper function
-- Purpose: Correct sequence name validation logic

CREATE OR REPLACE FUNCTION public.nextval(sequence_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value bigint;
  clean_sequence_name text;
BEGIN
  -- Remove schema prefix if provided (e.g., "public.seq_name" -> "seq_name")
  clean_sequence_name := regexp_replace(sequence_name, '^public\.', '');

  -- Validate sequence exists in public schema
  IF NOT EXISTS (
    SELECT 1
    FROM pg_sequences
    WHERE schemaname = 'public'
    AND sequencename = clean_sequence_name
  ) THEN
    RAISE EXCEPTION 'Sequence % does not exist in public schema', clean_sequence_name;
  END IF;

  -- Call nextval using validated sequence name
  EXECUTE format('SELECT nextval(%L)', 'public.' || clean_sequence_name) INTO next_value;

  RETURN next_value;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.nextval(text) TO authenticated;
