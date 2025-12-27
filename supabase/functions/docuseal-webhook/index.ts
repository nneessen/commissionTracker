// supabase/functions/docuseal-webhook/index.ts
// Webhook handler for DocuSeal signature events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// DocuSeal webhook event types
type DocuSealEventType =
  | "form.started" // Submitter opened the form
  | "form.viewed" // Form was viewed
  | "form.completed" // Submitter completed their signature
  | "form.declined" // Submitter declined to sign
  | "submission.completed" // All submitters completed
  | "submission.expired"; // Submission expired

interface DocuSealSubmitterPayload {
  id: number;
  submission_id: number;
  email: string;
  name?: string;
  status: string;
  role?: string;
  completed_at?: string;
  declined_at?: string;
  opened_at?: string;
  sent_at?: string;
  embed_src?: string;
  values?: Record<string, unknown>[];
  documents?: Array<{
    name: string;
    url: string;
  }>;
}

// DocuSealSubmissionPayload - documented for reference but using inline access
// interface DocuSealSubmissionPayload {
//   id: number;
//   source: string;
//   status: string;
//   audit_log_url?: string;
//   combined_document_url?: string;
//   created_at: string;
//   updated_at: string;
//   submitters: DocuSealSubmitterPayload[];
// }

interface DocuSealWebhookPayload {
  event_type: DocuSealEventType;
  timestamp: string;
  data: {
    // For form.* events, this is the submitter
    id: number;
    submission_id?: number;
    email?: string;
    status?: string;
    role?: string;
    completed_at?: string;
    declined_at?: string;
    opened_at?: string;
    // For submission.* events, this includes submitters
    submitters?: DocuSealSubmitterPayload[];
    audit_log_url?: string;
    combined_document_url?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get Supabase client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse webhook payload
    const payload: DocuSealWebhookPayload = await req.json();
    const eventType = payload.event_type;

    console.log(
      `[docuseal-webhook] Received event: ${eventType} at ${payload.timestamp}`,
      {
        dataId: payload.data.id,
        submissionId: payload.data.submission_id,
        status: payload.data.status,
      },
    );

    switch (eventType) {
      case "form.started":
      case "form.viewed": {
        // Update submitter status to "opened"
        const submitterId = payload.data.id;

        const { data: submitter, error: findError } = await supabase
          .from("signature_submitters")
          .select("id, status")
          .eq("docuseal_submitter_id", submitterId)
          .maybeSingle();

        if (findError || !submitter) {
          console.warn(
            `[docuseal-webhook] Submitter not found: ${submitterId}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              message: "Submitter not found, event ignored",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Only update if not already in a later status
        if (["pending", "sent"].includes(submitter.status)) {
          await supabase
            .from("signature_submitters")
            .update({
              status: "opened",
              opened_at: payload.data.opened_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", submitter.id);

          console.log(
            `[docuseal-webhook] Submitter ${submitter.id} marked as opened`,
          );
        }
        break;
      }

      case "form.completed": {
        // Update submitter status to "completed"
        const submitterId = payload.data.id;

        const { data: submitter, error: findError } = await supabase
          .from("signature_submitters")
          .select("id, submission_id")
          .eq("docuseal_submitter_id", submitterId)
          .maybeSingle();

        if (findError || !submitter) {
          console.warn(
            `[docuseal-webhook] Submitter not found: ${submitterId}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              message: "Submitter not found, event ignored",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        await supabase
          .from("signature_submitters")
          .update({
            status: "completed",
            signed_at: payload.data.completed_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", submitter.id);

        console.log(
          `[docuseal-webhook] Submitter ${submitter.id} marked as completed`,
        );

        // Check if all submitters are done
        await checkAndUpdateSubmissionStatus(supabase, submitter.submission_id);
        break;
      }

      case "form.declined": {
        // Update submitter status to "declined"
        const submitterId = payload.data.id;

        const { data: submitter, error: findError } = await supabase
          .from("signature_submitters")
          .select("id, submission_id")
          .eq("docuseal_submitter_id", submitterId)
          .maybeSingle();

        if (findError || !submitter) {
          console.warn(
            `[docuseal-webhook] Submitter not found: ${submitterId}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              message: "Submitter not found, event ignored",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        await supabase
          .from("signature_submitters")
          .update({
            status: "declined",
            declined_at: payload.data.declined_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", submitter.id);

        // Update submission status to declined
        await supabase
          .from("signature_submissions")
          .update({
            status: "declined",
            declined_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", submitter.submission_id);

        console.log(
          `[docuseal-webhook] Submitter ${submitter.id} declined, submission marked as declined`,
        );
        break;
      }

      case "submission.completed": {
        // All submitters completed - update submission and get document URLs
        const docusealSubmissionId = payload.data.id;

        const { data: submission, error: findError } = await supabase
          .from("signature_submissions")
          .select("id, checklist_progress_id")
          .eq("docuseal_submission_id", docusealSubmissionId)
          .maybeSingle();

        if (findError || !submission) {
          console.warn(
            `[docuseal-webhook] Submission not found: ${docusealSubmissionId}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              message: "Submission not found, event ignored",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        await supabase
          .from("signature_submissions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            audit_log_url: payload.data.audit_log_url,
            combined_document_url: payload.data.combined_document_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);

        console.log(`[docuseal-webhook] Submission ${submission.id} completed`);

        // If linked to checklist, mark the checklist item complete
        if (submission.checklist_progress_id) {
          await markChecklistItemComplete(
            supabase,
            submission.checklist_progress_id,
            submission.id,
          );
        }
        break;
      }

      case "submission.expired": {
        // Submission expired
        const docusealSubmissionId = payload.data.id;

        const { data: submission, error: findError } = await supabase
          .from("signature_submissions")
          .select("id")
          .eq("docuseal_submission_id", docusealSubmissionId)
          .maybeSingle();

        if (findError || !submission) {
          console.warn(
            `[docuseal-webhook] Submission not found: ${docusealSubmissionId}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              message: "Submission not found, event ignored",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        await supabase
          .from("signature_submissions")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);

        console.log(`[docuseal-webhook] Submission ${submission.id} expired`);
        break;
      }

      default:
        console.log(`[docuseal-webhook] Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true, event: eventType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[docuseal-webhook] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

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
 * Check if all submitters are complete and update submission status
 */
async function checkAndUpdateSubmissionStatus(
  supabase: ReturnType<typeof createClient>,
  submissionId: string,
): Promise<void> {
  // Get all submitters for this submission
  const { data: submitters, error } = await supabase
    .from("signature_submitters")
    .select("status")
    .eq("submission_id", submissionId);

  if (error || !submitters) {
    console.error("[docuseal-webhook] Error fetching submitters:", error);
    return;
  }

  // Check if all are completed
  const allCompleted = submitters.every((s) => s.status === "completed");
  const anyDeclined = submitters.some((s) => s.status === "declined");

  if (anyDeclined) {
    await supabase
      .from("signature_submissions")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
  } else if (allCompleted) {
    // Get the submission to check for checklist link
    const { data: submission } = await supabase
      .from("signature_submissions")
      .select("checklist_progress_id")
      .eq("id", submissionId)
      .single();

    await supabase
      .from("signature_submissions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    // Mark checklist item complete if linked
    if (submission?.checklist_progress_id) {
      await markChecklistItemComplete(
        supabase,
        submission.checklist_progress_id,
        submissionId,
      );
    }
  } else {
    // Some in progress
    await supabase
      .from("signature_submissions")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
  }
}

/**
 * Mark a checklist item as complete when signature is done
 */
async function markChecklistItemComplete(
  supabase: ReturnType<typeof createClient>,
  checklistProgressId: string,
  submissionId: string,
): Promise<void> {
  try {
    // Get the submission details for the response data
    const { data: submission } = await supabase
      .from("signature_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    const { data: submitters } = await supabase
      .from("signature_submitters")
      .select("*")
      .eq("submission_id", submissionId);

    // Build the response data
    const responseData = {
      submission_id: submissionId,
      docuseal_submission_id: submission?.docuseal_submission_id,
      status: "completed",
      signers_completed: submitters?.length || 0,
      signers_total: submitters?.length || 0,
      completed_at: new Date().toISOString(),
      audit_log_url: submission?.audit_log_url,
      combined_document_url: submission?.combined_document_url,
    };

    // Update the checklist response
    await supabase.from("checklist_responses").upsert(
      {
        checklist_progress_id: checklistProgressId,
        response_data: responseData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "checklist_progress_id",
      },
    );

    // Update the checklist progress status
    await supabase
      .from("checklist_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", checklistProgressId);

    console.log(
      `[docuseal-webhook] Marked checklist progress ${checklistProgressId} as complete`,
    );
  } catch (error) {
    console.error(
      "[docuseal-webhook] Error marking checklist complete:",
      error,
    );
  }
}
