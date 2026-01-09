-- supabase/migrations/20260109_007_underwriting_sessions_rls.sql
-- RLS policies for underwriting_sessions table

-- Enable RLS if not already enabled
ALTER TABLE underwriting_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert sessions for their own IMO
CREATE POLICY "Users can insert sessions for their IMO"
ON underwriting_sessions FOR INSERT
TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can view sessions from their own IMO
CREATE POLICY "Users can view sessions from their IMO"
ON underwriting_sessions FOR SELECT
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can update sessions from their own IMO
CREATE POLICY "Users can update sessions from their IMO"
ON underwriting_sessions FOR UPDATE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can delete sessions from their own IMO
CREATE POLICY "Users can delete sessions from their IMO"
ON underwriting_sessions FOR DELETE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);
