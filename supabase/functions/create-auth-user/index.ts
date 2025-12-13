// supabase/functions/create-auth-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, fullName, roles, isAdmin, skipPipeline } = await req.json()

    // Generate a secure temporary password
    const tempPassword = crypto.randomUUID() + '@Secure123'

    // Create user with confirmed email to prevent magic link
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Confirmed to prevent magic link
      user_metadata: {
        full_name: fullName,
        roles: roles,
        is_admin: isAdmin,
        skip_pipeline: skipPipeline
      }
    })

    if (authError) {
      throw authError
    }

    // Send password reset email (simpler and more reliable than invite)
    if (authUser.user) {
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get('origin')}/auth/reset-password`,
      })

      if (resetError) {
        console.error('Password reset email error:', resetError)
        // Don't fail the user creation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        user: authUser.user,
        message: 'User created successfully. Password reset email sent.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})