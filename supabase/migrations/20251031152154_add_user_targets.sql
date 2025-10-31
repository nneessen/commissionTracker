-- supabase/migrations/20251031152154_add_user_targets.sql
-- Migration: Add user_targets table for personal goal tracking
-- Purpose: Store user-specific income, policy, persistency, and expense targets

-- Create user_targets table
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user
  CONSTRAINT user_targets_user_id_unique UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE user_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own targets
CREATE POLICY "Users can view own targets" ON user_targets
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own targets
CREATE POLICY "Users can update own targets" ON user_targets
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own targets
CREATE POLICY "Users can insert own targets" ON user_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own targets
CREATE POLICY "Users can delete own targets" ON user_targets
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_targets_user_id ON user_targets(user_id);

-- Create or update trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_user_targets_updated_at
  BEFORE UPDATE ON user_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_targets_updated_at();

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'User Targets Migration Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Table created: user_targets';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '   Income targets (annual, monthly, quarterly)';
  RAISE NOTICE '   Policy targets (annual, monthly, avg premium)';
  RAISE NOTICE '   Persistency targets (13-month, 25-month)';
  RAISE NOTICE '   Expense targets (monthly budget, expense ratio)';
  RAISE NOTICE '   Achievement tracking (JSONB)';
  RAISE NOTICE '   Row Level Security enabled';
  RAISE NOTICE '   Auto-update timestamps';
  RAISE NOTICE '===========================================';
END $$;
