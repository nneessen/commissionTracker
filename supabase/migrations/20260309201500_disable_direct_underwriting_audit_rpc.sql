BEGIN;

COMMENT ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) IS
'Deprecated direct underwriting audit RPC. Authoritative audit rows must be written inside the backend-only persist_underwriting_run_v1 path.';

REVOKE ALL ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) FROM authenticated;

REVOKE ALL ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) FROM service_role;

COMMIT;
