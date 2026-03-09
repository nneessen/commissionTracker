import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsResponse, getCorsHeaders } from "../_shared/cors.ts";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const ALLOWED_PAYLOAD_KEYS = new Set([
  "clientName",
  "clientDob",
  "clientAge",
  "clientGender",
  "clientState",
  "clientHeightInches",
  "clientWeightLbs",
  "healthResponses",
  "conditionsReported",
  "tobaccoUse",
  "tobaccoDetails",
  "requestedFaceAmounts",
  "requestedProductTypes",
  "decisionTreeId",
  "sessionDurationSeconds",
  "notes",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expected string value");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRequiredString(value: unknown, field: string): string {
  const parsed = asOptionalString(value);
  if (!parsed) {
    throw new Error(`${field} is required`);
  }
  return parsed;
}

function asOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Expected finite number value");
  }

  return value;
}

function asRequiredNumber(value: unknown, field: string): number {
  const parsed = asOptionalNumber(value);
  if (parsed === null) {
    throw new Error(`${field} is required`);
  }
  return parsed;
}

function asRequiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }

  return value;
}

function asStringArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }

  return value;
}

function asObject(value: unknown, field: string): Record<string, JsonValue> {
  if (!isPlainObject(value)) {
    throw new Error(`${field} must be an object`);
  }

  return value as Record<string, JsonValue>;
}

function asOptionalObject(value: unknown): Record<string, JsonValue> | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isPlainObject(value)) {
    throw new Error("Expected object value");
  }

  return value as Record<string, JsonValue>;
}

function asNumberArray(value: unknown, field: string): number[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    throw new Error(`${field} must be an array of numbers`);
  }

  return value;
}

function sanitizePayload(body: unknown): Record<string, JsonValue> {
  const payload = asObject(body, "body");

  const unexpectedKeys = Object.keys(payload).filter(
    (key) => !ALLOWED_PAYLOAD_KEYS.has(key),
  );
  if (unexpectedKeys.length > 0) {
    throw new Error("Only raw wizard inputs may be persisted");
  }

  const requestedFaceAmounts = asNumberArray(
    payload.requestedFaceAmounts,
    "requestedFaceAmounts",
  );
  if (requestedFaceAmounts.length === 0) {
    throw new Error(
      "requestedFaceAmounts must include at least one face amount",
    );
  }

  return {
    clientName: asOptionalString(payload.clientName),
    clientDob: asOptionalString(payload.clientDob),
    clientAge: asRequiredNumber(payload.clientAge, "clientAge"),
    clientGender: asRequiredString(payload.clientGender, "clientGender"),
    clientState: asRequiredString(payload.clientState, "clientState"),
    clientHeightInches: asRequiredNumber(
      payload.clientHeightInches,
      "clientHeightInches",
    ),
    clientWeightLbs: asRequiredNumber(
      payload.clientWeightLbs,
      "clientWeightLbs",
    ),
    healthResponses: asObject(payload.healthResponses, "healthResponses"),
    conditionsReported: asStringArray(
      payload.conditionsReported ?? [],
      "conditionsReported",
    ),
    tobaccoUse: asRequiredBoolean(payload.tobaccoUse, "tobaccoUse"),
    tobaccoDetails: asOptionalObject(payload.tobaccoDetails),
    requestedFaceAmounts,
    requestedProductTypes: asStringArray(
      payload.requestedProductTypes ?? [],
      "requestedProductTypes",
    ),
    decisionTreeId: asOptionalString(payload.decisionTreeId),
    sessionDurationSeconds: asOptionalNumber(payload.sessionDurationSeconds),
    notes: asOptionalString(payload.notes),
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "unauthorized",
          error: "Missing authorization header",
          requestId,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment is not configured");
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "unauthorized",
          error: "Unauthorized",
          requestId,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const requestBody = await req.json();
    const payload = sanitizePayload(requestBody);

    const { data, error } = await client.rpc("save_underwriting_session_v2", {
      p_payload: payload,
    });

    if (error) {
      console.error("[save-underwriting-session] RPC error", {
        requestId,
        userId: user.id,
        code: error.code,
        message: error.message,
      });
      return new Response(
        JSON.stringify({
          success: false,
          code: "save_failed",
          error: "Failed to save underwriting session",
          requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = data as {
      success: boolean;
      code?: string;
      error?: string;
      session?: unknown;
    } | null;
    if (!result?.success) {
      const status = result?.code === "unauthorized" ? 401 : 400;
      return new Response(
        JSON.stringify({
          success: false,
          code: result?.code || "save_failed",
          error: result?.error || "Failed to save underwriting session",
          requestId,
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ...result,
        requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid underwriting session request";

    return new Response(
      JSON.stringify({
        success: false,
        code: "invalid_payload",
        error: message,
        requestId,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
