# Targets Page Implementation Plan

## Executive Summary
Implement a Targets page for tracking and visualizing personal/business goals using existing database infrastructure with minimal modifications. The page will maintain consistency with Dashboard and Analytics pages while providing meaningful target tracking and progress visualization.

## Current State Analysis

### Database Infrastructure
- **Constants table exists** with:
  - `target1` (100000) - First Target Amount
  - `target2` (200000) - Second Target Amount
  - `avgAP` - Average Annual Premium target
  - Additional fields: `monthly_breakeven`, `annual_income_goal`, `monthly_surplus_goal`

- **No dedicated targets table** currently exists
- User settings stored via auth.users metadata
- All data fetched from Supabase (no local storage)

### UI/UX Patterns
- Dashboard uses: page-header, page-content structure
- Grid layouts: `grid-cols-[280px_1fr_320px]` for 3-column layouts
- Card-based components with consistent styling
- Time period selectors (MTD, QTD, YTD, custom ranges)
- Export functionality (CSV, PDF)

### Route Status
- `/targets` route exists but shows "coming soon"
- Sidebar link already active with Target icon

## Three Implementation Approaches

### Approach 1: Simple Targets (RECOMMENDED)
**Use existing infrastructure with minimal changes**

**Database Changes:**
- Use existing constants table (target1, target2, avgAP)
- Add user_settings table for personalized targets
- Store milestone achievements in JSON metadata

**Features:**
- Annual income targets with progress visualization
- Monthly/quarterly breakdowns
- Pace calculations (policies needed per day/week/month)
- Achievement badges for milestones
- Simple card-based layout matching dashboard

**Pros:**
- Minimal database changes
- Quick implementation
- Maintains consistency
- Uses proven patterns

**Cons:**
- Limited flexibility
- Fixed target types

### Approach 2: Comprehensive Targets
**Create dedicated targets system**

**Database Changes:**
```sql
CREATE TABLE targets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  target_type TEXT, -- income, policies, persistency, expenses
  period TEXT, -- monthly, quarterly, annual
  value NUMERIC,
  start_date DATE,
  end_date DATE,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Features:**
- Multiple target types with categories
- Historical tracking and versioning
- Trend analysis and forecasting
- Variance reporting
- Custom target creation

**Pros:**
- Maximum flexibility
- Professional grade tracking
- Historical analysis

**Cons:**
- Complex implementation
- New database schema
- More testing required

### Approach 3: Milestone-Based Targets
**Gamification approach with achievements**

**Database Changes:**
- Extend constants table with JSON milestones field
- Track achievements in user metadata

**Features:**
- Achievement levels (bronze/silver/gold)
- Progress rings and streak tracking
- Challenge system
- Notification system for milestones
- Achievement timeline

**Pros:**
- Motivational design
- Engaging UI
- Uses existing tables

**Cons:**
- May feel less professional
- Complex achievement logic

## Recommended Implementation Plan (Approach 1 Enhanced)

### Phase 1: Database Setup (Day 1)

#### Migration File: `20251031_001_add_user_targets.sql`
```sql
-- Add user-specific targets table
CREATE TABLE IF NOT EXISTS user_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Income targets
  annual_income_target NUMERIC DEFAULT 120000,
  monthly_income_target NUMERIC DEFAULT 10000,
  quarterly_income_target NUMERIC DEFAULT 30000,

  -- Policy targets
  annual_policies_target INTEGER DEFAULT 100,
  monthly_policies_target INTEGER DEFAULT 9,
  avg_premium_target NUMERIC DEFAULT 1500,

  -- Persistency targets
  persistency_13_month_target NUMERIC DEFAULT 0.85,
  persistency_25_month_target NUMERIC DEFAULT 0.75,

  -- Expense targets
  monthly_expense_target NUMERIC DEFAULT 5000,
  expense_ratio_target NUMERIC DEFAULT 0.30,

  -- Milestone tracking
  achievements JSONB DEFAULT '[]'::jsonb,
  last_milestone_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE user_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own targets" ON user_targets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own targets" ON user_targets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own targets" ON user_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_targets_user_id ON user_targets(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_targets_updated_at
  BEFORE UPDATE ON user_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Type Definitions (Day 1)

#### `/src/types/targets.types.ts`
```typescript
export interface UserTargets {
  id: string;
  userId: string;

  // Income targets
  annualIncomeTarget: number;
  monthlyIncomeTarget: number;
  quarterlyIncomeTarget: number;

  // Policy targets
  annualPoliciesTarget: number;
  monthlyPoliciesTarget: number;
  avgPremiumTarget: number;

  // Persistency targets
  persistency13MonthTarget: number;
  persistency25MonthTarget: number;

  // Expense targets
  monthlyExpenseTarget: number;
  expenseRatioTarget: number;

  // Milestones
  achievements: Achievement[];
  lastMilestoneDate: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  type: 'income' | 'policies' | 'persistency' | 'streak';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  name: string;
  description: string;
  earnedDate: Date;
  value: number;
}

export interface TargetProgress {
  target: number;
  actual: number;
  percentage: number;
  remaining: number;
  pace: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  status: 'ahead' | 'on-track' | 'behind' | 'critical';
  projectedEnd: number;
}
```

### Phase 3: Service Layer (Day 2)

#### `/src/services/targets/targetsService.ts`
```typescript
// Service for managing user targets
export const targetsService = {
  async getUserTargets(userId: string),
  async updateUserTargets(userId: string, updates: Partial<UserTargets>),
  async calculateProgress(targets: UserTargets, actuals: ActualMetrics),
  async checkMilestones(userId: string, progress: TargetProgress[]),
  async getAchievements(userId: string),
};
```

### Phase 4: React Hooks (Day 2)

#### `/src/hooks/targets/useTargets.ts`
```typescript
export function useTargets() {
  // Fetch and manage user targets
}

export function useTargetProgress(timePeriod: TimePeriod) {
  // Calculate progress for all targets
}

export function useAchievements() {
  // Fetch and track achievements
}
```

### Phase 5: UI Components (Days 3-4)

#### Component Structure
```
/src/features/targets/
├── TargetsPage.tsx              # Main page component
├── components/
│   ├── TargetHeader.tsx         # Page header with period selector
│   ├── TargetOverview.tsx       # High-level summary cards
│   ├── IncomeTargets.tsx        # Income target section
│   ├── PolicyTargets.tsx        # Policy target section
│   ├── PersistencyTargets.tsx   # Persistency target section
│   ├── ExpenseTargets.tsx       # Expense target section
│   ├── TargetCard.tsx           # Individual target card
│   ├── ProgressBar.tsx          # Progress visualization
│   ├── PaceIndicator.tsx        # Pace calculation display
│   ├── AchievementBadge.tsx     # Achievement display
│   └── EditTargetDialog.tsx     # Target editing modal
```

#### Main Page Layout
```typescript
export function TargetsPage() {
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">Targets</h1>
            <p className="page-subtitle">
              Track progress towards your goals and milestones
            </p>
          </div>
          <TimePeriodSelector />
        </div>
      </div>

      <div className="page-content">
        {/* Overview Cards - 4 column grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <OverviewCard title="YTD Income" progress={ytdIncomeProgress} />
          <OverviewCard title="MTD Policies" progress={mtdPolicyProgress} />
          <OverviewCard title="Persistency" progress={persistencyProgress} />
          <OverviewCard title="Expense Ratio" progress={expenseProgress} />
        </div>

        {/* Detailed Target Sections - 2 column layout */}
        <div className="grid grid-cols-2 gap-6">
          <IncomeTargets />
          <PolicyTargets />
          <PersistencyTargets />
          <ExpenseTargets />
        </div>

        {/* Achievements Section */}
        <AchievementsPanel />
      </div>
    </>
  );
}
```

### Phase 6: Integration (Day 5)

1. **Update router.tsx**
   - Replace "coming soon" with TargetsPage component
   - Add route loader for initial data

2. **Add to navigation**
   - Ensure sidebar link is active
   - Add to quick navigation if needed

3. **Connect to existing systems**
   - Use existing metrics calculations
   - Integrate with time period selectors
   - Connect to export functionality

### Phase 7: Testing (Day 5)

#### Test Coverage Required
- [ ] Database migrations run successfully
- [ ] RLS policies work correctly
- [ ] Target CRUD operations
- [ ] Progress calculations accurate
- [ ] Achievement triggers work
- [ ] Time period filtering
- [ ] Export functionality
- [ ] Responsive design
- [ ] Performance with large datasets

## UI/UX Design Specifications

### Color Scheme (matching existing)
- Success: green-500 (ahead of target)
- Warning: yellow-500 (slightly behind)
- Error: red-500 (critical)
- Neutral: gray-500 (no target set)

### Component Styling
```css
/* Consistent with dashboard */
.target-card {
  @apply bg-card rounded-lg shadow-sm border border-border p-4;
}

.progress-bar {
  @apply h-2 bg-muted rounded-full overflow-hidden;
}

.achievement-badge {
  @apply inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium;
}
```

### Progress Indicators
- Linear progress bars for most metrics
- Circular progress for overview cards
- Color-coded based on performance
- Animated transitions on updates

## Performance Considerations

1. **Data Fetching**
   - Use React Query for caching
   - Implement proper invalidation
   - Batch related queries

2. **Calculations**
   - Memoize expensive calculations
   - Use web workers for heavy processing
   - Progressive loading for achievements

3. **Real-time Updates**
   - Subscribe to relevant table changes
   - Optimistic UI updates
   - Debounce target edits

## Migration Strategy

1. **Day 1**: Database setup and types
2. **Day 2**: Services and hooks
3. **Days 3-4**: UI components
4. **Day 5**: Integration and testing
5. **Day 6**: Review and deployment

## Risk Mitigation

- **Database migration failures**: Test locally first, have rollback ready
- **Performance issues**: Implement pagination, use indexes
- **UI inconsistencies**: Use existing components, follow style guide
- **Data accuracy**: Comprehensive testing, validation layers

## Success Metrics

- Page loads in < 500ms
- All calculations accurate to 2 decimal places
- Responsive on all screen sizes
- No console errors in production
- 100% test coverage for calculations

## Future Enhancements

1. **Phase 2** (Month 2)
   - Email notifications for milestone achievements
   - Target comparison with previous periods
   - Team/group targets (if multi-user)

2. **Phase 3** (Month 3)
   - AI-powered target recommendations
   - Predictive analytics for target achievement
   - Integration with external goal-tracking tools

## Development Checklist

- [ ] Create migration file
- [ ] Update database.types.ts
- [ ] Create service layer
- [ ] Implement React hooks
- [ ] Build UI components
- [ ] Update router
- [ ] Add tests
- [ ] Update documentation
- [ ] Code review
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

## Notes

- All data must come from Supabase (no local storage)
- Follow existing patterns from Dashboard and Analytics pages
- Maintain responsive design
- Use existing utility functions where possible
- Keep components small and focused
- Test with real data volumes