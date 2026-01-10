// supabase/functions/parse-underwriting-guide/index.ts
// Edge function to parse uploaded underwriting guide PDFs and extract text content

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  guideId: string;
}

interface ParsedSection {
  pageNumber: number;
  content: string;
}

interface ParsedContent {
  fullText: string;
  sections: ParsedSection[];
  pageCount: number;
  extractedAt: string;
  metadata: {
    title?: string;
    author?: string;
  };
}

const STORAGE_BUCKET = "underwriting-guides";

// Configuration constants
const MAX_PROCESSING_TIME_MS = 50000; // 50 seconds, leave buffer for edge function timeout
const MAX_PAGE_COUNT = 500; // Prevent DoS via huge PDFs
const MAX_FAILURE_RATIO = 0.5; // Fail if more than 50% of pages fail extraction
const PROGRESS_LOG_INTERVAL = 10; // Log progress every N pages

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let guideId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    console.log("[parse-guide] Function invoked");

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const body: ParseRequest = await req.json();
    guideId = body.guideId;

    if (!guideId) {
      throw new Error("Missing guideId parameter");
    }

    console.log(`[parse-guide] Starting parse for guide: ${guideId}`);

    // Authorization check
    const { data: userData, error: userError } =
      await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[parse-guide] User auth error:", userError);
      throw new Error("Unauthorized: Could not verify user identity");
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("imo_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !userProfile?.imo_id) {
      console.error("[parse-guide] Profile error:", profileError);
      throw new Error("Unauthorized: User profile not found or has no IMO");
    }

    const userImoId = userProfile.imo_id;
    console.log(`[parse-guide] User IMO: ${userImoId}`);

    // Fetch guide record
    const { data: guide, error: guideError } = await supabase
      .from("underwriting_guides")
      .select("id, storage_path, name, imo_id, parsing_status")
      .eq("id", guideId)
      .eq("imo_id", userImoId)
      .single();

    if (guideError || !guide) {
      console.error("[parse-guide] Guide fetch error:", guideError);
      throw new Error(`Guide not found or access denied`);
    }

    console.log(
      `[parse-guide] Found guide: ${guide.name}, path: ${guide.storage_path}`,
    );

    // Optimistic locking
    const { data: updateResult, error: lockError } = await supabase
      .from("underwriting_guides")
      .update({
        parsing_status: "processing",
        parsing_error: null,
      })
      .eq("id", guideId)
      .neq("parsing_status", "processing")
      .select("id")
      .single();

    if (lockError || !updateResult) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Guide is already being processed",
          code: "ALREADY_PROCESSING",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Download PDF from storage
    console.log(`[parse-guide] Downloading from: ${guide.storage_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(guide.storage_path);

    if (downloadError || !fileData) {
      console.error("[parse-guide] Download error:", downloadError);
      throw new Error(
        `Failed to download PDF: ${downloadError?.message || "Unknown error"}`,
      );
    }

    console.log(`[parse-guide] Downloaded PDF, size: ${fileData.size} bytes`);

    // Convert Blob to ArrayBuffer for pdf.js
    const pdfBuffer = await fileData.arrayBuffer();
    const pdfData = new Uint8Array(pdfBuffer);

    console.log(`[parse-guide] Starting PDF text extraction...`);

    // Load PDF document using pdf.js
    // Disable worker to avoid issues in Deno edge function environment
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;

    console.log(`[parse-guide] PDF loaded, ${pdfDoc.numPages} pages found`);

    // Validate page count to prevent DoS
    if (pdfDoc.numPages > MAX_PAGE_COUNT) {
      pdfDoc.destroy();
      throw new Error(
        `PDF too large: ${pdfDoc.numPages} pages exceeds limit of ${MAX_PAGE_COUNT}`,
      );
    }

    // Extract text from each page with timeout and failure tracking
    const sections: ParsedSection[] = [];
    const fullTextParts: string[] = []; // Use array to avoid O(n²) string concat
    let failedPages = 0;
    const extractionStartTime = Date.now();

    try {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        // Check timeout
        if (Date.now() - extractionStartTime > MAX_PROCESSING_TIME_MS) {
          throw new Error(
            `Processing timeout after ${pageNum - 1} pages. PDF too large for single invocation.`,
          );
        }

        try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Safely extract text from items with proper type handling
          const pageText = textContent.items
            .map((item: unknown) => {
              if (typeof item === "object" && item !== null && "str" in item) {
                return String((item as { str: unknown }).str);
              }
              return "";
            })
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          sections.push({ pageNumber: pageNum, content: pageText });
          fullTextParts.push(pageText);

          // Log progress for large PDFs
          if (pageNum % PROGRESS_LOG_INTERVAL === 0) {
            console.log(
              `[parse-guide] Processed ${pageNum}/${pdfDoc.numPages} pages`,
            );
          }
        } catch (pageError) {
          failedPages++;
          console.warn(
            `[parse-guide] Error extracting page ${pageNum}:`,
            pageError,
          );
          sections.push({
            pageNumber: pageNum,
            content: `[Error extracting text from page ${pageNum}]`,
          });

          // Check failure threshold
          const failureRatio = failedPages / pageNum;
          if (failureRatio > MAX_FAILURE_RATIO && pageNum >= 5) {
            throw new Error(
              `Too many page extraction failures: ${failedPages}/${pageNum} pages failed (${Math.round(failureRatio * 100)}%)`,
            );
          }
        }
      }
    } finally {
      // Always cleanup PDF document to free memory
      pdfDoc.destroy();
    }

    // Try to get PDF metadata (need to reload for metadata since we destroyed)
    let pdfTitle: string | undefined;
    // Note: We skip metadata extraction since document is destroyed
    // Title will fall back to guide name

    const fullText = fullTextParts.join("\n\n");
    const parsedContent: ParsedContent = {
      fullText,
      sections,
      pageCount: sections.length,
      extractedAt: new Date().toISOString(),
      metadata: {
        title: pdfTitle || guide.name,
      },
    };

    console.log(
      `[parse-guide] Extraction complete: ${sections.length} pages, ${fullText.length} characters${failedPages > 0 ? `, ${failedPages} pages failed` : ""}`,
    );

    // Update database with parsed content
    const { error: updateError } = await supabase
      .from("underwriting_guides")
      .update({
        parsed_content: JSON.stringify(parsedContent),
        parsing_status: "completed",
        parsing_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guideId);

    if (updateError) {
      throw new Error(`Failed to save parsed content: ${updateError.message}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[parse-guide] Completed in ${elapsed}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        guideId,
        pageCount: parsedContent.pageCount,
        sectionCount: parsedContent.sections.length,
        characterCount: parsedContent.fullText.length,
        elapsed,
        note: "PDF text successfully extracted using pdf.js",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[parse-guide] Error:", error);

    if (guideId && supabase) {
      try {
        await supabase
          .from("underwriting_guides")
          .update({
            parsing_status: "failed",
            parsing_error: error.message || "Unknown parsing error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", guideId);
      } catch (updateError) {
        console.error(
          "[parse-guide] Failed to update error status:",
          updateError,
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Parsing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
