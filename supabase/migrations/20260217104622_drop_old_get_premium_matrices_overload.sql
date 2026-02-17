-- Drop the old single-argument overload of get_premium_matrices_for_imo.
-- The new 3-argument version (uuid, integer, integer) with native LIMIT/OFFSET
-- was added in migration 20260217103400. PostgreSQL treats different argument
-- signatures as separate functions, so the old unoptimized (uuid) version
-- is still live and could be called if a client omits p_limit/p_offset.
DROP FUNCTION IF EXISTS public.get_premium_matrices_for_imo(uuid);
