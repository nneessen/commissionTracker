-- supabase/migrations/20260220104844_fix_nextval_recursion.sql
-- Migration: Fix infinite recursion in nextval RPC function
-- Purpose: Explicitly call pg_catalog.nextval to avoid calling our own function

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

  -- Call PostgreSQL's built-in nextval using pg_catalog schema to avoid recursion
  EXECUTE format('SELECT pg_catalog.nextval(%L)', 'public.' || clean_sequence_name) INTO next_value;

  RETURN next_value;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.nextval(text) TO authenticated;
