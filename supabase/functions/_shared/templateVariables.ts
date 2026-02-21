// supabase/functions/_shared/templateVariables.ts
// Server-side template variable utilities for Deno edge functions.
// Mirrors src/lib/templateVariables.ts — kept in sync manually since
// edge functions cannot import from the src/ directory.

/** All valid template variable keys (must stay in sync with src/lib/templateVariables.ts) */
export const TEMPLATE_VARIABLE_KEYS: readonly string[] = [
  // Recruit Basic
  "recruit_name", "recruit_first_name", "recruit_last_name",
  "recruit_email", "recruit_phone", "recruit_status",
  // Recruit Location
  "recruit_city", "recruit_state", "recruit_zip", "recruit_address",
  // Recruit Professional
  "recruit_contract_level", "recruit_npn", "recruit_license_number",
  "recruit_license_expiration", "recruit_license_state", "recruit_referral_source",
  "contract_level",
  // Recruit Social
  "recruit_facebook", "recruit_instagram", "recruit_website",
  // Organization
  "company_name", "agency_name", "imo_name",
  // User/Owner
  "user_name", "user_first_name", "user_last_name", "user_email",
  // Upline
  "upline_name", "upline_first_name", "upline_email", "upline_phone",
  // Pipeline
  "phase_name", "phase_description", "template_name", "item_name", "checklist_items",
  // Sender
  "sender_name", "recruiter_name",
  // Dates
  "current_date", "date_today", "date_tomorrow", "date_next_week",
  "date_current_month", "date_current_year", "deadline_date",
  // Calculated
  "days_in_phase", "days_since_signup",
  // Links
  "portal_link", "app_url",
  // Workflow
  "workflow_name", "workflow_run_id",
];

/**
 * Returns a Record<string, string> with every known variable key set to "".
 * Use as a starting point to prevent raw {{tags}} in output.
 */
export function initEmptyVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of TEMPLATE_VARIABLE_KEYS) {
    vars[key] = "";
  }
  return vars;
}

/**
 * Standardized template variable replacement for edge functions.
 * - Case-insensitive, whitespace-tolerant: matches {{ key }}, {{key}}, etc.
 * - Also supports single-brace {key} for backward compatibility.
 */
export function replaceTemplateVariables(
  text: string,
  variables: Record<string, string>,
): string {
  let result = text;

  for (const [key, value] of Object.entries(variables)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Double-brace {{variable}} — primary format
    const doubleBrace = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi");
    result = result.replace(doubleBrace, value);

    // Single-brace {variable} — backward compat
    const singleBrace = new RegExp(`\\{\\s*${escaped}\\s*\\}`, "gi");
    result = result.replace(singleBrace, value);
  }

  return result;
}
