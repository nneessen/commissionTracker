-- Migration: Add extended user profile fields
-- Description: Adds missing fields to user_profiles table for complete user data collection
-- Author: System
-- Date: 2025-11-28

-- Add missing required fields for user profiles
ALTER TABLE user_profiles
  -- Date of birth (required for compliance)
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,

  -- Address fields (required for 1099 forms)
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state VARCHAR(2),
  ADD COLUMN IF NOT EXISTS zip VARCHAR(10),

  -- Professional/Licensing fields (required)
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS npn TEXT,
  ADD COLUMN IF NOT EXISTS resident_state VARCHAR(2),
  ADD COLUMN IF NOT EXISTS non_resident_states TEXT[],
  ADD COLUMN IF NOT EXISTS license_expiration DATE,

  -- Contract information
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,

  -- Errors & Omissions Insurance
  ADD COLUMN IF NOT EXISTS eo_insurance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eo_expiration DATE,

  -- Banking/Tax information
  ADD COLUMN IF NOT EXISTS ssn_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS routing_number VARCHAR(9),

  -- Social/Marketing handles (already have linkedin_url, instagram_url)
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
  ADD COLUMN IF NOT EXISTS personal_website TEXT,

  -- System tracking
  ADD COLUMN IF NOT EXISTS invited_by TEXT,
  ADD COLUMN IF NOT EXISTS invitation_code TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add foreign key constraint for invited_by
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_state ON user_profiles(state);
CREATE INDEX IF NOT EXISTS idx_user_profiles_resident_state ON user_profiles(resident_state);
CREATE INDEX IF NOT EXISTS idx_user_profiles_contract_level ON user_profiles(contract_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_invited_by ON user_profiles(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_status ON user_profiles(onboarding_status);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.date_of_birth IS 'Required for compliance and background checks';
COMMENT ON COLUMN user_profiles.street_address IS 'Street address for 1099 forms';
COMMENT ON COLUMN user_profiles.city IS 'City for 1099 forms';
COMMENT ON COLUMN user_profiles.state IS '2-letter state code for 1099 forms';
COMMENT ON COLUMN user_profiles.zip IS 'ZIP code for 1099 forms';
COMMENT ON COLUMN user_profiles.license_number IS 'State insurance license number';
COMMENT ON COLUMN user_profiles.npn IS 'National Producer Number';
COMMENT ON COLUMN user_profiles.resident_state IS 'Primary licensed state (2-letter code)';
COMMENT ON COLUMN user_profiles.non_resident_states IS 'Additional state licenses';
COMMENT ON COLUMN user_profiles.license_expiration IS 'Insurance license expiration date';
COMMENT ON COLUMN user_profiles.contract_start_date IS 'Date agent contract started';
COMMENT ON COLUMN user_profiles.eo_insurance IS 'Has Errors & Omissions insurance';
COMMENT ON COLUMN user_profiles.eo_expiration IS 'E&O insurance expiration date';
COMMENT ON COLUMN user_profiles.ssn_last4 IS 'Last 4 digits of SSN for 1099';
COMMENT ON COLUMN user_profiles.tax_id IS 'EIN if business entity';
COMMENT ON COLUMN user_profiles.bank_account_last4 IS 'Last 4 digits of bank account for direct deposit';
COMMENT ON COLUMN user_profiles.routing_number IS 'Bank routing number for direct deposit';
COMMENT ON COLUMN user_profiles.facebook_handle IS 'Facebook username/handle';
COMMENT ON COLUMN user_profiles.personal_website IS 'Personal or business website URL';
COMMENT ON COLUMN user_profiles.invited_by IS 'User ID of the person who invited this user';
COMMENT ON COLUMN user_profiles.invitation_code IS 'Unique invitation code used during signup';
COMMENT ON COLUMN user_profiles.last_login IS 'Timestamp of last successful login';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Has completed full onboarding process';
