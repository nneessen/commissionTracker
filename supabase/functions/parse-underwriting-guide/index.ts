// supabase/functions/parse-underwriting-guide/index.ts
// Edge function to parse uploaded underwriting guide PDFs and extract text content
// Uses unpdf library with explicit PDF.js configuration for Supabase edge environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
// Use exact versions and paths that work in Supabase edge functions
// See: https://github.com/unjs/unpdf/issues/3
import { configureUnPDF, getResolvedPDFJS } from "https://esm.sh/unpdf@0.11.0";
import * as pdfjs from "https://esm.sh/unpdf@0.11.0/dist/pdfjs.mjs";

// CRITICAL: Configure unpdf with explicit PDF.js before any PDF operations
// This MUST be awaited at module level for Supabase edge functions
await configureUnPDF({
  pdfjs: () => pdfjs,
});

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
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB max PDF size
const MIN_VALID_CONTENT_LENGTH = 500; // Minimum chars to consider extraction successful (lowered for short documents like medication lists)
const PLACEHOLDER_PATTERNS = [
  /\[PDF content from .+ - \d+ bytes\]/i,
  /\[Error extracting text/i,
  /^\s*$/,
];

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

    // Validate file size
    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `PDF too large: ${(fileData.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }

    // Convert Blob to Uint8Array for PDF.js
    const pdfBuffer = await fileData.arrayBuffer();
    const pdfData = new Uint8Array(pdfBuffer);

    console.log(
      `[parse-guide] Starting PDF text extraction with unpdf/pdfjs...`,
    );

    // Get the resolved PDF.js instance
    const resolvedPdfJs = await getResolvedPDFJS();
    const { getDocument } = resolvedPdfJs;

    // Load PDF document
    const loadingTask = getDocument(pdfData);
    const pdfDoc = await loadingTask.promise;

    console.log(`[parse-guide] PDF loaded, ${pdfDoc.numPages} pages found`);

    // Check timeout before extraction
    const elapsedBeforeExtraction = Date.now() - startTime;
    if (elapsedBeforeExtraction > MAX_PROCESSING_TIME_MS * 0.5) {
      pdfDoc.destroy();
      throw new Error(
        `PDF loading took too long (${elapsedBeforeExtraction}ms). PDF may be too complex.`,
      );
    }

    // Extract text from each page
    const sections: ParsedSection[] = [];
    const fullTextParts: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract text from items
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

        sections.push({
          pageNumber: pageNum,
          content: pageText,
        });
        fullTextParts.push(pageText);

        // Log progress for large PDFs
        if (pageNum % 10 === 0) {
          console.log(
            `[parse-guide] Processed ${pageNum}/${pdfDoc.numPages} pages`,
          );
        }
      } catch (pageError) {
        console.warn(
          `[parse-guide] Error extracting page ${pageNum}:`,
          pageError,
        );
        sections.push({
          pageNumber: pageNum,
          content: `[Error extracting text from page ${pageNum}]`,
        });
      }
    }

    // Cleanup
    pdfDoc.destroy();

    // Build full text from sections
    const fullText = fullTextParts.filter((t) => t.length > 0).join("\n\n");

    console.log(
      `[parse-guide] Extraction complete: ${sections.length} pages, ${fullText.length} characters`,
    );

    // CRITICAL: Validate extracted content
    const validationResult = validateExtractedContent(fullText, guide.name);
    if (!validationResult.valid) {
      throw new Error(`Content validation failed: ${validationResult.reason}`);
    }

    const parsedContent: ParsedContent = {
      fullText,
      sections,
      pageCount: pdfDoc.numPages,
      extractedAt: new Date().toISOString(),
      metadata: {
        title: guide.name,
      },
    };

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
        note: "PDF text successfully extracted using unpdf",
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

/**
 * Validates that extracted content is real PDF text, not placeholder/stub content
 */
function validateExtractedContent(
  text: string,
  _fileName: string,
): { valid: boolean; reason?: string } {
  // Check minimum length
  if (text.length < MIN_VALID_CONTENT_LENGTH) {
    return {
      valid: false,
      reason: `Extracted text too short (${text.length} chars, minimum ${MIN_VALID_CONTENT_LENGTH}). PDF may be scanned images without OCR, encrypted, or corrupted.`,
    };
  }

  // Check for placeholder patterns
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason: `Content appears to be placeholder/stub text, not actual PDF content`,
      };
    }
  }

  // Check content quality - should have some variety in characters
  const uniqueChars = new Set(text.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 20) {
    return {
      valid: false,
      reason: `Content has very low character variety (${uniqueChars} unique chars). May be corrupted or not text-based.`,
    };
  }

  // Check for reasonable word density (lowered for short documents like medication lists)
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 50) {
    return {
      valid: false,
      reason: `Content has too few words (${words.length}). PDF may be image-based without OCR.`,
    };
  }

  return { valid: true };
}
