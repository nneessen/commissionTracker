-- supabase/migrations/20260114_006_remove_superadmin_domain_policy.sql
-- Migration: Remove super admin visibility for custom domains
--
-- User explicitly requested: "i don't want to see other users domains"
-- Super admins should only see their own custom domains in settings.

-- Drop the super admin SELECT policy
DROP POLICY IF EXISTS "Super admins can view all domains" ON custom_domains;

COMMENT ON TABLE custom_domains IS 'Custom subdomains for recruiting pages. Users only see their own domains - no super admin override.';
