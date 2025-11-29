# Reports Page Professional Redesign & Enhancement Plan

**Created**: 2025-11-29
**Status**: Planning
**Estimated Effort**: 10-15 weeks (phased implementation)
**Priority**: High - Core business intelligence feature

---

## Executive Summary

Transform the reports page from basic metric displays into a **professional-grade business intelligence system** suitable for a real insurance business. This includes:

1. **10x deeper report content** with actionable insights
2. **Professional document-style UI** (not cookie-cutter cards)
3. **Multi-report export bundles** (all reports in one comprehensive document)
4. **Interactive exploration** and drill-down capabilities
5. **Automation and scheduling** for hands-free reporting

---

## Problem Statement

**Current State Issues**:
- Reports use generic card layouts (cookie-cutter design)
- Basic metrics without deep analysis
- Single-report export only (can't export all reports as one package)
- Static reports with no drill-down or interaction
- Limited insights that aren't specific or actionable
- No automation or scheduling

**User Requirement**:
> "This is a real business, and I want this reporting page to look, feel, and be more elaborate as far as the reports that we're generating. We need to enhance these reports. They are all pretty basic, and then we also need to be able to export all the reports in one doc as well."

---

## Solution Architecture

### Three Core Pillars

#### 1. Enhanced Report Content (THE WHAT)

**Existing Reports - Deep Enhancements**:

1. **Executive Dashboard**:
   - Written executive summary (2-3 paragraphs synthesized from data)
   - Week-over-week and month-over-month momentum indicators
   - Cash flow projection (30/60/90 days)
   - Risk exposure summary
   - Action items prioritized by ROI potential

2. **Commission Performance**:
   - Commission aging analysis (pending, earned, paid buckets)
   - Carrier-by-carrier profitability (commission minus chargeback rate)
   - Commission per policy by product
   - Advance vs earned reconciliation with visual flow
   - Commission velocity (days from policy to payment by carrier)
   - Chargeback reserve calculation

3. **Policy Performance**:
   - Cohort analysis table (retention tracked month-by-month)
   - Persistency by carrier, product, state, premium band
   - Lapse prediction model (which policies likely to lapse?)
   - Policy quality score
   - Average policy lifespan trends
   - Policy portfolio concentration risk analysis

4. **Client Relationship**:
   - Client lifetime value calculation
   - Client segmentation (A/B/C based on premium, policies, loyalty)
   - Cross-sell matrix (what products each client has/needs)
   - Client acquisition cost by source
   - Orphan client analysis (only lapsed policies)
   - High-value client risk tracking

5. **Financial Health**:
   - Detailed P&L statement with categories
   - Cash flow statement (operating, investing, financing)
   - Break-even analysis
   - ROI by expense category (marketing → new policies)
   - Fixed vs variable expense breakdown
   - Financial runway calculation

6. **Predictive Analytics**:
   - 12-month commission forecast using regression
   - Chargeback forecast by cohort
   - Production trend forecast with confidence intervals
   - Client churn prediction
   - Revenue seasonality analysis
   - Scenario analysis (best case, likely case, worst case)

**NEW Report Types**:

7. **Carrier Performance Scorecard**:
   - Detailed per-carrier analysis
   - Metrics: avg commission rate, persistency, chargeback rate, payment speed
   - Carrier reliability score
   - Market share in agent's book
   - Competitive positioning matrix

8. **Product Line Analysis**:
   - Performance by product type
   - Premium concentration by product
   - Profitability by product (commission - chargeback)
   - Product mix optimization recommendations
   - Product pairing analysis (often sold together)

9. **Production Activity Report**:
   - Daily/weekly/monthly production tracking
   - Pipeline analysis (quotes → apps → issued → paid)
   - Conversion rate funnel
   - Activity-to-outcome ratios
   - Best producing days/weeks/months
   - Production goal tracking with pace metrics

10. **Risk Management Report**:
    - Chargeback exposure by aging bucket
    - Policy concentration risk (top 10 clients = X% of book)
    - Carrier/state concentration risk
    - Income stability analysis (recurring vs first-year)
    - Risk mitigation recommendations

11. **Marketing ROI Report**:
    - Lead source analysis
    - Cost per acquisition by source
    - Conversion rate by source
    - Client LTV by acquisition source
    - Campaign performance tracking

#### 2. Professional UI/UX (THE HOW)

**Layout Architecture - Three-Pane Design**:

```
┌────────────────────────────────────────────────────────────┐
│  Report Navigator  │  Report Viewer/Builder  │   Insights  │
│    (Left Pane)     │    (Center - Main)      │ (Right Pane)│
├────────────────────┼─────────────────────────┼─────────────┤
│                    │                         │             │
│ • Executive Rpts   │ ┌─ Config Toolbar ────┐│ • Top Ins.. │
│ • Financial Rpts   │ │ Time | Filters | Exp││ • Actions   │
│ • Performance      │ └─────────────────────┘│ • Related   │
│ • Risk & Comp.     │                         │ • Notes     │
│ • Custom           │ Report Content:         │             │
│                    │ [Document Style Layout] │             │
│ Recently Viewed:   │                         │             │
│ • Weekly Exec      │ NOT card grids          │             │
│ • Monthly Comp     │ Professional hierarchy  │             │
│                    │ Data-dense tables       │             │
│ Scheduled:         │ Advanced visualizations │             │
│ • Sunday 8pm       │                         │             │
└────────────────────┴─────────────────────────┴─────────────┘
```

**Report Viewer Modes**:
1. **Document Mode** (default) - Continuous scroll, professional layout like McKinsey report
2. **Dashboard Mode** - Cards and widgets for quick overview
3. **Table Mode** - Dense data tables for detailed analysis
4. **Presentation Mode** - Full screen slides through sections
5. **Compare Mode** - Side-by-side period comparison

**Visual Design Principles**:
- **NO cookie-cutter cards**: Varied layouts with purpose
- **Visual hierarchy**: 32px titles → 24px sections → 18px subsections
- **Data density**: Maximize data-ink ratio (Tufte principles)
- **Professional typography**: Font families that convey business professionalism
- **Semantic colors**: Red = risk, green = success, amber = warning
- **Subtle gradients** for emphasis, not decoration

**Advanced Visualizations**:
- **Cohort Retention Heatmap**: Rows = cohorts, columns = months, color = retention%
- **Commission Flow Sankey**: Visual money flow from policies → splits → net
- **Performance Quadrant Matrix**: Persistency vs Commission, bubble size = policies
- **Calendar Heatmap**: Production activity by day
- **Waterfall Charts**: Revenue/commission breakdown showing changes
- **Funnel Analysis**: Lead → quote → app → issued → paid conversion
- **Sparkline Tables**: Inline trend sparklines in data tables

#### 3. Export & Automation (THE DELIVERY)

**Multi-Report Export System**:

**PDF Bundle Features**:
- Professional cover page (business name, logo, date range, timestamp)
- Auto-generated table of contents with hyperlinked page numbers
- Consistent headers/footers across all pages
- Page numbering (Page X of Y)
- Executive summary synthesizing all reports
- Each report as separate section with clear breaks
- Watermark options ("Confidential", "Internal Use Only")
- Digital signature option

**Excel Workbook Features**:
- Summary dashboard sheet with links to all reports
- Each report as separate worksheet
- Consistent formatting across sheets
- Charts included as embedded objects
- Pivot table-ready data format
- Data validation and formulas preserved

**Predefined Bundle Templates**:
1. **Weekly Check-In**: Executive + Production + Top Insights (Quick review)
2. **Monthly Comprehensive**: All reports for previous month
3. **Quarterly Strategic**: Executive + Predictive + Financial + Risk
4. **Carrier Review**: Carrier Performance + Commission + Policy Analysis
5. **Agency Meeting Package**: Executive + Production + Client (for upline manager)
6. **Annual Report**: Year in review + next year planning

**Report Scheduling & Automation**:
- **Daily**: Quick metrics email (policies written, commission earned)
- **Weekly**: Sunday 8pm - Weekly performance package auto-generated
- **Monthly**: 1st of month at 6am - Full monthly report bundle
- **Quarterly**: First Monday of quarter - Strategic review
- **Custom**: User-defined schedules with cron expressions

**Delivery Methods**:
- Email with executive summary + PDF/Excel attachment
- Secure link to view online (expires in 30 days)
- Auto-save to Supabase Storage
- Optional Slack/Teams integration

---

## Technical Implementation

### Database Schema Changes

**New Tables**:

```sql
-- Report template definitions
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'executive', 'custom', 'scheduled', 'system'
  configuration JSONB NOT NULL, -- report structure, components, filters
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report bundle configurations
CREATE TABLE report_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  report_template_ids UUID[], -- array of templates to include
  default_time_period TEXT, -- 'MTD', 'YTD', 'custom'
  cover_page_config JSONB, -- title, subtitle, logo, watermark
  export_format TEXT, -- 'pdf', 'excel', 'both'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated report history
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES report_bundles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  time_period_start DATE NOT NULL,
  time_period_end DATE NOT NULL,
  filters JSONB,
  metrics_snapshot JSONB, -- key metrics for quick comparison
  file_path TEXT, -- Supabase Storage path
  file_format TEXT, -- 'pdf', 'excel', 'csv'
  file_size BIGINT,
  generation_time_ms INTEGER -- performance tracking
);

-- Report scheduling
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES report_bundles(id) ON DELETE CASCADE,
  schedule_type TEXT, -- 'daily', 'weekly', 'monthly', 'quarterly', 'custom'
  cron_expression TEXT, -- for custom schedules
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  delivery_method TEXT, -- 'email', 'storage_only', 'slack'
  delivery_config JSONB, -- email addresses, webhook URLs, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report annotations and notes
CREATE TABLE report_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  generated_report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
  report_section_id TEXT, -- section identifier within report
  metric_key TEXT, -- specific metric if applicable
  annotation_type TEXT, -- 'note', 'insight_status', 'variance_explanation'
  content TEXT, -- markdown supported
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action items from insights
CREATE TABLE report_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  generated_report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
  insight_id TEXT, -- from insight
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'dismissed'
  priority INTEGER, -- 1-10
  impact_estimate NUMERIC, -- estimated dollar impact
  due_date DATE,
  completed_at TIMESTAMPTZ,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Materialized Views for Performance**:

```sql
-- Daily production summary
CREATE MATERIALIZED VIEW mv_daily_production AS
SELECT
  user_id,
  DATE(effective_date) as date,
  COUNT(*) as policy_count,
  SUM(annual_premium) as total_premium,
  COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM policies
GROUP BY user_id, DATE(effective_date);

-- Carrier performance metrics
CREATE MATERIALIZED VIEW mv_carrier_performance AS
SELECT
  p.user_id,
  p.carrier_id,
  c.name as carrier_name,
  COUNT(p.id) as total_policies,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  AVG(p.annual_premium) as avg_premium,
  SUM(p.annual_premium) as total_premium,
  -- Add commission, chargeback aggregations
  ROUND(100.0 * COUNT(*) FILTER (WHERE p.status = 'active') / NULLIF(COUNT(*), 0), 2) as persistency_rate
FROM policies p
JOIN carriers c ON c.id = p.carrier_id
GROUP BY p.user_id, p.carrier_id, c.name;

-- Cohort retention analysis
CREATE MATERIALIZED VIEW mv_cohort_retention AS
WITH cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('month', effective_date) as cohort_month,
    id as policy_id,
    status,
    effective_date
  FROM policies
)
SELECT
  user_id,
  cohort_month,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, cohort_month)) * 12 +
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, cohort_month)) as months_since_issue,
  COUNT(*) as cohort_size,
  COUNT(*) FILTER (WHERE status = 'active') as still_active,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / COUNT(*), 2) as retention_rate
FROM cohorts
GROUP BY user_id, cohort_month, months_since_issue;

-- Commission aging buckets
CREATE MATERIALIZED VIEW mv_commission_aging AS
SELECT
  user_id,
  CASE
    WHEN months_paid < 3 THEN '0-3 months'
    WHEN months_paid < 6 THEN '3-6 months'
    WHEN months_paid < 9 THEN '6-9 months'
    WHEN months_paid < 12 THEN '9-12 months'
    ELSE '12+ months'
  END as aging_bucket,
  COUNT(*) as commission_count,
  SUM(unearned_amount) as total_at_risk
FROM commission_earning_detail
WHERE policy_status = 'active'
GROUP BY user_id, aging_bucket;

-- Client lifetime value
CREATE MATERIALIZED VIEW mv_client_ltv AS
SELECT
  p.user_id,
  p.client_id,
  COUNT(p.id) as total_policies,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  SUM(p.annual_premium) as total_premium,
  SUM(c.amount) as total_commission,
  ROUND(AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.effective_date)) * 12 +
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.effective_date))), 2) as avg_policy_age_months
FROM policies p
LEFT JOIN commissions c ON c.policy_id = p.id
GROUP BY p.user_id, p.client_id;

-- Refresh schedule: Daily at 2am
-- Can be triggered manually or via pg_cron
```

**Indexes for Performance**:

```sql
-- Policy queries
CREATE INDEX idx_policies_user_date ON policies(user_id, effective_date);
CREATE INDEX idx_policies_user_status ON policies(user_id, status);
CREATE INDEX idx_policies_user_carrier ON policies(user_id, carrier_id);
CREATE INDEX idx_policies_user_product ON policies(user_id, product_id);

-- Commission queries
CREATE INDEX idx_commissions_user_date ON commissions(user_id, payment_date);
CREATE INDEX idx_commissions_user_status ON commissions(user_id, status);

-- Expense queries
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_expenses_user_category ON expenses(user_id, category_id);
```

### Frontend Architecture

**Component Structure**:

```
src/features/reports/
├── ReportsPage.tsx                     # Main page (three-pane layout)
├── components/
│   ├── navigation/
│   │   ├── ReportNavigator.tsx        # Left pane: report list
│   │   └── ReportBreadcrumbs.tsx      # Breadcrumb navigation
│   ├── viewer/
│   │   ├── ReportViewer.tsx           # Center pane: main viewer
│   │   ├── DocumentView.tsx           # Document-style layout
│   │   ├── DashboardView.tsx          # Dashboard-style layout
│   │   ├── TableView.tsx              # Table-focused layout
│   │   ├── PresentationView.tsx       # Fullscreen presentation
│   │   └── CompareView.tsx            # Side-by-side comparison
│   ├── insights/
│   │   ├── InsightsPanel.tsx          # Right pane: insights
│   │   ├── ActionItemCard.tsx         # Individual action items
│   │   └── RelatedReports.tsx         # Related report suggestions
│   ├── builder/
│   │   ├── ReportBuilder.tsx          # Drag-and-drop builder
│   │   ├── ComponentLibrary.tsx       # Available components
│   │   ├── Canvas.tsx                 # Drop zone
│   │   └── ConfigurationPanel.tsx     # Component config
│   ├── export/
│   │   ├── ExportDialog.tsx           # Export options modal
│   │   ├── BundleBuilder.tsx          # Multi-report bundle creator
│   │   └── CoverPageEditor.tsx        # Customize cover page
│   ├── sections/
│   │   ├── ExecutiveSummary.tsx       # Written summary
│   │   ├── MetricsSection.tsx         # Metric displays
│   │   ├── TableSection.tsx           # Data tables
│   │   ├── ChartSection.tsx           # Visualizations
│   │   └── InsightsSection.tsx        # Insight cards
│   ├── visualizations/
│   │   ├── CohortHeatmap.tsx          # Retention heatmap
│   │   ├── SankeyFlow.tsx             # Commission flow
│   │   ├── QuadrantMatrix.tsx         # Performance matrix
│   │   ├── CalendarHeatmap.tsx        # Production calendar
│   │   ├── WaterfallChart.tsx         # Change breakdown
│   │   ├── FunnelChart.tsx            # Conversion funnel
│   │   └── SparklineTable.tsx         # Table with sparklines
│   ├── filters/
│   │   ├── ReportFilters.tsx          # Filter panel
│   │   ├── PeriodComparison.tsx       # Period selector with compare
│   │   └── SegmentSelector.tsx        # Segment comparison
│   └── scheduling/
│       ├── ScheduleEditor.tsx         # Create/edit schedules
│       └── ReportHistory.tsx          # Past reports browser
├── services/
│   ├── reportGenerationService.ts     # Enhanced generation logic
│   ├── reportExportService.ts         # PDF/Excel export
│   ├── pdfBundleService.ts            # Multi-report PDF
│   ├── excelBundleService.ts          # Multi-report Excel
│   ├── insightsService.ts             # Enhanced insights
│   ├── cohortAnalysisService.ts       # Cohort calculations
│   ├── forecastingService.ts          # Predictive analytics
│   └── annotationService.ts           # Notes and comments
└── hooks/
    ├── useReport.ts                   # Fetch single report
    ├── useReportBundle.ts             # Fetch report bundle
    ├── useReportHistory.ts            # Past reports
    ├── useReportSchedule.ts           # Scheduling
    └── useReportAnnotations.ts        # Notes CRUD
```

### Technology Stack Additions

**New Dependencies**:

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.10.0",      // Advanced tables
    "@nivo/core": "^0.84.0",                 // Advanced charts
    "@nivo/heatmap": "^0.84.0",
    "@nivo/sankey": "^0.84.0",
    "@nivo/calendar": "^0.84.0",
    "@dnd-kit/core": "^6.1.0",               // Drag-and-drop
    "react-grid-layout": "^1.4.0",           // Grid layout
    "jspdf": "^2.5.1",                       // PDF generation
    "jspdf-autotable": "^3.8.0",             // PDF tables
    "exceljs": "^4.4.0",                     // Excel generation
    "html2canvas": "^1.4.1",                 // Capture charts
    "react-markdown": "^9.0.1",              // Markdown support
    "remark-gfm": "^4.0.0",                  // GitHub markdown
    "react-sparklines": "^1.7.0",            // Inline sparklines
    "react-window": "^1.8.10",               // Virtual scrolling
    "use-debounce": "^10.0.0"                // Debounce inputs
  }
}
```

**Bundle Size Impact**: ~500KB gzipped (acceptable for feature richness)

---

## Implementation Phases

### Phase 1: Enhanced Report Content (Foundation)
**Duration**: 2-3 weeks
**Goal**: Make reports 10x more valuable

**Tasks**:
1. Create materialized views for performance calculations
2. Enhance all 6 existing report types:
   - Add deeper analysis and calculations
   - Implement comparative metrics
   - Add cohort analysis
   - Enhance insights with specificity
3. Create 3 new report types (prioritized):
   - Carrier Performance Scorecard
   - Risk Management Report
   - Production Activity Report
4. Implement advanced database queries and calculations
5. Enhance InsightsService with specific, actionable recommendations
6. Add unit tests for all calculations

**Deliverable**: Reports provide genuinely new insights not available before

---

### Phase 2: Professional UI/UX Redesign
**Duration**: 2 weeks
**Goal**: Remove cookie-cutter appearance, create professional document-style layouts

**Tasks**:
1. Implement three-pane layout architecture
2. Create ReportNavigator component (left pane)
3. Create InsightsPanel component (right pane)
4. Redesign report rendering:
   - DocumentView with professional typography and hierarchy
   - Remove uniform card grids
   - Implement varied, purposeful layouts
5. Create advanced visualization components:
   - CohortHeatmap
   - SankeyFlow for commission
   - CalendarHeatmap for production
   - WaterfallChart for changes
6. Implement data-dense tables with @tanstack/react-table:
   - Sorting, filtering, pagination
   - Conditional formatting
   - Inline sparklines
7. Add period comparison view (side-by-side)
8. Responsive design (with mobile simplification)

**Deliverable**: Reports look professional enough to present to stakeholders

---

### Phase 3: Multi-Report Export System
**Duration**: 1-2 weeks
**Goal**: Export all reports in one comprehensive document

**Tasks**:
1. Implement PDF bundle generation:
   - Professional cover page with customization
   - Table of contents with hyperlinks
   - Consistent headers/footers and page numbers
   - Section breaks between reports
2. Implement Excel workbook export:
   - Summary dashboard sheet
   - Each report as separate worksheet
   - Embedded charts
3. Create BundleBuilder UI:
   - Select reports to include
   - Configure time periods
   - Customize cover page
4. Add predefined bundle templates:
   - Weekly Check-In
   - Monthly Comprehensive
   - Quarterly Strategic
   - Carrier Review
   - Agency Meeting
5. Save generated reports to Supabase Storage
6. Create report history browser

**Deliverable**: Can export 3-5 reports as single professional document (PDF or Excel)

---

### **MVP CHECKPOINT** (End of Phase 3)
**Evaluation Criteria**:
- Reports provide 10x more value than before
- UI looks professional, not cookie-cutter
- Multi-report export works reliably
- Report generation <10 seconds
- User feedback: "significantly more useful"

**Decision**: If metrics good, proceed to Phase 4-7. If not, iterate on Phases 1-3.

---

### Phase 4: Interactive Features
**Duration**: 1-2 weeks
**Goal**: Make reports explorable, not just readable

**Tasks**:
1. Implement drill-down system:
   - Click metrics to see underlying data
   - Breadcrumb navigation
   - Linked reports (insight → detailed report)
2. Add interactive filters:
   - Real-time report updates
   - Progressive filtering
   - Save filtered views
3. Create segment comparison tool
4. Implement advanced table features:
   - Multi-column sort
   - Column reordering
   - Show/hide columns
   - Export table as CSV
5. Add inline actions and bulk operations

**Deliverable**: Reports are explorable with drill-down navigation

---

### Phase 5: Custom Report Builder
**Duration**: 2-3 weeks
**Goal**: Let users create custom reports via drag-and-drop

**Tasks**:
1. Build ReportBuilder interface:
   - Component library sidebar
   - Canvas drop zone
   - Configuration panel
2. Create draggable components:
   - Metric widgets (KPI cards, gauges, progress bars)
   - Chart components (line, bar, pie, scatter, heatmap)
   - Table components (data table, pivot, comparison)
   - Text components (headers, markdown blocks)
   - Layout components (sections, columns, tabs)
3. Implement component configuration:
   - Data source selection
   - Filter configuration
   - Styling options
4. Add template management:
   - Save custom reports
   - Clone existing reports
   - Template library
5. Implement smart suggestions

**Deliverable**: Users can build custom reports without code

---

### Phase 6: Scheduling & Automation
**Duration**: 1-2 weeks
**Goal**: Automate report generation and delivery

**Tasks**:
1. Create report_schedules table and management UI
2. Implement Supabase Edge Functions for background generation:
   - Daily summary email
   - Weekly report package
   - Monthly comprehensive
   - Quarterly strategic
3. Set up pg_cron for scheduled jobs
4. Implement email delivery:
   - Executive summary in email body
   - PDF/Excel attachment
   - Secure viewing link
5. Create report history and archive system
6. Add delivery notifications

**Deliverable**: Reports generate automatically on schedule

---

### Phase 7: Advanced Features
**Duration**: 1-2 weeks
**Goal**: Add annotations, action tracking, and advanced analytics

**Tasks**:
1. Implement annotation system:
   - Report-level notes
   - Section-level comments
   - Metric-level annotations
2. Create action item system:
   - Convert insights to tasks
   - Track completion
   - Action item dashboard
3. Enhance predictive analytics:
   - 12-month forecast with regression
   - Chargeback prediction
   - Client churn model
4. Add scenario analysis:
   - What-if calculator
   - Goal sensitivity analysis
5. Implement metric evolution tracking

**Deliverable**: Reports drive action and track outcomes

---

## Performance Optimization Strategy

### Database Layer
1. **Materialized Views**: Refresh nightly/hourly via pg_cron
2. **Indexes**: All foreign keys, filter columns, date ranges
3. **Query Optimization**: Use EXPLAIN ANALYZE on all complex queries
4. **Read Replica**: Consider for report queries (Supabase supports this)

### Application Layer
1. **TanStack Query Cache**:
   - staleTime: 5 minutes
   - cacheTime: 30 minutes
   - Prefetch common reports
2. **Report Generation Cache**:
   - Cache reports for 15 minutes
   - Key: hash(userId + reportType + filters)
3. **Incremental Loading**:
   - Load summary metrics first (fast)
   - Load sections progressively
   - Load charts last
   - Skeleton loaders for pending content
4. **Background Processing**:
   - Scheduled reports pre-computed
   - Export queue for large bundles

### Export Performance
1. **Streaming Export**: Don't load everything into memory
2. **Export Queue**: Complex bundles run in background
3. **Progress Indicators**: "Your report is being generated (2 min estimated)"

**Performance Targets**:
- Report generation: <5 seconds for 90% of reports
- Export generation: <30 seconds for bundles
- Page load: <2 seconds
- Materialized view refresh: <1 minute

---

## Risk Mitigation

### Risk 1: Performance Degradation
**Mitigation**:
- Materialized views + aggressive indexing
- Progressive loading (metrics first, charts later)
- Query optimization and monitoring
- Consider read replica for heavy reporting

### Risk 2: PDF/Excel Quality
**Mitigation**:
- Extensive testing of export layouts
- Template system for consistency
- Streaming for large exports
- Clear preview before export

### Risk 3: Data Accuracy
**Mitigation**:
- Single source of truth (database views)
- Comprehensive unit tests
- Manual verification against known datasets
- "Report an issue" button for users

### Risk 4: Feature Creep
**Mitigation**:
- Strict phased approach
- User feedback after each phase
- Analytics on feature usage
- Kill unused features

### Risk 5: Breaking Existing Reports
**Mitigation**:
- Backward compatibility
- Comprehensive testing
- Migration plan for saved configs
- Feature flags for gradual rollout

---

## Success Metrics

### Quantitative
- **Usage**: Reports generated per week (track increase)
- **Performance**: Report generation <5s, exports <30s
- **Engagement**: Time viewing reports, drill-down usage rate
- **Action Items**: Completion rate of recommended actions
- **Exports**: Frequency of multi-report bundle exports

### Qualitative
- User feedback: "significantly more useful than before"
- Reports professional enough to present to managers/agencies
- Insights leading to actual business decisions
- Reduced manual Excel analysis

### Success Criteria (End of Phase 3)
- ✅ 5+ report types provide genuinely new insights
- ✅ Reports look professional (not cookie-cutter)
- ✅ Multi-report export reliable
- ✅ Generation time <10 seconds
- ✅ User feedback positive
- ✅ 50% reduction in manual Excel reporting

---

## File Organization

All implementation files follow project structure:

```
/src/features/reports/        # All report components
/src/services/reports/        # Business logic services
/src/hooks/reports/          # TanStack Query hooks
/src/types/reports.types.ts  # TypeScript types
/supabase/migrations/        # Database migrations
/docs/reports/              # Technical documentation
```

**Documentation to Create**:
- `/docs/reports/report-catalog.md` - All available reports and their metrics
- `/docs/reports/calculation-methodology.md` - How each metric is calculated
- `/docs/reports/export-guide.md` - How to use export and bundles
- `/docs/reports/scheduling-guide.md` - How to set up scheduled reports

---

## Next Steps

1. **Review and Approve**: User reviews this plan and approves approach
2. **Phase 1 Kickoff**: Start with enhanced report content
3. **Incremental Delivery**: Deliver each phase for feedback
4. **MVP Checkpoint**: Evaluate after Phase 3 before proceeding

---

## Appendix: Example Report Comparisons

### Before (Current State)
```
┌─────────────────────────────────┐
│   Commission Performance        │
├─────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐        │
│ │ Total   │ │ Pending │        │
│ │ $15,000 │ │ $3,000  │        │
│ └─────────┘ └─────────┘        │
│                                 │
│ Table: Commission by Carrier    │
│ Carrier A | $8,000             │
│ Carrier B | $7,000             │
└─────────────────────────────────┘
```

### After (Enhanced)
```
┌─────────────────────────────────────────────────────────┐
│ Commission Performance Analysis                          │
│ Period: Nov 1-29, 2025                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ EXECUTIVE SUMMARY                                        │
│ Your commission performance shows strong growth (+25%    │
│ vs prior period) driven primarily by 3 large policies   │
│ from Carrier A. However, chargeback risk has increased  │
│ to $8,200 due to 5 policies with <2 months paid.        │
│                                                          │
│ COMMISSION BREAKDOWN                                     │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Gross Commission │  │  Net Commission  │            │
│  │    $18,500       │  │     $15,000      │            │
│  │    ↑ 25%        │  │     ↑ 22%       │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  [Waterfall Chart: $18.5K → -$2K splits → -$1.5K       │
│   advances → $15K net]                                  │
│                                                          │
│ COMMISSION AGING ANALYSIS                                │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Aging Bucket  │ Count │ At Risk │ Chargeback %  │    │
│ ├─────────────────────────────────────────────────┤    │
│ │ 0-3 months    │   8   │ $8,200  │   Critical    │    │
│ │ 3-6 months    │  12   │ $4,500  │   Medium      │    │
│ │ 6-9 months    │  15   │ $2,100  │   Low         │    │
│ │ 9-12 months   │  18   │   $900  │   Very Low    │    │
│ │ 12+ months    │  42   │    $0   │   Secure      │    │
│ └─────────────────────────────────────────────────┘    │
│                                                          │
│ CARRIER PROFITABILITY (Commission - Chargeback Risk)    │
│ [Bubble Chart: X=persistency, Y=comm rate, size=premium]│
│                                                          │
│ 📊 Carrier A: $8,000 gross, 92% persistency, LOW RISK  │
│ 📊 Carrier B: $7,000 gross, 78% persistency, MED RISK  │
│ 📊 Carrier C: $3,500 gross, 65% persistency, HIGH RISK │
│                                                          │
│ 🎯 TOP INSIGHTS                                         │
│                                                          │
│ ⚠️ CRITICAL: 8 policies with <3 months paid ($8.2K risk)│
│    → Recommended Action: Contact these 8 clients this   │
│      week to verify payment continuity                  │
│    → Policy #12345 (John Smith) - highest risk ($2.5K) │
│                                                          │
│ 💡 OPPORTUNITY: Carrier A has 92% persistency          │
│    → Focus new business on Carrier A products          │
│    → Potential to increase net commission 15%          │
│                                                          │
│ 📈 TREND: Commission velocity improving                │
│    → Avg days to payment: 32 (down from 45 last month) │
│    → Carrier A fastest: 21 days, Carrier C slowest: 48 │
└─────────────────────────────────────────────────────────┘
```

**Difference**:
- Before: Basic metrics in cards
- After: Executive summary, detailed breakdown, risk analysis, specific insights with actions, visual hierarchy, professional layout

---

**END OF PLAN**
