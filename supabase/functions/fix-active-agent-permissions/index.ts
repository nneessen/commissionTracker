// /home/nneessen/projects/commissionTracker/supabase/functions/fix-active-agent-permissions/index.ts
// Edge function to fix active_agent role permissions

import {serve} from "https://deno.land/std@0.168.0/http/server.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 1. Get or create active_agent role
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'active_agent')
      .single();

    if (!roleData || roleError) {
      // Create the role
      const { data: newRole, error: createError } = await supabase
        .from('roles')
        .insert({
          name: 'active_agent',
          display_name: 'Active Agent',
          description: 'Licensed agent with full application access',
          is_system_role: false
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create active_agent role: ${createError.message}`);
      }
      roleData = newRole;
    }

    const roleId = roleData.id;

    // 2. Get all necessary permissions
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, code')
      .or(`code.like.nav.%,code.like.policies.%,code.like.commissions.%,code.like.expenses.%,code.like.targets.%,code.like.analytics.%,code.like.reports.%,code.like.hierarchy.%,code.like.email.%`)
      .not('code', 'like', 'admin.%')
      .not('code', 'like', 'system.%');

    if (permError) {
      throw new Error(`Failed to fetch permissions: ${permError.message}`);
    }

    // 3. Clear existing permissions for active_agent
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // 4. Grant all permissions to active_agent
    const rolePermissions = permissions.map(perm => ({
      role_id: roleId,
      permission_id: perm.id
    }));

    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(rolePermissions);

    if (insertError) {
      console.error('Error inserting permissions:', insertError);
      // Continue anyway, some might have succeeded
    }

    // 5. Update nick.neessen@gmail.com specifically
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        roles: ['active_agent'],
        agent_status: 'licensed',
        approval_status: 'approved',
        contract_level: 100,
        onboarding_status: null,
        current_onboarding_phase: null,
        onboarding_started_at: null
      })
      .eq('email', 'nick.neessen@gmail.com');

    if (updateError) {
      console.error('Error updating nick.neessen profile:', updateError);
    }

    // 6. Count permissions assigned
    const { data: countData } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    return new Response(
      JSON.stringify({
        success: true,
        role_id: roleId,
        permissions_granted: countData?.length || 0,
        permissions_attempted: permissions.length,
        user_updated: !updateError,
        message: `Active agent role now has ${countData?.length || 0} permissions`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});