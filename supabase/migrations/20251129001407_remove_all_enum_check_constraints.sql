-- ============================================================================
-- REMOVE ALL ENUM-STYLE CHECK CONSTRAINTS
-- ============================================================================
-- Purpose: Remove rigid enum-style CHECK constraints that make it painful to
--          add/modify enum values. Move validation to TypeScript layer for
--          flexibility and maintainability.
--
-- Reason:  Every time we want to add a new phase, status, or type, we need
--          a database migration. TypeScript already enforces these values at
--          the application layer, making DB constraints redundant and painful.
--
-- Scope:   Removes 15 enum-style TEXT constraints
--          Keeps 7 valid business rule constraints (numeric ranges, self-refs)
--
-- Risk:    VERY LOW - TypeScript validation already in place, single-user app
-- ============================================================================

BEGIN;

-- ============================================================================
-- CONSTRAINTS TO REMOVE (15 total)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_profiles table (2 constraints)
-- ----------------------------------------------------------------------------

-- approval_status: 'pending', 'approved', 'denied'
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_approval_status_check;

-- roles: array of hardcoded role names
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_roles_check;

-- ----------------------------------------------------------------------------
-- onboarding_phases table (2 constraints)
-- ----------------------------------------------------------------------------

-- phase_name: hardcoded phase names
ALTER TABLE public.onboarding_phases
DROP CONSTRAINT IF EXISTS onboarding_phases_phase_name_check;

-- status: 'not_started', 'in_progress', 'completed', 'blocked'
ALTER TABLE public.onboarding_phases
DROP CONSTRAINT IF EXISTS onboarding_phases_status_check;

-- ----------------------------------------------------------------------------
-- user_documents table (2 constraints)
-- ----------------------------------------------------------------------------

-- document_type: 'application', 'background_check', 'license', etc.
ALTER TABLE public.user_documents
DROP CONSTRAINT IF EXISTS user_documents_document_type_check;

-- status: 'pending', 'received', 'approved', 'rejected', 'expired'
ALTER TABLE public.user_documents
DROP CONSTRAINT IF EXISTS user_documents_status_check;

-- ----------------------------------------------------------------------------
-- user_emails table (1 constraint)
-- ----------------------------------------------------------------------------

-- status: 'draft', 'sending', 'sent', 'delivered', 'opened', 'failed'
ALTER TABLE public.user_emails
DROP CONSTRAINT IF EXISTS user_emails_status_check;

-- ----------------------------------------------------------------------------
-- user_activity_log table (1 constraint)
-- ----------------------------------------------------------------------------

-- action_type: 'created', 'updated', 'deleted', 'phase_changed', etc.
ALTER TABLE public.user_activity_log
DROP CONSTRAINT IF EXISTS user_activity_log_action_type_check;

-- ----------------------------------------------------------------------------
-- phase_checklist_items table (3 constraints)
-- ----------------------------------------------------------------------------

-- item_type: 'document_upload', 'task_completion', etc.
ALTER TABLE public.phase_checklist_items
DROP CONSTRAINT IF EXISTS phase_checklist_items_item_type_check;

-- can_be_completed_by: 'recruit', 'upline', 'system'
ALTER TABLE public.phase_checklist_items
DROP CONSTRAINT IF EXISTS phase_checklist_items_can_be_completed_by_check;

-- verification_by: 'upline', 'system'
ALTER TABLE public.phase_checklist_items
DROP CONSTRAINT IF EXISTS phase_checklist_items_verification_by_check;

-- ----------------------------------------------------------------------------
-- recruit_phase_progress table (1 constraint)
-- ----------------------------------------------------------------------------

-- status: 'not_started', 'in_progress', 'completed', 'blocked', 'skipped'
ALTER TABLE public.recruit_phase_progress
DROP CONSTRAINT IF EXISTS recruit_phase_progress_status_check;

-- ----------------------------------------------------------------------------
-- recruit_checklist_progress table (1 constraint)
-- ----------------------------------------------------------------------------

-- status: 'not_started', 'in_progress', 'completed', 'approved', 'rejected', 'needs_resubmission'
ALTER TABLE public.recruit_checklist_progress
DROP CONSTRAINT IF EXISTS recruit_checklist_progress_status_check;

-- ----------------------------------------------------------------------------
-- pipeline_phases table (1 constraint)
-- ----------------------------------------------------------------------------

-- required_approver_role: 'upline', 'admin', 'system'
ALTER TABLE public.pipeline_phases
DROP CONSTRAINT IF EXISTS pipeline_phases_required_approver_role_check;

-- ----------------------------------------------------------------------------
-- hierarchy_invitations table (1 constraint)
-- ----------------------------------------------------------------------------

-- status: 'pending', 'accepted', 'denied', 'cancelled', 'expired'
ALTER TABLE public.hierarchy_invitations
DROP CONSTRAINT IF EXISTS hierarchy_invitations_status_check;

COMMIT;

-- ============================================================================
-- CONSTRAINTS KEPT (7 total - Valid Business Rules)
-- ============================================================================
--
--  check_no_self_recruitment - Cannot recruit yourself
--  chk_no_self_upline - Cannot be your own upline
--  chk_inviter_not_invitee - Cannot invite yourself
--  onboarding_phases_phase_order_check - Phase order 1-8
--  phase_checklist_items_item_order_check - Item order > 0
--  pipeline_phases_phase_order_check - Phase order > 0
--  pipeline_phases_estimated_days_check - Days >= 0 or NULL
--
-- ============================================================================

-- ============================================================================
-- VALIDATION STRATEGY
-- ============================================================================
--
-- All enum values are now validated at the TypeScript layer:
--
-- - src/types/recruiting.ts: OnboardingStatus, DocumentType, EmailStatus, etc.
-- - Forms use these types for compile-time safety
-- - Services enforce types via TypeScript parameters
-- - No runtime risk in single-user application
--
-- Database constraints now enforce only:
--   - Referential integrity (foreign keys)
--   - Required fields (NOT NULL)
--   - Uniqueness (UNIQUE)
--   - Numeric business rules (ranges, non-negative)
--   - Logical impossibilities (self-references)
--
-- NOT for:
--   - Enum-style string validation (TypeScript handles this)
--   - Pattern matching (TypeScript handles this)
--   - Business logic that may evolve (TypeScript handles this)
--
-- ============================================================================

-- Add helpful comments to clarify validation approach
COMMENT ON COLUMN public.user_profiles.approval_status IS 'Approval status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.user_profiles.roles IS 'User roles array. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.onboarding_phases.phase_name IS 'Phase name. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.onboarding_phases.status IS 'Phase status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.user_documents.document_type IS 'Document type. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.user_documents.status IS 'Document status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.user_emails.status IS 'Email status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.user_activity_log.action_type IS 'Action type. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.phase_checklist_items.item_type IS 'Checklist item type. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.phase_checklist_items.can_be_completed_by IS 'Completion role. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.phase_checklist_items.verification_by IS 'Verification role. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.recruit_phase_progress.status IS 'Progress status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.recruit_checklist_progress.status IS 'Checklist status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.pipeline_phases.required_approver_role IS 'Required approver role. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.hierarchy_invitations.status IS 'Invitation status. Validated at application layer via TypeScript types.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after migration to verify constraints were removed:
--
-- SELECT table_name, constraint_name
-- FROM information_schema.table_constraints
-- WHERE constraint_type = 'CHECK'
--   AND table_schema = 'public'
--   AND (
--     constraint_name LIKE '%status%check' OR
--     constraint_name LIKE '%type%check' OR
--     constraint_name LIKE '%role%check' OR
--     constraint_name LIKE '%name%check'
--   )
-- ORDER BY table_name, constraint_name;
--
-- Should only show the 7 valid business rule constraints kept above.
-- ============================================================================
