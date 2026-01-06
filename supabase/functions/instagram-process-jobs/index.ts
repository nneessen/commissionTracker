// supabase/functions/instagram-process-jobs/index.ts
// CRON job processor for Instagram background tasks
// Processes: media downloads, scheduled messages, metadata refresh
// Runs every 1 minute

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type JobType =
  | "download_profile_picture"
  | "download_message_media"
  | "send_scheduled_message"
  | "refresh_participant_metadata";

interface Job {
  id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  integration_id: string | null;
  attempts: number;
}

interface ProcessResult {
  total: number;
  completed: number;
  failed: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify CRON authorization
  const authHeader = req.headers.get("Authorization");
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const isAuthorized =
    authHeader === `Bearer ${CRON_SECRET}` ||
    authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isAuthorized) {
    console.error("[instagram-process-jobs] Unauthorized request");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result: ProcessResult = {
    total: 0,
    completed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Claim pending jobs (atomic with row locking)
    const { data: jobs, error: claimError } = await supabase.rpc(
      "claim_instagram_jobs",
      {
        p_job_types: null, // Process all types
        p_limit: 20, // Process up to 20 jobs per run
      },
    );

    if (claimError) {
      console.error(
        "[instagram-process-jobs] Failed to claim jobs:",
        claimError,
      );
      result.errors.push(claimError.message);
      return new Response(JSON.stringify({ success: false, result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log("[instagram-process-jobs] No pending jobs");
      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    result.total = jobs.length;
    console.log(`[instagram-process-jobs] Processing ${jobs.length} jobs`);

    // Process jobs in parallel with concurrency limit
    const processingResults = await processJobsWithConcurrency(
      supabase,
      jobs as Job[],
      5, // Max 5 concurrent jobs
    );

    // Aggregate results
    for (const jobResult of processingResults) {
      if (jobResult.status === "fulfilled" && jobResult.value.success) {
        result.completed++;
      } else {
        result.failed++;
        const error =
          jobResult.status === "rejected"
            ? jobResult.reason?.message
            : jobResult.value?.error;
        if (error) {
          result.errors.push(error);
        }
      }
    }

    // Cleanup old completed/failed jobs (older than 7 days)
    const { data: cleanedCount } = await supabase.rpc(
      "cleanup_instagram_jobs",
      {
        p_older_than: "7 days",
      },
    );
    if (cleanedCount && cleanedCount > 0) {
      console.log(
        `[instagram-process-jobs] Cleaned up ${cleanedCount} old jobs`,
      );
    }

    console.log(
      `[instagram-process-jobs] Complete: ${result.completed}/${result.total} succeeded`,
    );

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[instagram-process-jobs] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, result }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Process jobs with concurrency control
 */
async function processJobsWithConcurrency(
  supabase: ReturnType<typeof createClient>,
  jobs: Job[],
  concurrency: number,
): Promise<PromiseSettledResult<{ success: boolean; error?: string }>[]> {
  const results: PromiseSettledResult<{ success: boolean; error?: string }>[] =
    [];

  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((job) => processJob(supabase, job)),
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Process a single job based on its type
 */
async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: Job,
): Promise<{ success: boolean; error?: string }> {
  console.log(
    `[instagram-process-jobs] Processing job ${job.id} (${job.job_type})`,
  );

  try {
    switch (job.job_type) {
      case "download_profile_picture":
        await processDownloadProfilePicture(supabase, job);
        break;
      case "download_message_media":
        await processDownloadMessageMedia(supabase, job);
        break;
      case "send_scheduled_message":
        await processSendScheduledMessage(supabase, job);
        break;
      case "refresh_participant_metadata":
        await processRefreshParticipantMetadata(supabase, job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }

    // Mark job as completed
    await supabase.rpc("complete_instagram_job", { p_job_id: job.id });
    console.log(`[instagram-process-jobs] Job ${job.id} completed`);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[instagram-process-jobs] Job ${job.id} failed:`,
      errorMessage,
    );

    // Mark job as failed (with retry logic)
    await supabase.rpc("fail_instagram_job", {
      p_job_id: job.id,
      p_error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Download and cache a profile picture to Supabase Storage
 */
async function processDownloadProfilePicture(
  supabase: ReturnType<typeof createClient>,
  job: Job,
): Promise<void> {
  const { conversation_id, participant_id, source_url } = job.payload as {
    conversation_id: string;
    participant_id: string;
    source_url: string;
  };

  if (!source_url) {
    throw new Error("No source URL provided");
  }

  // Download the image
  const response = await fetch(source_url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const imageData = await response.arrayBuffer();

  // Determine file extension
  const ext = contentType.includes("png") ? "png" : "jpg";
  const storagePath = `avatars/${job.integration_id}/${participant_id}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("instagram-media")
    .upload(storagePath, imageData, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("instagram-media")
    .getPublicUrl(storagePath);

  // Update the conversation with cached URL
  const { error: updateError } = await supabase
    .from("instagram_conversations")
    .update({
      participant_avatar_cached_url: urlData.publicUrl,
      participant_avatar_cached_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation_id);

  if (updateError) {
    throw new Error(`Failed to update conversation: ${updateError.message}`);
  }

  console.log(
    `[instagram-process-jobs] Cached profile picture for conversation ${conversation_id}`,
  );
}

/**
 * Download and cache message media to Supabase Storage
 */
async function processDownloadMessageMedia(
  supabase: ReturnType<typeof createClient>,
  job: Job,
): Promise<void> {
  const { message_id, conversation_id, source_url, media_type } =
    job.payload as {
      message_id: string;
      conversation_id: string;
      source_url: string;
      media_type: string;
    };

  if (!source_url) {
    throw new Error("No source URL provided");
  }

  // Download the media
  const response = await fetch(source_url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") || `${media_type || "image"}/jpeg`;
  const mediaData = await response.arrayBuffer();

  // Determine file extension from content type
  let ext = "bin";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
  else if (contentType.includes("png")) ext = "png";
  else if (contentType.includes("gif")) ext = "gif";
  else if (contentType.includes("mp4")) ext = "mp4";
  else if (contentType.includes("webp")) ext = "webp";

  const storagePath = `messages/${conversation_id}/${message_id}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("instagram-media")
    .upload(storagePath, mediaData, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("instagram-media")
    .getPublicUrl(storagePath);

  // Update the message with cached URL
  const { error: updateError } = await supabase
    .from("instagram_messages")
    .update({
      media_cached_url: urlData.publicUrl,
      media_cached_at: new Date().toISOString(),
    })
    .eq("id", message_id);

  if (updateError) {
    throw new Error(`Failed to update message: ${updateError.message}`);
  }

  console.log(
    `[instagram-process-jobs] Cached media for message ${message_id}`,
  );
}

/**
 * Send a scheduled message (delegated from webhook or CRON)
 * Note: This is a fallback - most scheduled messages are sent by instagram-process-scheduled
 */
async function processSendScheduledMessage(
  _supabase: ReturnType<typeof createClient>,
  job: Job,
): Promise<void> {
  const { scheduled_message_id } = job.payload as {
    scheduled_message_id: string;
  };

  // For now, just log - the main CRON handles this
  // This job type exists for future webhook delegation
  console.log(
    `[instagram-process-jobs] Scheduled message ${scheduled_message_id} - delegating to main CRON`,
  );

  // The main instagram-process-scheduled CRON will pick this up
  // This is here for potential future use where webhook delegates to job queue
}

/**
 * Refresh participant metadata from Instagram API
 * Fetches username, name, and profile_picture_url for a participant
 */
async function processRefreshParticipantMetadata(
  supabase: ReturnType<typeof createClient>,
  job: Job,
): Promise<void> {
  const { conversation_id, participant_id } = job.payload as {
    conversation_id: string;
    participant_id: string;
  };

  if (!job.integration_id) {
    throw new Error("Missing integration_id for metadata refresh");
  }

  // Get the integration's access token
  const { data: integration, error: intError } = await supabase
    .from("instagram_integrations")
    .select("access_token_encrypted")
    .eq("id", job.integration_id)
    .single();

  if (intError || !integration) {
    throw new Error(`Integration not found: ${job.integration_id}`);
  }

  // Decrypt access token
  const { decrypt } = await import("../_shared/encryption.ts");
  const accessToken = await decrypt(integration.access_token_encrypted);

  // Call Meta API to get participant info
  // Using the Instagram-scoped user ID to fetch their profile
  const apiUrl = new URL(`https://graph.instagram.com/v21.0/${participant_id}`);
  apiUrl.searchParams.set("fields", "username,name,profile_picture_url");
  apiUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(apiUrl.toString());
  const userData = await response.json();

  if (userData.error) {
    // Some errors are expected (user privacy settings, deleted accounts)
    console.log(
      `[instagram-process-jobs] Could not fetch metadata for ${participant_id}: ${userData.error.message}`,
    );
    return; // Don't throw - this is expected for some users
  }

  // Update conversation with new metadata
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (userData.username) {
    updateData.participant_username = userData.username;
  }
  if (userData.name) {
    updateData.participant_name = userData.name;
  }
  if (userData.profile_picture_url) {
    updateData.participant_profile_picture_url = userData.profile_picture_url;
  }

  await supabase
    .from("instagram_conversations")
    .update(updateData)
    .eq("id", conversation_id);

  console.log(
    `[instagram-process-jobs] Updated metadata for participant ${participant_id}`,
  );

  // If we got a profile picture URL, enqueue a download job
  if (userData.profile_picture_url) {
    await supabase.rpc("enqueue_instagram_job", {
      p_job_type: "download_profile_picture",
      p_payload: {
        conversation_id,
        participant_id,
        source_url: userData.profile_picture_url,
      },
      p_integration_id: job.integration_id,
      p_priority: -1, // Lower priority
    });
    console.log(
      `[instagram-process-jobs] Enqueued profile picture download for ${participant_id}`,
    );
  }
}
