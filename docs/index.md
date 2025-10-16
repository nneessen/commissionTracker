# Documentation Index

## Quick Navigation

### 📚 Core Documentation
- [README.md](../README.md) - Project overview and setup instructions
- [CLAUDE.md](../CLAUDE.md) - Claude Code guidelines and project rules
- [API Documentation](./api-documentation.md) - Service layer and API reference

### 🏗️ Architecture & Design
- [Application Architecture](./application-architecture.md) - System design and structure
- [KPI Definitions](./kpi-definitions.md) - Key performance indicator formulas
- [Commission Lifecycle Rules](./commission-lifecycle-business-rules.md) - Business rules for commissions

### 💻 Implementation Guides
- [Policy Addition Flow](./policy-addition-flow.md) - Complete guide for adding policies
- [Expense System Guide](./expense-system-guide.md) - Expense tracking implementation
- [Time Period Filter Implementation](./time-period-filter-implementation.md) - Date filtering system
- [Migration Best Practices](./migration-best-practices.md) - Database migration guidelines

### ✅ Completed Features
- [Dashboard Redesign](./dashboard/) - Data-dense dashboard implementation
- [Email Templates](./email-templates/) - Email verification templates
- [Calculations Verified](./CALCULATIONS_VERIFIED.md) - Commission calculation verification

### 📊 Project Status
- [Progress Report](./PROGRESS.md) - Current development status
- [Project Status (Oct 3)](./PROJECT_STATUS_2025-10-03.md) - Milestone status report
- [Refactoring Summary](./REFACTORING_SUMMARY.md) - Recent refactoring efforts

### 📋 Completed Plans
Located in `/plans/completed/`:
- Contract-level commission system
- Dashboard redesign with quick actions
- Time period filtering
- Commission management grid
- Expense page redesign
- And 17+ more completed features

## Key Features Implemented

### ✅ Recent Major Updates (Oct 2025)
1. **Contract-Level Commission System**
   - Automatic commission calculations
   - Split management with upline agents
   - Advance tracking

2. **Dashboard Redesign**
   - Data-dense layout with multiple style options
   - Standard, Compact, and Terminal/Console layout variants
   - Quick action buttons
   - KPI metrics overview
   - Time period filtering

3. **Time Period Filtering**
   - MTD, YTD, Last 30/60/90 days
   - Custom date ranges
   - Consistent across all views

4. **Commission Management Grid**
   - Unified settings interface
   - Bulk operations
   - Real-time validation

5. **Expense Tracking Enhancements**
   - Category management
   - Receipt attachments
   - Reporting by category

## Dashboard Layout Options

The application provides **three dashboard layout variants**:

1. **Standard Dashboard** (`DashboardHome.tsx`)
   - Default layout with comprehensive metrics
   - Professional gradient design
   - Best for: General use and presentations

2. **Compact Dashboard** (`DetailedKPIGrid_Compact.tsx`)
   - 2-column responsive grid
   - Higher information density
   - Best for: Power users who need more data on screen

3. **Terminal Dashboard** (`DashboardHome_Terminal.tsx`)
   - Terminal/console aesthetic
   - Monospace fonts (Fira Code)
   - GitHub Dark theme colors
   - Symbol-based status indicators
   - Best for: Developers and terminal enthusiasts

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for styling constants.

---

## Database Schema
All migrations are in `/supabase/migrations/`
- Follow single migration directory rule
- Use Supabase CLI for migrations
- Test locally before production

## Development Workflow

### Adding New Features
1. Create plan in `/plans/ACTIVE/`
2. Implement feature following CLAUDE.md rules
3. Test thoroughly
4. Update relevant documentation
5. Move plan to `/plans/completed/`

### Testing Checklist
- [ ] TypeScript strict mode passes
- [ ] All tests pass
- [ ] No console errors
- [ ] Data persists after refresh (no local storage)
- [ ] RLS policies work correctly

### Before Committing
- [ ] Run `npm run typecheck`
- [ ] Test locally with `npm run dev`
- [ ] Check for sensitive data
- [ ] Update documentation if needed

## Quick Links

### External Resources
- [Supabase Dashboard](https://supabase.com/dashboard)
- [shadcn/ui Components](https://ui.shadcn.com)
- [TanStack Documentation](https://tanstack.com)

### Internal Tools
- Commission Calculator: `/src/services/commissions/CommissionCalculationService.ts`
- Policy Form: `/src/features/policies/components/PolicyForm.tsx`
- Dashboard: `/src/features/dashboard/components/Dashboard.tsx`

## Need Help?

1. Check CLAUDE.md for project rules
2. Review relevant feature documentation
3. Look at completed plans for examples
4. Check API documentation for service methods