# Plan File Naming Convention

## Format
`YYYYMMDD_STATUS_description.md`

## Status Options
- **ACTIVE** - Currently being worked on
- **PENDING** - Planned but not started
- **COMPLETED** - Successfully finished
- **ARCHIVED** - Old/superseded plans
- **TEST** - Test-related plans
- **REFERENCE** - Reference documentation/checklists

## Directory Structure
```
plans/
├── ACTIVE/      # Current work
├── COMPLETED/   # Finished plans
├── ARCHIVED/    # Old plans
└── *.md         # Root level for quick access
```

## Examples
- `20251001_COMPLETED_auth_verification_summary.md`
- `20251001_PENDING_commission_guide_ui_refactor.md`
- `20251001_ACTIVE_master_project.md`
- `20251002_COMPLETED_auth_error_handling_routing_fix.md`

## Best Practices
1. Use lowercase for description part with underscores
2. Move files to appropriate directories when status changes
3. Keep descriptions concise but meaningful
4. Date format is YYYYMMDD (ISO 8601 compact)
5. Status is always UPPERCASE