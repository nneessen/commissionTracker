-- Fix Email System RLS Policies - use roles array instead of role column
-- Corrects the RLS policies for email_templates, email_triggers, and email_queue

-- ============================================================================
-- 1. FIX EMAIL_TEMPLATES RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Drop existing broken policy if exists
  DROP POLICY IF EXISTS "Admins can manage templates" ON email_templates;

  -- Create corrected policy using roles array
  CREATE POLICY "Admins can manage templates" ON email_templates
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM user_profiles
        WHERE user_id = auth.uid()
        AND roles && ARRAY['admin', 'trainer', 'contracting_manager']
      )
    );
END $$;

-- ============================================================================
-- 2. FIX EMAIL_TRIGGERS RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Drop existing broken policy if exists
  DROP POLICY IF EXISTS "Admins can manage triggers" ON email_triggers;

  -- Create corrected policy using roles array
  CREATE POLICY "Admins can manage triggers" ON email_triggers
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM user_profiles
        WHERE user_id = auth.uid()
        AND roles && ARRAY['admin', 'trainer', 'contracting_manager']
      )
    );
END $$;

-- ============================================================================
-- 3. FIX EMAIL_QUEUE RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Drop existing broken policy if exists
  DROP POLICY IF EXISTS "Admins can view all queue items" ON email_queue;

  -- Create corrected policy using roles array
  CREATE POLICY "Admins can view all queue items" ON email_queue
    FOR SELECT USING (
      auth.uid() IN (
        SELECT user_id FROM user_profiles
        WHERE user_id = auth.uid()
        AND roles && ARRAY['admin']
      )
    );
END $$;
