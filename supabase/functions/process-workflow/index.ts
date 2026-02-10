// Process Workflow Edge Function
// Executes workflow actions sequentially with delays and error handling
// Uses Resend API for sending emails via send-automated-email edge function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WorkflowAction {
  type: string;
  order: number;
  config: Record<string, unknown>;
  delayMinutes?: number;
}

interface ProcessWorkflowRequest {
  runId: string;
  workflowId: string;
  isTest?: boolean;
}

interface ActionResult {
  actionId: string;
  actionType: string;
  status: "success" | "failed" | "skipped";
  result?: unknown;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  const adminSupabase = createSupabaseAdminClient();

  try {
    const body: ProcessWorkflowRequest = await req.json();
    const { runId, workflowId, isTest } = body;

    if (!runId || !workflowId) {
      return new Response(
        JSON.stringify({ error: "Missing runId or workflowId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Processing workflow ${workflowId}, run ${runId}, isTest: ${isTest}`,
    );

    // Get workflow details
    const { data: workflow, error: workflowError } = await adminSupabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Get workflow run context
    const { data: run, error: runError } = await adminSupabase
      .from("workflow_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      throw new Error(`Workflow run not found: ${runId}`);
    }

    // Parse actions from workflow
    const actions: WorkflowAction[] = workflow.actions || [];
    const actionsExecuted: ActionResult[] = [];
    let emailsSent = 0;
    let actionsCompleted = 0;
    let actionsFailed = 0;

    // Execute actions sequentially
    for (const action of actions.sort((a, b) => a.order - b.order)) {
      // Handle delay before action
      if (action.delayMinutes && action.delayMinutes > 0 && !isTest) {
        console.log(
          `Waiting ${action.delayMinutes} minutes before action ${action.order}`,
        );
        // For actual delays, we would need a different approach (like scheduling)
        // For now, we skip delays in the direct execution
      }

      try {
        const result = await executeAction(
          action,
          run.context,
          workflow,
          isTest,
          adminSupabase,
        );
        actionsExecuted.push({
          actionId: `action-${action.order}`,
          actionType: action.type,
          status: "success",
          result,
        });
        actionsCompleted++;

        if (action.type === "send_email") {
          emailsSent++;
        }
      } catch (actionError) {
        const errorMessage =
          actionError instanceof Error ? actionError.message : "Unknown error";
        console.error(`Action ${action.order} failed:`, errorMessage);

        actionsExecuted.push({
          actionId: `action-${action.order}`,
          actionType: action.type,
          status: "failed",
          error: errorMessage,
        });
        actionsFailed++;

        // Continue with other actions unless it's a critical failure
      }
    }

    // Update workflow run with results
    const durationMs = Date.now() - startTime;
    await adminSupabase
      .from("workflow_runs")
      .update({
        status: actionsFailed > 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        actions_executed: actionsExecuted,
        emails_sent: emailsSent,
        actions_completed: actionsCompleted,
        actions_failed: actionsFailed,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        actionsExecuted: actionsExecuted.length,
        actionsCompleted,
        actionsFailed,
        durationMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Process workflow error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Try to update the run as failed
    try {
      const body: ProcessWorkflowRequest = await req.clone().json();
      if (body.runId) {
        await adminSupabase
          .from("workflow_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            error_message: errorMessage,
          })
          .eq("id", body.runId);
      }
    } catch {
      // Ignore update errors
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Execute a single workflow action
 */
async function executeAction(
  action: WorkflowAction,
  context: Record<string, unknown>,
  _workflow: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<unknown> {
  console.log(`Executing action: ${action.type}`, action.config);

  switch (action.type) {
    case "send_email":
      return await executeSendEmail(action, context, isTest, supabase);

    case "create_notification":
      return await executeCreateNotification(action, context, isTest, supabase);

    case "wait":
      // For immediate execution, we just log the wait
      // Real delays would need a scheduling system
      console.log(`Wait action: ${action.config.waitMinutes || 0} minutes`);
      return { waited: action.config.waitMinutes || 0 };

    case "webhook":
      return await executeWebhook(action, context, isTest);

    case "update_field":
      return await executeUpdateField(action, context, isTest, supabase);

    default:
      console.log(`Unknown action type: ${action.type}`);
      return { skipped: true, reason: `Unknown action type: ${action.type}` };
  }
}

/**
 * Send email action - uses Resend API via send-automated-email edge function
 */
async function executeSendEmail(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<unknown> {
  console.log(
    "executeSendEmail called with action config:",
    JSON.stringify(action.config),
  );

  const templateId = action.config.templateId as string;
  if (!templateId) {
    throw new Error(
      "No template ID specified for send_email action - config was: " +
        JSON.stringify(action.config),
    );
  }

  // Get the workflow owner's user ID
  const workflowOwnerId = context.triggeredBy as string;
  if (!workflowOwnerId) {
    throw new Error(
      "No workflow owner ID in context - cannot send email without user",
    );
  }

  // Get workflow owner's full profile
  const { data: ownerProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", workflowOwnerId)
    .single();

  if (profileError || !ownerProfile) {
    throw new Error("Workflow owner profile not found");
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Determine recipients based on action configuration
  let recipientEmails: string[] = [];
  const recipientType =
    (action.config.recipientType as string) || "trigger_user";

  console.log("Determining recipients - type:", recipientType, "context:", {
    recipientEmail: context.recipientEmail,
    recipientId: context.recipientId,
    triggeredByEmail: context.triggeredByEmail,
    triggeredBy: context.triggeredBy,
  });

  switch (recipientType) {
    case "trigger_user":
      if (context.recipientEmail) {
        recipientEmails = [context.recipientEmail as string];
      }
      break;

    case "specific_email":
      if (action.config.recipientEmail) {
        recipientEmails = [action.config.recipientEmail as string];
      }
      break;

    case "current_user":
      if (context.triggeredByEmail) {
        recipientEmails = [context.triggeredByEmail as string];
      }
      break;

    case "manager":
    case "direct_upline":
      if (context.recipientId) {
        const { data: userWithUpline } = await supabase
          .from("user_profiles")
          .select("upline_id")
          .eq("id", context.recipientId)
          .single();

        if (userWithUpline?.upline_id) {
          const { data: manager } = await supabase
            .from("user_profiles")
            .select("id, email")
            .eq("id", userWithUpline.upline_id)
            .single();

          if (manager?.email) {
            recipientEmails = [manager.email];
          }
        }
      }
      break;

    case "all_trainers": {
      const { data: trainers } = await supabase
        .from("user_profiles")
        .select("id, email")
        .contains("roles", ["trainer"])
        .eq("is_deleted", false);

      if (trainers && trainers.length > 0) {
        recipientEmails = trainers.map((t) => t.email);
      }
      break;
    }

    case "all_agents": {
      const { data: agents, error: agentsError } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("agent_status", "licensed");

      console.log("Fetching all licensed agents, found:", agents?.length || 0);
      if (agentsError) {
        console.error("Error fetching agents:", agentsError);
      }

      if (agents && agents.length > 0) {
        recipientEmails = agents.map((a) => a.email);
      }
      break;
    }
  }

  if (recipientEmails.length === 0) {
    throw new Error(`No recipients found for type: ${recipientType}`);
  }

  // Rate limit check - prevent runaway email costs
  const workflowId = (context.workflowId as string) || "";
  const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
    "check_workflow_email_rate_limit",
    {
      p_user_id: ownerProfile.id,
      p_workflow_id: workflowId,
      p_recipient_email: recipientEmails[0],
      p_recipient_count: recipientEmails.length,
    },
  );

  if (rateLimitError) {
    console.error("Rate limit check error:", rateLimitError);
  } else if (rateLimitCheck && !rateLimitCheck.allowed) {
    const reason = rateLimitCheck.reason;
    let errorMessage = "Rate limit exceeded";

    switch (reason) {
      case "daily_limit_exceeded":
        errorMessage = `Daily email limit reached (${rateLimitCheck.limit} emails/day). ${rateLimitCheck.remaining} remaining.`;
        break;
      case "workflow_hourly_limit_exceeded":
        errorMessage = `This workflow has sent too many emails in the past hour (limit: ${rateLimitCheck.limit}). Please wait before sending more.`;
        break;
      case "recipient_daily_limit_exceeded":
        errorMessage = `${rateLimitCheck.recipient} has already received ${rateLimitCheck.limit} emails today from workflows.`;
        break;
      case "max_recipients_exceeded":
        errorMessage = `Too many recipients (${rateLimitCheck.requested}). Maximum allowed: ${rateLimitCheck.limit}`;
        break;
    }

    console.log("Rate limit blocked:", rateLimitCheck);
    throw new Error(errorMessage);
  }

  // Build template variables for replacement
  const templateVariables = await buildTemplateVariables(
    context,
    ownerProfile,
    supabase,
  );

  if (isTest) {
    return {
      action: "send_email",
      template: template.name,
      subject: replaceTemplateVariables(template.subject, templateVariables),
      recipientType,
      wouldSendTo: recipientEmails,
      sender: "noreply@updates.thestandardhq.com",
      isTest: true,
    };
  }

  // Send emails via Resend API
  const sentEmails: string[] = [];
  const failedEmails: string[] = [];

  for (const recipientEmail of recipientEmails) {
    try {
      // Replace template variables in subject and body
      const processedSubject = replaceTemplateVariables(
        template.subject,
        templateVariables,
      );
      const processedBodyHtml = replaceTemplateVariables(
        template.body_html,
        templateVariables,
      );
      const processedBodyText = replaceTemplateVariables(
        template.body_text || "",
        templateVariables,
      );

      console.log("Sending to:", recipientEmail, "Subject:", processedSubject);

      // Send via Resend API
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      if (!RESEND_API_KEY) {
        console.log("RESEND_API_KEY not configured, simulating email send");
        sentEmails.push(recipientEmail);
        continue;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "The Standard HQ <noreply@updates.thestandardhq.com>",
          to: [recipientEmail],
          subject: processedSubject,
          html: processedBodyHtml,
          text: processedBodyText || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Resend API error:", data);
        throw new Error(data.message || "Failed to send email");
      }

      sentEmails.push(recipientEmail);

      // Record in user_emails table
      await supabase.from("user_emails").insert({
        user_id: ownerProfile.id,
        sender_id: ownerProfile.id,
        subject: processedSubject,
        body_html: processedBodyHtml,
        body_text: processedBodyText,
        status: "sent",
        sent_at: new Date().toISOString(),
        provider: "resend",
        provider_message_id: data.id,
        is_incoming: false,
        from_address: "noreply@updates.thestandardhq.com",
        to_addresses: [recipientEmail],
      });

      // Record for rate limiting tracking
      await supabase
        .rpc("record_workflow_email", {
          p_workflow_id: workflowId,
          p_user_id: ownerProfile.id,
          p_recipient_email: recipientEmail,
          p_recipient_type: recipientType,
          p_success: true,
          p_error_message: null,
        })
        .catch((err) =>
          console.log("Rate tracking record failed (non-critical):", err),
        );

      // Increment email quota
      const today = new Date().toISOString().split("T")[0];
      const { data: existingQuota } = await supabase
        .from("email_quota_tracking")
        .select("id, emails_sent")
        .eq("user_id", ownerProfile.id)
        .eq("date", today)
        .eq("provider", "resend")
        .single();

      if (existingQuota) {
        await supabase
          .from("email_quota_tracking")
          .update({ emails_sent: existingQuota.emails_sent + 1 })
          .eq("id", existingQuota.id);
      } else {
        await supabase.from("email_quota_tracking").insert({
          user_id: ownerProfile.id,
          date: today,
          provider: "resend",
          emails_sent: 1,
        });
      }
    } catch (sendError) {
      console.error(`Failed to send to ${recipientEmail}:`, sendError);
      failedEmails.push(recipientEmail);

      // Record failed email for tracking
      await supabase
        .rpc("record_workflow_email", {
          p_workflow_id: workflowId,
          p_user_id: ownerProfile.id,
          p_recipient_email: recipientEmail,
          p_recipient_type: recipientType,
          p_success: false,
          p_error_message:
            sendError instanceof Error ? sendError.message : "Unknown error",
        })
        .catch((err) =>
          console.log("Rate tracking record failed (non-critical):", err),
        );
    }
  }

  if (sentEmails.length === 0) {
    throw new Error(
      `Failed to send to all recipients: ${failedEmails.join(", ")}`,
    );
  }

  return {
    sent: true,
    templateId,
    sentCount: sentEmails.length,
    failedCount: failedEmails.length,
    sentTo: sentEmails,
    failedTo: failedEmails.length > 0 ? failedEmails : undefined,
    provider: "resend",
  };
}

/**
 * Create notification action
 */
async function executeCreateNotification(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<unknown> {
  const title = action.config.title as string;
  const message = action.config.message as string;

  if (!title || !message) {
    throw new Error("Notification requires title and message");
  }

  if (isTest) {
    return {
      action: "create_notification",
      title,
      message,
      wouldNotify: context.recipientId || "unknown",
      isTest: true,
    };
  }

  const recipientId = context.recipientId as string;
  if (!recipientId) {
    throw new Error("No recipient ID in context");
  }

  // Create notification
  const { error: notifError } = await supabase.from("notifications").insert({
    user_id: recipientId,
    type: "workflow",
    title,
    message,
    is_read: false,
  });

  if (notifError) {
    throw new Error(`Failed to create notification: ${notifError.message}`);
  }

  return { created: true, title };
}

/**
 * Webhook action
 */
async function executeWebhook(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
): Promise<unknown> {
  const url = action.config.webhookUrl as string;
  const method = (action.config.webhookMethod as string) || "POST";

  if (!url) {
    throw new Error("No webhook URL specified");
  }

  if (isTest) {
    return {
      action: "webhook",
      url,
      method,
      wouldSend: context,
      isTest: true,
    };
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...((action.config.webhookHeaders as Record<string, string>) || {}),
    },
    body: method !== "GET" ? JSON.stringify(context) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  return { status: response.status, url };
}

/**
 * Update field action
 */
async function executeUpdateField(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<unknown> {
  const fieldName = action.config.fieldName as string;
  const fieldValue = action.config.fieldValue;

  if (!fieldName) {
    throw new Error("No field name specified for update_field action");
  }

  if (isTest) {
    return {
      action: "update_field",
      field: fieldName,
      value: fieldValue,
      isTest: true,
    };
  }

  // Determine which table to update based on context
  // This is a simplified implementation - real version would be more sophisticated
  const targetId = context.targetId as string;
  const targetTable = context.targetTable as string;

  if (!targetId || !targetTable) {
    throw new Error("No target specified for field update");
  }

  const { error } = await supabase
    .from(targetTable)
    .update({ [fieldName]: fieldValue })
    .eq("id", targetId);

  if (error) {
    throw new Error(`Failed to update field: ${error.message}`);
  }

  return { updated: true, field: fieldName };
}

/**
 * Build template variables from context and additional data
 */
async function buildTemplateVariables(
  context: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic data shape
  ownerProfile: any,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<Record<string, string>> {
  const variables: Record<string, string> = {};

  // Add owner/user variables (using underscores)
  variables["user_name"] =
    `${ownerProfile.first_name || ""} ${ownerProfile.last_name || ""}`.trim() ||
    ownerProfile.email;
  variables["user_first_name"] = ownerProfile.first_name || "";
  variables["user_last_name"] = ownerProfile.last_name || "";
  variables["user_email"] = ownerProfile.email;
  variables["company_name"] = "Your Insurance Agency"; // TODO: Get from settings

  // Set default recruit variables to empty string to prevent showing raw tags (using underscores)
  variables["recruit_name"] = "";
  variables["recruit_first_name"] = "";
  variables["recruit_last_name"] = "";
  variables["recruit_email"] = "";
  variables["recruit_phone"] = "";
  variables["recruit_status"] = "";
  variables["recruit_city"] = "";
  variables["recruit_state"] = "";
  variables["recruit_zip"] = "";
  variables["recruit_address"] = "";
  variables["recruit_contract_level"] = "";
  variables["recruit_npn"] = "";
  variables["recruit_license_number"] = "";
  variables["recruit_license_expiration"] = "";
  variables["recruit_referral_source"] = "";
  variables["recruit_facebook"] = "";
  variables["recruit_instagram"] = "";
  variables["recruit_website"] = "";

  // Add date variables (using underscores)
  const now = new Date();
  variables["date_today"] = now.toLocaleDateString();
  variables["date_tomorrow"] = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toLocaleDateString();
  variables["date_next_week"] = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString();
  variables["date_current_year"] = now.getFullYear().toString();
  variables["date_current_month"] = now.toLocaleDateString("en-US", {
    month: "long",
  });

  // Add workflow variables (using underscores)
  variables["workflow_name"] = (context.workflowName as string) || "";
  variables["workflow_run_id"] = (context.runId as string) || "";
  variables["app_url"] = "https://your-app-url.com"; // TODO: Get from environment

  // Try to get recipient/recruit data
  // First try recipientId, then recipientEmail, then use the workflow owner as fallback
  let recipientProfile = null;

  // Skip test IDs, but still try to find by email
  if (
    context.recipientId &&
    context.recipientId !== "test-user-id" &&
    context.recipientId !== "test-recipient"
  ) {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", context.recipientId)
      .single();
    recipientProfile = data;
    console.log("Found recipient by ID:", recipientProfile?.email);
  }

  // If no valid profile yet, try by email
  if (
    !recipientProfile &&
    context.recipientEmail &&
    context.recipientEmail !== "test@example.com"
  ) {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", context.recipientEmail as string)
      .single();
    recipientProfile = data;
    console.log("Found recipient by email:", recipientProfile?.email);
  }

  // If we still don't have a recipient, use the workflow owner as fallback
  if (!recipientProfile) {
    console.log(
      "No recipient found, using owner as fallback:",
      ownerProfile.email,
    );
    recipientProfile = ownerProfile;
  }

  if (recipientProfile) {
    // Override recruit variables with actual recipient data (using underscores)
    variables["recruit_name"] =
      `${recipientProfile.first_name || ""} ${recipientProfile.last_name || ""}`.trim() ||
      recipientProfile.email;
    variables["recruit_first_name"] = recipientProfile.first_name || "there";
    variables["recruit_last_name"] = recipientProfile.last_name || "";
    variables["recruit_email"] = recipientProfile.email;
    variables["recruit_phone"] = recipientProfile.phone || "";
    variables["recruit_status"] = recipientProfile.agent_status || "";
    variables["recruit_city"] = recipientProfile.city || "";
    variables["recruit_state"] = recipientProfile.state || "";
    variables["recruit_zip"] = recipientProfile.zip || "";
    variables["recruit_address"] = recipientProfile.street_address || "";
    variables["recruit_contract_level"] =
      recipientProfile.contract_level?.toString() || "";
    variables["recruit_npn"] = recipientProfile.npn || "";
    variables["recruit_license_number"] = recipientProfile.license_number || "";
    variables["recruit_license_expiration"] =
      recipientProfile.license_expiration
        ? new Date(recipientProfile.license_expiration).toLocaleDateString()
        : "";
    variables["recruit_referral_source"] =
      recipientProfile.referral_source || "";
    variables["recruit_facebook"] = recipientProfile.facebook_handle || "";
    variables["recruit_instagram"] = recipientProfile.instagram_username || "";
    variables["recruit_website"] = recipientProfile.personal_website || "";
  }

  // Add any additional context variables (using underscores)
  Object.entries(context).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      variables[`context_${key}`] = value.toString();
    }
  });

  return variables;
}

/**
 * Replace template variables in text
 */
function replaceTemplateVariables(
  text: string,
  variables: Record<string, string>,
): string {
  let result = text;

  // Replace {{variable}} format
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(
      `{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*}}`,
      "gi",
    );
    result = result.replace(regex, value);
  });

  // Also support {variable} format for backward compatibility
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(
      `{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*}`,
      "gi",
    );
    result = result.replace(regex, value);
  });

  return result;
}
