-- Migration: Audit Log Schema
-- Phase 11: Audit Trail & Activity Logs
-- Creates the unified audit_log table for tracking data changes

-- ============================================
-- CREATE ENUMS
-- ============================================

-- Audit action type
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Audit source type
DO $$ BEGIN
  CREATE TYPE audit_source AS ENUM ('trigger', 'application');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CREATE AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Org scoping (denormalized for efficient RLS)
  imo_id UUID REFERENCES imos(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- What changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,

  -- Who changed it (denormalized for historical accuracy)
  performed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  performed_by_name TEXT,
  performed_by_email TEXT,

  -- Change details
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],

  -- Context
  source audit_source NOT NULL DEFAULT 'trigger',
  action_type TEXT, -- Human-readable: policy_created, commission_paid, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR EFFICIENT QUERYING
-- ============================================

-- Primary filters
CREATE INDEX IF NOT EXISTS idx_audit_log_imo_id
  ON audit_log(imo_id) WHERE imo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_agency_id
  ON audit_log(agency_id) WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name
  ON audit_log(table_name);

CREATE INDEX IF NOT EXISTS idx_audit_log_record_id
  ON audit_log(record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by
  ON audit_log(performed_by) WHERE performed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
  ON audit_log(action_type) WHERE action_type IS NOT NULL;

-- Time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_imo_created
  ON audit_log(imo_id, created_at DESC) WHERE imo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_agency_created
  ON audit_log(agency_id, created_at DESC) WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_table_created
  ON audit_log(table_name, created_at DESC);

-- For retention cleanup queries
CREATE INDEX IF NOT EXISTS idx_audit_log_cleanup
  ON audit_log(created_at, table_name);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE audit_log IS 'Unified audit trail for tracking data changes across critical business tables';
COMMENT ON COLUMN audit_log.imo_id IS 'Denormalized IMO ID for efficient RLS filtering';
COMMENT ON COLUMN audit_log.agency_id IS 'Denormalized Agency ID for efficient RLS filtering';
COMMENT ON COLUMN audit_log.table_name IS 'Name of the table where change occurred';
COMMENT ON COLUMN audit_log.record_id IS 'Primary key of the affected record';
COMMENT ON COLUMN audit_log.action IS 'Type of database operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN audit_log.performed_by IS 'User who made the change (from auth.uid())';
COMMENT ON COLUMN audit_log.performed_by_name IS 'Denormalized user name for historical accuracy';
COMMENT ON COLUMN audit_log.performed_by_email IS 'Denormalized user email for historical accuracy';
COMMENT ON COLUMN audit_log.old_data IS 'Full record state before change (UPDATE/DELETE)';
COMMENT ON COLUMN audit_log.new_data IS 'Full record state after change (INSERT/UPDATE)';
COMMENT ON COLUMN audit_log.changed_fields IS 'Array of field names that changed (UPDATE only)';
COMMENT ON COLUMN audit_log.source IS 'Whether captured by database trigger or application code';
COMMENT ON COLUMN audit_log.action_type IS 'Human-readable action type (e.g., policy_created, commission_paid)';
COMMENT ON COLUMN audit_log.description IS 'Human-readable description of the change';
COMMENT ON COLUMN audit_log.metadata IS 'Additional context (IP address, user agent, etc.)';
