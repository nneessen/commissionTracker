// supabase/functions/save-elevenlabs-config/index.ts
// Encrypts and stores ElevenLabs TTS configuration for an IMO

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface SaveConfigRequest {
  imoId: string;
  apiKey: string;
  voiceId?: string;
  voiceName?: string;
  existingId?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const authHeader = req.headers.get("Authorization");

  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(origin);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: SaveConfigRequest = await req.json();
    const { imoId, apiKey, voiceId, voiceName, existingId } = body;

    if (!imoId || !apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: imoId, apiKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user identity and permissions
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify user is training hub staff in the requested IMO
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("roles, imo_id, is_super_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ ok: false, error: "User profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const roles = Array.isArray(profile.roles) ? profile.roles : [];
    const isStaff = profile.is_super_admin === true ||
      roles.some((r: string) => ["trainer", "contracting_manager", "admin"].includes(r));
    const imoMatch = profile.imo_id === imoId;

    if (!isStaff || !imoMatch) {
      return new Response(
        JSON.stringify({ ok: false, error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Encrypt the API key server-side
    const encryptedApiKey = await encrypt(apiKey);

    const configData: Record<string, unknown> = {
      imo_id: imoId,
      api_key_encrypted: encryptedApiKey,
      default_voice_id: voiceId || null,
      default_voice_name: voiceName || null,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (existingId) {
      // Update existing config
      const { data, error } = await supabase
        .from("elevenlabs_config")
        .update(configData)
        .eq("id", existingId)
        .eq("imo_id", imoId)
        .select("id")
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      result = data;
    } else {
      // Check for existing config for this IMO
      const { data: existing } = await supabase
        .from("elevenlabs_config")
        .select("id")
        .eq("imo_id", imoId)
        .maybeSingle();

      if (existing) {
        // Update instead of insert
        const { data, error } = await supabase
          .from("elevenlabs_config")
          .update(configData)
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        result = data;
      } else {
        // Insert new
        configData.created_at = new Date().toISOString();
        const { data, error } = await supabase
          .from("elevenlabs_config")
          .insert(configData)
          .select("id")
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        result = data;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[save-elevenlabs-config] Error:", err);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
