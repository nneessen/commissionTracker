## ✅ FIXED: Database Constraints (2025-11-28)

**_ WHEN ANY TASK HERE IS COMPLETED/FIXED, NOTATE IT SO I KNOW ITS BEEN COMPELTED _**

### ALL ENUM-STYLE CHECK CONSTRAINTS - ✅ FIXED (2025-11-28)

**Issue**: 19 enum-style CHECK constraints were making it painful to add new values (phases, statuses, types, etc.). Every change required a database migration.

**Solution**: Removed ALL enum-style constraints. Validation now handled exclusively at TypeScript layer.

**Migrations Applied**:
1. `20251129000407_remove_onboarding_status_constraint.sql` - Initial fix for onboarding_status
2. `20251129001407_remove_all_enum_check_constraints.sql` - Removed 15 constraints across all tables
3. `20251129001553_remove_remaining_enum_constraints.sql` - Removed final 4 constraints (override_commissions, expense_templates, roles, permissions)

**Constraints Removed (19 total)**:

**Recruiting/Onboarding** (11):
- ✅ `user_profiles.approval_status`
- ✅ `user_profiles.roles`
- ✅ `onboarding_phases.phase_name`
- ✅ `onboarding_phases.status`
- ✅ `user_documents.document_type`
- ✅ `user_documents.status`
- ✅ `user_emails.status`
- ✅ `user_activity_log.action_type`
- ✅ `phase_checklist_items.item_type`
- ✅ `phase_checklist_items.can_be_completed_by`
- ✅ `phase_checklist_items.verification_by`

**Pipeline** (2):
- ✅ `recruit_phase_progress.status`
- ✅ `recruit_checklist_progress.status`

**Hierarchy** (2):
- ✅ `hierarchy_invitations.status`
- ✅ `pipeline_phases.required_approver_role`

**Expenses** (1):
- ✅ `expense_templates.recurring_frequency`

**Commissions** (1):
- ✅ `override_commissions.status`

**RBAC** (2):
- ✅ `roles.name` (regex pattern)
- ✅ `permissions.code` (regex pattern)

**Result**: Database now accepts any TEXT values. TypeScript types enforce validation at application layer. Adding new enum values no longer requires migrations.

**Updated**: CLAUDE.md with new "Database Constraint Philosophy" section explaining when/when not to use constraints.

---

## Page: Analytics

- policy status overview has an issue
- the chart/graph is not displaying anything. everything is at 0 for every month, which is wrong.

## Page: Recruiting

- This has not been completed yet.
- issue lies in the checklist.
- why are some checklist items able to actually be checked off and others not. and we when building this form, we need to determine who is suppose to check off what. like does the recruit check off an item or does the upline/trainer/contract admin handle that?
