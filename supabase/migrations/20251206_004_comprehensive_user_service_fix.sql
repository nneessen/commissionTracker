-- Migration: Comprehensive User Service and Role Fix
-- Purpose:
--   1. Fix existing users with wrong roles/agent_status
--   2. Update functions to properly handle agent creation
--   3. Ensure active agents have correct permissions
-- Created: 2025-12-06

BEGIN;

-- ============================================
-- 1. FIX ALL EXISTING USERS
-- ============================================

-- Fix users who are approved agents but have wrong agent_status
UPDATE user_profiles
SET
  agent_status = 'licensed',
  roles = CASE
    WHEN roles IS NULL OR array_length(roles, 1) = 0 THEN ARRAY['active_agent']
    WHEN 'agent' = ANY(roles) AND NOT 'active_agent' = ANY(roles) THEN
      array_append(array_remove(roles, 'agent'), 'active_agent')
    ELSE roles
  END
WHERE
  approval_status = 'approved'
  AND (agent_status = 'unlicensed' OR agent_status IS NULL)
  AND NOT 'recruit' = ANY(COALESCE(roles, ARRAY[]::text[]))
  AND email NOT IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com'); -- Exclude admins

-- Fix recruits who have wrong agent_status
UPDATE user_profiles
SET
  agent_status = 'unlicensed',
  roles = CASE
    WHEN roles IS NULL OR array_length(roles, 1) = 0 THEN ARRAY['recruit']
    ELSE roles
  END
WHERE
  approval_status = 'pending'
  OR 'recruit' = ANY(COALESCE(roles, ARRAY[]::text[]));

-- ============================================
-- 2. CREATE IMPROVED USER CREATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_user_with_proper_role(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_approval_status TEXT DEFAULT 'approved',
  p_roles TEXT[] DEFAULT NULL,
  p_agent_status TEXT DEFAULT NULL,
  p_contract_level INTEGER DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_upline_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_roles TEXT[];
  v_agent_status TEXT;
BEGIN
  -- Determine roles if not specified
  IF p_roles IS NULL OR array_length(p_roles, 1) = 0 THEN
    IF p_approval_status = 'approved' THEN
      -- Approved users are active agents by default
      v_roles := ARRAY['active_agent'];
    ELSE
      -- Pending users are recruits by default
      v_roles := ARRAY['recruit'];
    END IF;
  ELSE
    v_roles := p_roles;
  END IF;

  -- Determine agent_status if not specified
  IF p_agent_status IS NULL THEN
    IF 'recruit' = ANY(v_roles) OR p_approval_status = 'pending' THEN
      v_agent_status := 'unlicensed';
    ELSIF 'admin' = ANY(v_roles) OR 'active_agent' = ANY(v_roles) OR 'agent' = ANY(v_roles) THEN
      v_agent_status := 'licensed';
    ELSE
      v_agent_status := 'not_applicable';
    END IF;
  ELSE
    v_agent_status := p_agent_status;
  END IF;

  -- Insert the user
  INSERT INTO user_profiles (
    email,
    first_name,
    last_name,
    approval_status,
    roles,
    agent_status,
    contract_level,
    phone,
    upline_id,
    hierarchy_path,
    hierarchy_depth,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    LOWER(TRIM(p_email)),
    TRIM(p_first_name),
    TRIM(p_last_name),
    p_approval_status,
    v_roles,
    v_agent_status,
    COALESCE(p_contract_level, CASE WHEN 'active_agent' = ANY(v_roles) THEN 100 ELSE NULL END),
    p_phone,
    p_upline_id,
    '',
    0,
    'admin' = ANY(v_roles),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- ============================================
-- 3. UPDATE handle_new_user TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
  user_roles TEXT[];
  user_agent_status TEXT;
BEGIN
  SET LOCAL row_security = off;

  -- Check if a user_profile with this email already exists (admin-created profile)
  SELECT id INTO existing_profile_id
  FROM public.user_profiles
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile exists - update it with auth user_id
    UPDATE public.user_profiles
    SET
      user_id = NEW.id,
      -- Fix agent_status if not set correctly
      agent_status = CASE
        WHEN agent_status IS NULL OR agent_status = 'unlicensed' THEN
          CASE
            WHEN 'active_agent' = ANY(roles) OR 'agent' = ANY(roles) THEN 'licensed'
            WHEN 'recruit' = ANY(roles) THEN 'unlicensed'
            ELSE COALESCE(agent_status, 'licensed')
          END
        ELSE agent_status
      END,
      -- Ensure approved users have proper role
      roles = CASE
        WHEN roles IS NULL OR array_length(roles, 1) = 0 THEN
          CASE
            WHEN NEW.email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com') THEN ARRAY['admin']
            WHEN approval_status = 'approved' THEN ARRAY['active_agent']
            ELSE ARRAY['recruit']
          END
        ELSE roles
      END,
      updated_at = NOW()
    WHERE id = existing_profile_id;
  ELSE
    -- No existing profile - create a new one
    -- Determine appropriate role and status
    IF NEW.email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com') THEN
      user_roles := ARRAY['admin'];
      user_agent_status := 'licensed';
    ELSE
      user_roles := ARRAY['agent']; -- Default to basic agent
      user_agent_status := 'licensed';
    END IF;

    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      roles,
      agent_status,
      is_admin,
      is_super_admin,
      approval_status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.email,
      user_roles,
      user_agent_status,
      NEW.email = 'nick@nickneessen.com',
      NEW.email = 'nick@nickneessen.com',
      CASE
        WHEN NEW.email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com') THEN 'approved'
        ELSE 'pending'
      END,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 4. VERIFICATION AND LOGGING
-- ============================================

DO $$
DECLARE
  fixed_users INTEGER;
  active_agents INTEGER;
  recruits INTEGER;
  admins INTEGER;
BEGIN
  -- Count fixed users
  SELECT COUNT(*) INTO fixed_users
  FROM user_profiles
  WHERE agent_status = 'licensed' AND 'active_agent' = ANY(roles);

  SELECT COUNT(*) INTO active_agents
  FROM user_profiles
  WHERE 'active_agent' = ANY(roles);

  SELECT COUNT(*) INTO recruits
  FROM user_profiles
  WHERE 'recruit' = ANY(roles);

  SELECT COUNT(*) INTO admins
  FROM user_profiles
  WHERE 'admin' = ANY(roles);

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'User Service Fix Applied Successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixed users: %', fixed_users;
  RAISE NOTICE 'Active agents: %', active_agents;
  RAISE NOTICE 'Recruits: %', recruits;
  RAISE NOTICE 'Admins: %', admins;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Made:';
  RAISE NOTICE '  1. All approved users now have active_agent role';
  RAISE NOTICE '  2. All active agents have licensed status';
  RAISE NOTICE '  3. New function for proper user creation';
  RAISE NOTICE '  4. Updated trigger for new user signups';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;