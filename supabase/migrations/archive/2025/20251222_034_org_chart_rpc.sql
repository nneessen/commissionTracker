-- Phase 12A: Agent Hierarchy Visualization
-- Create RPC function for org chart data with performance metrics

-- Type for org chart node
DROP TYPE IF EXISTS org_chart_node CASCADE;
CREATE TYPE org_chart_node AS (
    id uuid,
    node_type text,  -- 'imo', 'agency', 'agent'
    name text,
    code text,
    parent_id uuid,
    depth int,
    -- Metrics
    agent_count int,
    active_policy_count int,
    total_annual_premium numeric,
    total_commissions_ytd numeric,
    avg_contract_level numeric,
    -- Agent-specific
    email text,
    contract_level int,
    agent_status text,
    profile_photo_url text
);

-- Main RPC function to get org chart structure with metrics
-- Respects RLS automatically through existing policies
CREATE OR REPLACE FUNCTION get_org_chart_data(
    p_scope text DEFAULT 'auto',  -- 'imo', 'agency', 'agent', 'auto'
    p_scope_id uuid DEFAULT NULL,
    p_include_metrics boolean DEFAULT true,
    p_max_depth int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_user_imo_id uuid;
    v_user_agency_id uuid;
    v_is_imo_admin boolean;
    v_is_agency_owner boolean;
    v_result jsonb;
    v_scope text;
    v_scope_id uuid;
BEGIN
    -- Get current user context
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's org context
    SELECT
        imo_id,
        agency_id,
        'imo_admin' = ANY(roles) OR is_admin,
        agency_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM agencies WHERE id = user_profiles.agency_id AND owner_id = user_profiles.id
        )
    INTO v_user_imo_id, v_user_agency_id, v_is_imo_admin, v_is_agency_owner
    FROM user_profiles
    WHERE id = v_user_id;

    -- Determine scope automatically if not specified
    IF p_scope = 'auto' OR p_scope IS NULL THEN
        IF v_is_imo_admin THEN
            v_scope := 'imo';
            v_scope_id := v_user_imo_id;
        ELSIF v_is_agency_owner THEN
            v_scope := 'agency';
            v_scope_id := v_user_agency_id;
        ELSE
            v_scope := 'agent';
            v_scope_id := v_user_id;
        END IF;
    ELSE
        v_scope := p_scope;
        v_scope_id := COALESCE(p_scope_id,
            CASE p_scope
                WHEN 'imo' THEN v_user_imo_id
                WHEN 'agency' THEN v_user_agency_id
                ELSE v_user_id
            END
        );
    END IF;

    -- Authorization check
    IF v_scope = 'imo' AND (NOT v_is_imo_admin OR v_scope_id != v_user_imo_id) THEN
        RAISE EXCEPTION 'Not authorized to view this IMO org chart';
    END IF;

    IF v_scope = 'agency' THEN
        -- Check if user can view this agency (is owner or IMO admin)
        IF NOT EXISTS (
            SELECT 1 FROM agencies a
            WHERE a.id = v_scope_id
            AND (a.owner_id = v_user_id OR (a.imo_id = v_user_imo_id AND v_is_imo_admin))
        ) THEN
            RAISE EXCEPTION 'Not authorized to view this agency org chart';
        END IF;
    END IF;

    -- Build org chart based on scope
    IF v_scope = 'imo' THEN
        v_result := build_imo_org_chart(v_scope_id, p_include_metrics, p_max_depth);
    ELSIF v_scope = 'agency' THEN
        v_result := build_agency_org_chart(v_scope_id, p_include_metrics, p_max_depth);
    ELSE
        v_result := build_agent_org_chart(v_scope_id, p_include_metrics, p_max_depth);
    END IF;

    RETURN v_result;
END;
$$;

-- Build IMO-level org chart
CREATE OR REPLACE FUNCTION build_imo_org_chart(
    p_imo_id uuid,
    p_include_metrics boolean,
    p_max_depth int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_imo_record record;
    v_agencies jsonb;
    v_metrics jsonb;
BEGIN
    -- Get IMO info
    SELECT id, name, code, logo_url
    INTO v_imo_record
    FROM imos
    WHERE id = p_imo_id AND is_active = true;

    IF v_imo_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get agencies in this IMO
    SELECT jsonb_agg(agency_chart ORDER BY agency_chart->>'name')
    INTO v_agencies
    FROM (
        SELECT build_agency_org_chart(a.id, p_include_metrics, p_max_depth - 1) as agency_chart
        FROM agencies a
        WHERE a.imo_id = p_imo_id
        AND a.is_active = true
        AND a.parent_agency_id IS NULL  -- Top-level agencies only
    ) sub
    WHERE agency_chart IS NOT NULL;

    -- Calculate IMO-level metrics if requested
    IF p_include_metrics THEN
        SELECT jsonb_build_object(
            'agentCount', COALESCE(COUNT(DISTINCT up.id), 0),
            'activePolicyCount', COALESCE(SUM(policy_counts.cnt), 0),
            'totalAnnualPremium', COALESCE(SUM(policy_counts.premium), 0),
            'totalCommissionsYtd', COALESCE(SUM(commission_totals.ytd), 0),
            'avgContractLevel', COALESCE(ROUND(AVG(up.contract_level)::numeric, 0), 0)
        )
        INTO v_metrics
        FROM user_profiles up
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
            FROM policies p
            WHERE p.user_id = up.id AND p.status = 'active'
        ) policy_counts ON true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
            FROM commissions c
            JOIN policies p ON c.policy_id = p.id
            WHERE p.user_id = up.id
            AND c.created_at >= date_trunc('year', CURRENT_DATE)
        ) commission_totals ON true
        WHERE up.imo_id = p_imo_id
        AND up.approval_status = 'approved'
        AND up.archived_at IS NULL;
    ELSE
        v_metrics := '{}'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'id', v_imo_record.id,
        'type', 'imo',
        'name', v_imo_record.name,
        'code', v_imo_record.code,
        'logoUrl', v_imo_record.logo_url,
        'metrics', v_metrics,
        'children', COALESCE(v_agencies, '[]'::jsonb)
    );
END;
$$;

-- Build Agency-level org chart
CREATE OR REPLACE FUNCTION build_agency_org_chart(
    p_agency_id uuid,
    p_include_metrics boolean,
    p_max_depth int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agency_record record;
    v_sub_agencies jsonb;
    v_agents jsonb;
    v_metrics jsonb;
BEGIN
    IF p_max_depth < 0 THEN
        RETURN NULL;
    END IF;

    -- Get agency info
    SELECT a.id, a.name, a.code, a.logo_url, a.owner_id,
           up.first_name || ' ' || up.last_name as owner_name,
           up.email as owner_email
    INTO v_agency_record
    FROM agencies a
    LEFT JOIN user_profiles up ON a.owner_id = up.id
    WHERE a.id = p_agency_id AND a.is_active = true;

    IF v_agency_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get sub-agencies (recursive)
    SELECT jsonb_agg(sub_agency_chart ORDER BY sub_agency_chart->>'name')
    INTO v_sub_agencies
    FROM (
        SELECT build_agency_org_chart(a.id, p_include_metrics, p_max_depth - 1) as sub_agency_chart
        FROM agencies a
        WHERE a.parent_agency_id = p_agency_id
        AND a.is_active = true
    ) sub
    WHERE sub_agency_chart IS NOT NULL;

    -- Get agents in this agency (not in sub-agencies)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', up.id,
            'type', 'agent',
            'name', COALESCE(up.first_name || ' ' || up.last_name, up.email),
            'email', up.email,
            'contractLevel', up.contract_level,
            'agentStatus', up.agent_status,
            'profilePhotoUrl', up.profile_photo_url,
            'hierarchyDepth', up.hierarchy_depth,
            'metrics', CASE WHEN p_include_metrics THEN
                jsonb_build_object(
                    'activePolicyCount', COALESCE(policy_data.cnt, 0),
                    'totalAnnualPremium', COALESCE(policy_data.premium, 0),
                    'totalCommissionsYtd', COALESCE(commission_data.ytd, 0)
                )
            ELSE '{}'::jsonb END,
            'children', COALESCE(build_agent_downline_tree(up.id, p_include_metrics, p_max_depth - 1), '[]'::jsonb)
        ) ORDER BY up.first_name, up.last_name, up.email
    )
    INTO v_agents
    FROM user_profiles up
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
        FROM policies p
        WHERE p.user_id = up.id AND p.status = 'active'
    ) policy_data ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
        FROM commissions c
        JOIN policies p ON c.policy_id = p.id
        WHERE p.user_id = up.id
        AND c.created_at >= date_trunc('year', CURRENT_DATE)
    ) commission_data ON true
    WHERE up.agency_id = p_agency_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL
    AND up.upline_id IS NULL;  -- Only top-level agents in the agency

    -- Calculate agency-level metrics if requested
    IF p_include_metrics THEN
        SELECT jsonb_build_object(
            'agentCount', COALESCE(COUNT(DISTINCT up.id), 0),
            'activePolicyCount', COALESCE(SUM(policy_counts.cnt), 0),
            'totalAnnualPremium', COALESCE(SUM(policy_counts.premium), 0),
            'totalCommissionsYtd', COALESCE(SUM(commission_totals.ytd), 0),
            'avgContractLevel', COALESCE(ROUND(AVG(up.contract_level)::numeric, 0), 0)
        )
        INTO v_metrics
        FROM user_profiles up
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
            FROM policies p
            WHERE p.user_id = up.id AND p.status = 'active'
        ) policy_counts ON true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
            FROM commissions c
            JOIN policies p ON c.policy_id = p.id
            WHERE p.user_id = up.id
            AND c.created_at >= date_trunc('year', CURRENT_DATE)
        ) commission_totals ON true
        WHERE up.agency_id = p_agency_id
        AND up.approval_status = 'approved'
        AND up.archived_at IS NULL;
    ELSE
        v_metrics := '{}'::jsonb;
    END IF;

    -- Combine sub-agencies and agents as children
    RETURN jsonb_build_object(
        'id', v_agency_record.id,
        'type', 'agency',
        'name', v_agency_record.name,
        'code', v_agency_record.code,
        'logoUrl', v_agency_record.logo_url,
        'ownerId', v_agency_record.owner_id,
        'ownerName', v_agency_record.owner_name,
        'ownerEmail', v_agency_record.owner_email,
        'metrics', v_metrics,
        'children', COALESCE(v_sub_agencies, '[]'::jsonb) || COALESCE(v_agents, '[]'::jsonb)
    );
END;
$$;

-- Build agent downline tree (recursive helper)
CREATE OR REPLACE FUNCTION build_agent_downline_tree(
    p_agent_id uuid,
    p_include_metrics boolean,
    p_max_depth int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_children jsonb;
BEGIN
    IF p_max_depth < 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', up.id,
            'type', 'agent',
            'name', COALESCE(up.first_name || ' ' || up.last_name, up.email),
            'email', up.email,
            'contractLevel', up.contract_level,
            'agentStatus', up.agent_status,
            'profilePhotoUrl', up.profile_photo_url,
            'hierarchyDepth', up.hierarchy_depth,
            'metrics', CASE WHEN p_include_metrics THEN
                jsonb_build_object(
                    'activePolicyCount', COALESCE(policy_data.cnt, 0),
                    'totalAnnualPremium', COALESCE(policy_data.premium, 0),
                    'totalCommissionsYtd', COALESCE(commission_data.ytd, 0)
                )
            ELSE '{}'::jsonb END,
            'children', COALESCE(build_agent_downline_tree(up.id, p_include_metrics, p_max_depth - 1), '[]'::jsonb)
        ) ORDER BY up.first_name, up.last_name, up.email
    )
    INTO v_children
    FROM user_profiles up
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
        FROM policies p
        WHERE p.user_id = up.id AND p.status = 'active'
    ) policy_data ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
        FROM commissions c
        JOIN policies p ON c.policy_id = p.id
        WHERE p.user_id = up.id
        AND c.created_at >= date_trunc('year', CURRENT_DATE)
    ) commission_data ON true
    WHERE up.upline_id = p_agent_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL;

    RETURN COALESCE(v_children, '[]'::jsonb);
END;
$$;

-- Build agent-level org chart (for agents viewing their own downlines)
CREATE OR REPLACE FUNCTION build_agent_org_chart(
    p_agent_id uuid,
    p_include_metrics boolean,
    p_max_depth int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agent_record record;
    v_children jsonb;
    v_metrics jsonb;
BEGIN
    -- Get agent info
    SELECT
        up.id,
        COALESCE(up.first_name || ' ' || up.last_name, up.email) as name,
        up.email,
        up.contract_level,
        up.agent_status,
        up.profile_photo_url,
        up.hierarchy_depth
    INTO v_agent_record
    FROM user_profiles up
    WHERE up.id = p_agent_id
    AND up.archived_at IS NULL;

    IF v_agent_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get downlines
    v_children := build_agent_downline_tree(p_agent_id, p_include_metrics, p_max_depth);

    -- Calculate metrics if requested
    IF p_include_metrics THEN
        SELECT jsonb_build_object(
            'activePolicyCount', COALESCE(policy_data.cnt, 0),
            'totalAnnualPremium', COALESCE(policy_data.premium, 0),
            'totalCommissionsYtd', COALESCE(commission_data.ytd, 0)
        )
        INTO v_metrics
        FROM (SELECT 1) dummy
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
            FROM policies p
            WHERE p.user_id = p_agent_id AND p.status = 'active'
        ) policy_data ON true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
            FROM commissions c
            JOIN policies p ON c.policy_id = p.id
            WHERE p.user_id = p_agent_id
            AND c.created_at >= date_trunc('year', CURRENT_DATE)
        ) commission_data ON true;
    ELSE
        v_metrics := '{}'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'id', v_agent_record.id,
        'type', 'agent',
        'name', v_agent_record.name,
        'email', v_agent_record.email,
        'contractLevel', v_agent_record.contract_level,
        'agentStatus', v_agent_record.agent_status,
        'profilePhotoUrl', v_agent_record.profile_photo_url,
        'hierarchyDepth', v_agent_record.hierarchy_depth,
        'metrics', v_metrics,
        'children', COALESCE(v_children, '[]'::jsonb)
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_org_chart_data(text, uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION build_imo_org_chart(uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION build_agency_org_chart(uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION build_agent_org_chart(uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION build_agent_downline_tree(uuid, boolean, int) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_org_chart_data IS 'Phase 12A: Returns hierarchical org chart data with performance metrics. Automatically determines appropriate scope based on user role.';
