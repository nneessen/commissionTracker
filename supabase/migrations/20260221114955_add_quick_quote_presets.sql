-- Migration: Add user_quick_quote_presets table
-- Stores per-user configurable preset amount tuples for Quick Quote

-- =============================================================================
-- Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_quick_quote_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coverage_presets jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_presets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uqp_user_unique UNIQUE (user_id),
  CONSTRAINT uqp_coverage_max_5 CHECK (jsonb_array_length(coverage_presets) <= 5),
  CONSTRAINT uqp_budget_max_5 CHECK (jsonb_array_length(budget_presets) <= 5)
);

-- Index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_quick_quote_presets_user_id
  ON public.user_quick_quote_presets(user_id);

-- =============================================================================
-- Updated_at trigger (reuse existing pattern)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_user_quick_quote_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_quick_quote_presets_updated_at
  BEFORE UPDATE ON public.user_quick_quote_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_quick_quote_presets_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.user_quick_quote_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presets"
  ON public.user_quick_quote_presets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets"
  ON public.user_quick_quote_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON public.user_quick_quote_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON public.user_quick_quote_presets
  FOR DELETE
  USING (auth.uid() = user_id);
