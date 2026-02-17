-- Move pg_trgm and pg_net extensions from public schema to extensions schema.
-- Resolves Supabase Security Advisor "extension_in_public" warnings.
--
-- pg_trgm: All its functions/operators/types live in public and will move to extensions.
--   The database search_path is ("$user", public, extensions) so all references
--   resolve without schema qualification. The 1 GIN index using gin_trgm_ops
--   stores operator OIDs, not names, so it is unaffected.
--   No application functions call pg_trgm functions directly.
--
-- pg_net: All its objects already live in the `net` schema (not public).
--   This ALTER only changes where the extension metadata is registered.
--   Application functions already use schema-qualified `net.http_post()` calls.

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;
