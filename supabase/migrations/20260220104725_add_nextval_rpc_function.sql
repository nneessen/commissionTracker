-- supabase/migrations/20260220104725_add_nextval_rpc_function.sql
-- Migration: Add nextval RPC wrapper function for sequence access
-- Purpose: Allows client-side code to safely call nextval on sequences via RPC

-- Create or replace the nextval RPC function
CREATE OR REPLACE FUNCTION public.nextval(sequence_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value bigint;
BEGIN
  -- Validate sequence name to prevent SQL injection
  IF NOT EXISTS (
    SELECT 1
    FROM pg_sequences
    WHERE schemaname = 'public'
    AND sequencename = sequence_name
  ) THEN
    RAISE EXCEPTION 'Sequence % does not exist in public schema', sequence_name;
  END IF;

  -- Call nextval using EXECUTE to handle dynamic sequence name
  EXECUTE format('SELECT nextval(%L)', 'public.' || sequence_name) INTO next_value;

  RETURN next_value;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.nextval(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.nextval(text) IS
  'RPC wrapper for PostgreSQL nextval() to safely increment sequences. ' ||
  'Validates sequence existence and prevents SQL injection.';
