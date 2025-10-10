-- Add referral_source column to policies table
-- This tracks how the client found the agent (word of mouth, online, etc.)

ALTER TABLE policies
ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);

-- Add comment to document the column
COMMENT ON COLUMN policies.referral_source IS 'Source of client referral (e.g., word of mouth, online search, existing client referral, marketing campaign)';

-- Create index for performance when filtering by referral source
CREATE INDEX IF NOT EXISTS idx_policies_referral_source ON policies(referral_source);
