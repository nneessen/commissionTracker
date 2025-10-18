-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251018175655_add_submit_date_to_policies.sql

-- Add submit_date column to policies table
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS submit_date date;

-- Set default value for existing records to be the same as effective_date
UPDATE public.policies
SET submit_date = effective_date
WHERE submit_date IS NULL;

-- Comment on the new column
COMMENT ON COLUMN public.policies.submit_date IS 'Date when the policy application was submitted';