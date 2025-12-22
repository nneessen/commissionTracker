# Phase 11: Audit Trail & Activity Logs

## Implementation Date
2025-12-22

## Summary
Implemented org-scoped audit trail system with automatic trigger-based capture for critical business tables, paginated UI with filters, and CSV export.

## Key Features
- Database triggers for automatic audit logging (policies, commissions, clients, user_profiles, override_commissions)
- Captures INSERT/UPDATE/DELETE with old/new data and changed field detection
- Org-scoped RLS (IMO admins see their IMO's logs, agency owners see their agency's logs)
- Retention: 90 days for non-financial, 365 days for financial data
- Paginated query with filters (table, action, action_type, performer, date range, search)
- Detail view with before/after data diff
- Export to CSV
- Integrated into Settings > Audit Trail tab (visible to IMO admins only)

## Database Objects
- Table: `audit_log` with imo_id, agency_id, table_name, record_id, action, performed_by, old_data, new_data, changed_fields
- Triggers: audit_policies, audit_commissions, audit_clients, audit_user_profiles, audit_override_commissions
- RPCs: get_audit_logs, get_audit_log_detail, get_audit_action_types, get_audit_tables, get_audit_performers, log_audit_event, cleanup_old_audit_logs

## Key Files
- Migrations: 20251222_030-033_audit_*.sql
- Service: src/services/audit/
- Hooks: src/hooks/audit/
- UI: src/features/audit/

## Access Control
- Super admins: view all
- IMO admins: view their IMO's logs
- Agency owners: view their agency's logs
- Users: view logs for actions they performed
