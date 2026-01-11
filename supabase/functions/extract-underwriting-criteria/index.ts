// supabase/functions/extract-underwriting-criteria/index.ts
// AI-powered extraction of structured underwriting criteria from parsed PDF guides

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Request types
interface ExtractionRequest {
  guideId: string;
  productId?: string; // Optional: extract criteria for specific product
}

// Parsed content from PDF guide
interface ParsedGuideContent {
  fullText: string;
  sections: Array<{ pageNumber: number; content: string }>;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

// Extracted criteria schema (matches database JSONB structure)
interface ExtractedCriteria {
  ageLimits?: {
    minIssueAge: number;
    maxIssueAge: number;
  };
  faceAmountLimits?: {
    minimum: number;
    maximum: number;
    ageTiers?: Array<{
      minAge: number;
      maxAge: number;
      maxFaceAmount: number;
    }>;
  };
  knockoutConditions?: {
    conditionCodes: string[];
    descriptions: Array<{
      code: string;
      name: string;
      severity: string;
    }>;
  };
  buildRequirements?: {
    type: "height_weight" | "bmi";
    preferredPlusBmiMax?: number;
    preferredBmiMax?: number;
    standardBmiMax?: number;
  };
  tobaccoRules?: {
    smokingClassifications: Array<{
      classification: string;
      requiresCleanMonths: number;
    }>;
    nicotineTestRequired: boolean;
  };
  medicationRestrictions?: {
    insulin?: { allowed: boolean; ratingImpact?: string };
    bloodThinners?: { allowed: boolean };
    opioids?: { allowed: boolean; timeSinceUse?: number };
    bpMedications?: { maxCount: number };
    antidepressants?: { allowed: boolean };
  };
  stateAvailability?: {
    availableStates: string[];
    unavailableStates: string[];
  };
}

// Source excerpt for audit trail
interface SourceExcerpt {
  field: string;
  excerpt: string;
  pageNumber?: number;
}

// Token limits
const MAX_CHUNK_CHARS = 40000; // ~10K tokens per chunk
const MAX_TOTAL_CHUNKS = 3; // Limit API calls for cost control
const CHUNK_OVERLAP_CHARS = 500; // Overlap for context continuity

// Content validation constants
const MIN_VALID_CONTENT_LENGTH = 5000; // Minimum chars for meaningful extraction
const PLACEHOLDER_PATTERNS = [
  /\[PDF content from .+ - \d+ bytes\]/i,
  /\[Error extracting text/i,
];
const MIN_UNIQUE_CHARS = 20; // Minimum character variety
const MIN_WORD_COUNT = 500; // Minimum words for meaningful extraction

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let criteriaId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    console.log("[extract-criteria] Function invoked");

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
    const body: ExtractionRequest = await req.json();
    const { guideId, productId } = body;

    if (!guideId) {
      throw new Error("Missing guideId parameter");
    }

    console.log(`[extract-criteria] Starting extraction for guide: ${guideId}`);

    // Authorization check - verify user is IMO admin/owner
    const { data: userData, error: userError } =
      await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[extract-criteria] User auth error:", userError);
      throw new Error("Unauthorized: Could not verify user identity");
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("imo_id, roles")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !userProfile?.imo_id) {
      console.error("[extract-criteria] Profile error:", profileError);
      throw new Error("Unauthorized: User profile not found or has no IMO");
    }

    // Check for admin role
    const allowedRoles = ["admin", "super-admin"];
    const hasAllowedRole = userProfile.roles?.some((r: string) =>
      allowedRoles.includes(r),
    );
    if (!hasAllowedRole) {
      throw new Error("Unauthorized: Only admins can extract criteria");
    }

    const userImoId = userProfile.imo_id;
    console.log(
      `[extract-criteria] User IMO: ${userImoId}, Roles: ${userProfile.roles?.join(", ")}`,
    );

    // Fetch guide record with parsed content
    const { data: guide, error: guideError } = await supabase
      .from("underwriting_guides")
      .select("id, name, carrier_id, imo_id, parsing_status, parsed_content")
      .eq("id", guideId)
      .eq("imo_id", userImoId)
      .single();

    if (guideError || !guide) {
      console.error("[extract-criteria] Guide fetch error:", guideError);
      throw new Error("Guide not found or access denied");
    }

    // Validate guide is parsed
    if (guide.parsing_status !== "completed") {
      throw new Error(
        `Guide has not been parsed yet. Status: ${guide.parsing_status}`,
      );
    }

    if (!guide.parsed_content) {
      throw new Error("Guide has no parsed content");
    }

    console.log(`[extract-criteria] Found guide: ${guide.name}`);

    // Parse the guide content
    let parsedContent: ParsedGuideContent;
    try {
      parsedContent = JSON.parse(guide.parsed_content);
    } catch {
      throw new Error("Invalid parsed content format");
    }

    if (!parsedContent.fullText || parsedContent.fullText.length === 0) {
      throw new Error("Guide has no extracted text");
    }

    console.log(
      `[extract-criteria] Guide content: ${parsedContent.fullText.length} chars, ${parsedContent.pageCount} pages`,
    );

    // CRITICAL: Validate input content quality before sending to AI
    const contentValidation = validateInputContent(parsedContent.fullText);
    if (!contentValidation.valid) {
      throw new Error(
        `Guide content invalid: ${contentValidation.reason}. Re-parse the guide to extract actual PDF text.`,
      );
    }

    // Create extraction record with "processing" status
    const { data: criteriaRecord, error: insertError } = await supabase
      .from("carrier_underwriting_criteria")
      .insert({
        imo_id: userImoId,
        carrier_id: guide.carrier_id,
        guide_id: guideId,
        product_id: productId || null,
        extraction_status: "processing",
        criteria: {},
        source_excerpts: [],
      })
      .select("id")
      .single();

    if (insertError || !criteriaRecord) {
      console.error("[extract-criteria] Insert error:", insertError);
      throw new Error(
        `Failed to create extraction record: ${insertError?.message}`,
      );
    }

    criteriaId = criteriaRecord.id;
    console.log(`[extract-criteria] Created criteria record: ${criteriaId}`);

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Chunk the text if too large
    const chunks = chunkText(
      parsedContent.fullText,
      parsedContent.sections,
      MAX_CHUNK_CHARS,
      CHUNK_OVERLAP_CHARS,
    );

    console.log(`[extract-criteria] Split into ${chunks.length} chunks`);

    // Limit chunks to control cost
    const chunksToProcess = chunks.slice(0, MAX_TOTAL_CHUNKS);
    if (chunks.length > MAX_TOTAL_CHUNKS) {
      console.warn(
        `[extract-criteria] Large document: processing only first ${MAX_TOTAL_CHUNKS} of ${chunks.length} chunks`,
      );
    }

    // Process each chunk and merge results
    const allExtractions: ExtractedCriteria[] = [];
    const allSourceExcerpts: SourceExcerpt[] = [];
    let totalConfidence = 0;

    for (let i = 0; i < chunksToProcess.length; i++) {
      const chunk = chunksToProcess[i];
      console.log(
        `[extract-criteria] Processing chunk ${i + 1}/${chunksToProcess.length}`,
      );

      const result = await extractFromChunk(
        anthropic,
        chunk.text,
        chunk.pageRange,
        guide.name,
      );

      if (result.criteria) {
        allExtractions.push(result.criteria);
      }
      if (result.sourceExcerpts) {
        allSourceExcerpts.push(...result.sourceExcerpts);
      }
      totalConfidence += result.confidence || 0;
    }

    // Merge all chunk extractions
    const mergedCriteria = mergeExtractedCriteria(allExtractions);
    const avgConfidence =
      chunksToProcess.length > 0 ? totalConfidence / chunksToProcess.length : 0;

    console.log(
      `[extract-criteria] Extraction complete. Confidence: ${(avgConfidence * 100).toFixed(1)}%`,
    );

    // Update criteria record with results
    const { error: updateError } = await supabase
      .from("carrier_underwriting_criteria")
      .update({
        extraction_status: "completed",
        extraction_confidence: avgConfidence,
        extracted_at: new Date().toISOString(),
        criteria: mergedCriteria,
        source_excerpts: allSourceExcerpts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", criteriaId);

    if (updateError) {
      throw new Error(
        `Failed to save extracted criteria: ${updateError.message}`,
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[extract-criteria] Completed in ${elapsed}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        criteriaId,
        guideId,
        confidence: avgConfidence,
        chunksProcessed: chunksToProcess.length,
        totalChunks: chunks.length,
        elapsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[extract-criteria] Error:", error);

    // Update record to failed status if we created one
    if (criteriaId && supabase) {
      try {
        await supabase
          .from("carrier_underwriting_criteria")
          .update({
            extraction_status: "failed",
            extraction_error: error.message || "Unknown extraction error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", criteriaId);
      } catch (updateError) {
        console.error(
          "[extract-criteria] Failed to update error status:",
          updateError,
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Extraction failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Chunk large text into smaller pieces for API processing
 */
interface TextChunk {
  text: string;
  pageRange: { start: number; end: number };
}

function chunkText(
  fullText: string,
  sections: Array<{ pageNumber: number; content: string }>,
  maxChars: number,
  overlapChars: number,
): TextChunk[] {
  // If small enough, return as single chunk
  if (fullText.length <= maxChars) {
    const pageStart = sections.length > 0 ? sections[0].pageNumber : 1;
    const pageEnd =
      sections.length > 0 ? sections[sections.length - 1].pageNumber : 1;
    return [{ text: fullText, pageRange: { start: pageStart, end: pageEnd } }];
  }

  // Build chunks by accumulating pages
  const chunks: TextChunk[] = [];
  let currentText = "";
  let chunkStartPage = 1;
  let currentPage = 1;

  for (const section of sections) {
    currentPage = section.pageNumber;

    if (
      currentText.length + section.content.length > maxChars &&
      currentText.length > 0
    ) {
      // Save current chunk
      chunks.push({
        text: currentText,
        pageRange: { start: chunkStartPage, end: currentPage - 1 },
      });

      // Start new chunk with overlap from end of previous
      const overlap = currentText.slice(-overlapChars);
      currentText = overlap + section.content;
      chunkStartPage = currentPage;
    } else {
      currentText += (currentText ? "\n\n" : "") + section.content;
    }
  }

  // Add final chunk
  if (currentText.length > 0) {
    chunks.push({
      text: currentText,
      pageRange: { start: chunkStartPage, end: currentPage },
    });
  }

  return chunks;
}

/**
 * Extract criteria from a single text chunk using Claude API
 */
async function extractFromChunk(
  anthropic: Anthropic,
  text: string,
  pageRange: { start: number; end: number },
  guideName: string,
): Promise<{
  criteria: ExtractedCriteria | null;
  sourceExcerpts: SourceExcerpt[];
  confidence: number;
}> {
  const systemPrompt = buildExtractionSystemPrompt();
  const userPrompt = buildExtractionUserPrompt(text, guideName, pageRange);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[extract-criteria] No JSON found in response");
    return { criteria: null, sourceExcerpts: [], confidence: 0 };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      criteria: parsed.criteria || null,
      sourceExcerpts: (parsed.sourceExcerpts || []).map((e: SourceExcerpt) => ({
        ...e,
        pageNumber: e.pageNumber || pageRange.start,
      })),
      confidence: parsed.confidence || 0.5,
    };
  } catch (parseError) {
    console.error("[extract-criteria] JSON parse error:", parseError);
    return { criteria: null, sourceExcerpts: [], confidence: 0 };
  }
}

/**
 * Build system prompt for criteria extraction
 */
function buildExtractionSystemPrompt(): string {
  return `You are an expert insurance underwriting analyst specializing in extracting structured data from carrier underwriting guides.

Your task is to extract specific underwriting criteria from insurance carrier guide documents and return them in a structured JSON format.

EXTRACTION TARGETS:
1. AGE LIMITS - Minimum and maximum issue ages for policy issuance
2. FACE AMOUNT LIMITS - Minimum/maximum coverage amounts, including age-tiered limits
3. KNOCKOUT CONDITIONS - Conditions that automatically decline coverage (cancer, HIV, etc.)
4. BUILD REQUIREMENTS - BMI or height/weight chart requirements by rating class
5. TOBACCO RULES - Smoking classifications and clean period requirements
6. MEDICATION RESTRICTIONS - Rules for insulin, blood thinners, opioids, BP meds, antidepressants
7. STATE AVAILABILITY - States where the product is available or unavailable

EXTRACTION GUIDELINES:
- Only extract information explicitly stated in the document
- Use null for fields where information is not found
- Include confidence level (0-1) based on clarity of source text
- Capture source excerpts for audit trail
- Use standard condition codes where possible (e.g., "cancer", "diabetes_type1", "hiv_aids")

RESPONSE FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "criteria": {
    "ageLimits": { "minIssueAge": number, "maxIssueAge": number } | null,
    "faceAmountLimits": {
      "minimum": number,
      "maximum": number,
      "ageTiers": [{ "minAge": number, "maxAge": number, "maxFaceAmount": number }] | null
    } | null,
    "knockoutConditions": {
      "conditionCodes": ["string"],
      "descriptions": [{ "code": "string", "name": "string", "severity": "decline|table_rating|postpone" }]
    } | null,
    "buildRequirements": {
      "type": "height_weight" | "bmi",
      "preferredPlusBmiMax": number | null,
      "preferredBmiMax": number | null,
      "standardBmiMax": number | null
    } | null,
    "tobaccoRules": {
      "smokingClassifications": [{ "classification": "string", "requiresCleanMonths": number }],
      "nicotineTestRequired": boolean
    } | null,
    "medicationRestrictions": {
      "insulin": { "allowed": boolean, "ratingImpact": "string" } | null,
      "bloodThinners": { "allowed": boolean } | null,
      "opioids": { "allowed": boolean, "timeSinceUse": number } | null,
      "bpMedications": { "maxCount": number } | null,
      "antidepressants": { "allowed": boolean } | null
    } | null,
    "stateAvailability": {
      "availableStates": ["string"],
      "unavailableStates": ["string"]
    } | null
  },
  "sourceExcerpts": [
    { "field": "string", "excerpt": "string", "pageNumber": number }
  ],
  "confidence": 0.0-1.0
}

IMPORTANT:
- Return ONLY the JSON object, no other text
- Use standard 2-letter state abbreviations (NY, CA, TX)
- Face amounts should be numeric without currency symbols
- BMI limits should be decimal numbers
- Clean periods in months (12 = 1 year, 36 = 3 years)
- Set confidence based on how clearly the information was stated`;
}

/**
 * Build user prompt with document content
 */
function buildExtractionUserPrompt(
  text: string,
  guideName: string,
  pageRange: { start: number; end: number },
): string {
  return `Extract underwriting criteria from this insurance carrier guide document.

DOCUMENT: ${guideName}
PAGES: ${pageRange.start}-${pageRange.end}

CONTENT:
${text}

---

Analyze the above content and extract all underwriting criteria you can find. Return the structured JSON response.`;
}

/**
 * Merge criteria extracted from multiple chunks
 */
function mergeExtractedCriteria(
  extractions: ExtractedCriteria[],
): ExtractedCriteria {
  if (extractions.length === 0) return {};
  if (extractions.length === 1) return extractions[0];

  // Merge strategy: take first non-null value for each field
  // For arrays, concatenate and deduplicate
  const merged: ExtractedCriteria = {};

  for (const criteria of extractions) {
    // Age limits - take first found
    if (!merged.ageLimits && criteria.ageLimits) {
      merged.ageLimits = criteria.ageLimits;
    }

    // Face amount limits - take first found
    if (!merged.faceAmountLimits && criteria.faceAmountLimits) {
      merged.faceAmountLimits = criteria.faceAmountLimits;
    }

    // Knockout conditions - merge arrays
    if (criteria.knockoutConditions) {
      if (!merged.knockoutConditions) {
        merged.knockoutConditions = {
          conditionCodes: [],
          descriptions: [],
        };
      }
      const existingCodes = new Set(merged.knockoutConditions.conditionCodes);
      for (const code of criteria.knockoutConditions.conditionCodes || []) {
        if (!existingCodes.has(code)) {
          merged.knockoutConditions.conditionCodes.push(code);
          existingCodes.add(code);
        }
      }
      const existingDescCodes = new Set(
        merged.knockoutConditions.descriptions.map((d) => d.code),
      );
      for (const desc of criteria.knockoutConditions.descriptions || []) {
        if (!existingDescCodes.has(desc.code)) {
          merged.knockoutConditions.descriptions.push(desc);
          existingDescCodes.add(desc.code);
        }
      }
    }

    // Build requirements - take first found
    if (!merged.buildRequirements && criteria.buildRequirements) {
      merged.buildRequirements = criteria.buildRequirements;
    }

    // Tobacco rules - take first found
    if (!merged.tobaccoRules && criteria.tobaccoRules) {
      merged.tobaccoRules = criteria.tobaccoRules;
    }

    // Medication restrictions - merge individual restrictions
    if (criteria.medicationRestrictions) {
      if (!merged.medicationRestrictions) {
        merged.medicationRestrictions = {};
      }
      if (
        !merged.medicationRestrictions.insulin &&
        criteria.medicationRestrictions.insulin
      ) {
        merged.medicationRestrictions.insulin =
          criteria.medicationRestrictions.insulin;
      }
      if (
        !merged.medicationRestrictions.bloodThinners &&
        criteria.medicationRestrictions.bloodThinners
      ) {
        merged.medicationRestrictions.bloodThinners =
          criteria.medicationRestrictions.bloodThinners;
      }
      if (
        !merged.medicationRestrictions.opioids &&
        criteria.medicationRestrictions.opioids
      ) {
        merged.medicationRestrictions.opioids =
          criteria.medicationRestrictions.opioids;
      }
      if (
        !merged.medicationRestrictions.bpMedications &&
        criteria.medicationRestrictions.bpMedications
      ) {
        merged.medicationRestrictions.bpMedications =
          criteria.medicationRestrictions.bpMedications;
      }
      if (
        !merged.medicationRestrictions.antidepressants &&
        criteria.medicationRestrictions.antidepressants
      ) {
        merged.medicationRestrictions.antidepressants =
          criteria.medicationRestrictions.antidepressants;
      }
    }

    // State availability - merge arrays
    if (criteria.stateAvailability) {
      if (!merged.stateAvailability) {
        merged.stateAvailability = {
          availableStates: [],
          unavailableStates: [],
        };
      }
      const existingAvailable = new Set(
        merged.stateAvailability.availableStates,
      );
      const existingUnavailable = new Set(
        merged.stateAvailability.unavailableStates,
      );

      for (const state of criteria.stateAvailability.availableStates || []) {
        if (!existingAvailable.has(state)) {
          merged.stateAvailability.availableStates.push(state);
          existingAvailable.add(state);
        }
      }
      for (const state of criteria.stateAvailability.unavailableStates || []) {
        if (!existingUnavailable.has(state)) {
          merged.stateAvailability.unavailableStates.push(state);
          existingUnavailable.add(state);
        }
      }
    }
  }

  return merged;
}

/**
 * Validates that guide content is real extracted text, not placeholder/stub content
 * This prevents wasting AI tokens on garbage input
 */
function validateInputContent(text: string): {
  valid: boolean;
  reason?: string;
} {
  // Check minimum length
  if (text.length < MIN_VALID_CONTENT_LENGTH) {
    return {
      valid: false,
      reason: `Content too short (${text.length} chars, minimum ${MIN_VALID_CONTENT_LENGTH})`,
    };
  }

  // Check for placeholder patterns
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason:
          "Content appears to be placeholder/stub text, not actual PDF content",
      };
    }
  }

  // Check content quality - should have some variety in characters
  const uniqueChars = new Set(text.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < MIN_UNIQUE_CHARS) {
    return {
      valid: false,
      reason: `Content has very low character variety (${uniqueChars} unique chars)`,
    };
  }

  // Check for reasonable word density
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < MIN_WORD_COUNT) {
    return {
      valid: false,
      reason: `Content has too few words (${words.length}, minimum ${MIN_WORD_COUNT})`,
    };
  }

  return { valid: true };
}
