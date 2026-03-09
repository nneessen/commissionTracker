-- Migration: Restore admin_delete_domain RPC
-- This function was erroneously dropped in 20260214113000_drop_rpc_batch00_candidates.sql
-- The batch cleanup script only searched src/ for callsites, missing the edge function
-- at supabase/functions/custom-domain-delete/index.ts (line 113) which calls this RPC.
-- Without it, domain deletion is broken for ALL users.

CREATE OR REPLACE FUNCTION admin_delete_domain(
  p_domain_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM custom_domains
  WHERE id = p_domain_id AND user_id = p_user_id;
  RETURN FOUND;
END;
$$;

-- Service role only — edge functions call this, not users directly
REVOKE EXECUTE ON FUNCTION admin_delete_domain FROM PUBLIC;
