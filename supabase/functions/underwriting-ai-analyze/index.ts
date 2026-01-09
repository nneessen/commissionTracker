// supabase/functions/underwriting-ai-analyze/index.ts
// AI-Powered Underwriting Analysis Edge Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConditionData {
  code: string;
  responses: Record<string, string | number | string[]>;
}

interface TobaccoInfo {
  currentUse: boolean;
  type?: string;
  frequency?: string;
  lastUseDate?: string;
}

interface MedicationInfo {
  bpMedCount: number;
  cholesterolMedCount: number;
  otherMedications?: string[];
}

interface AnalysisRequest {
  client: {
    age: number;
    gender: string;
    state: string;
    bmi: number;
  };
  health: {
    conditions: ConditionData[];
    tobacco: TobaccoInfo;
    medications: MedicationInfo;
  };
  coverage: {
    faceAmount: number;
    productTypes: string[];
  };
  decisionTreeId?: string;
  imoId?: string; // For fetching relevant guides
}

// Product underwriting constraints stored in metadata
interface AgeTier {
  minAge: number;
  maxAge: number;
  maxFaceAmount: number;
}

interface ProductUnderwritingConstraints {
  ageTieredFaceAmounts?: {
    tiers: AgeTier[];
  };
  knockoutConditions?: {
    conditionCodes: string[];
  };
  fullUnderwritingThreshold?: {
    faceAmountThreshold: number;
    ageBands?: Array<{
      minAge: number;
      maxAge: number;
      threshold: number;
    }>;
  };
}

interface ProductInfo {
  id: string;
  name: string;
  product_type: string;
  min_age: number | null;
  max_age: number | null;
  min_face_amount: number | null;
  max_face_amount: number | null;
  metadata: ProductUnderwritingConstraints | null;
}

interface CarrierInfo {
  id: string;
  name: string;
  products: ProductInfo[];
}

// Filtered out product tracking
interface FilteredProduct {
  productName: string;
  carrierName: string;
  reason: string;
}

interface GuideInfo {
  id: string;
  name: string;
  carrier_id: string;
  carrier_name: string;
  parsed_content: string | null;
  version: string | null;
}

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

// Token budget constants to prevent cost explosion
const MAX_TOTAL_GUIDE_CHARS = 15000; // Max chars across all guides combined
const MAX_EXCERPT_LENGTH = 1500; // Max chars per excerpt
const MAX_EXCERPTS_PER_GUIDE = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: AnalysisRequest = await req.json();
    const { client, health, coverage, decisionTreeId, imoId } = body;

    // Validate required fields
    if (!client || !client.age || !client.gender || !client.state) {
      throw new Error("Missing required client information");
    }

    // Fetch available carriers and products with underwriting constraints
    const { data: carriers, error: carriersError } = await supabase
      .from("carriers")
      .select(
        `
        id,
        name,
        products (
          id,
          name,
          product_type,
          min_age,
          max_age,
          min_face_amount,
          max_face_amount,
          metadata
        )
      `,
      )
      .eq("is_active", true);

    if (carriersError) {
      throw new Error(`Failed to fetch carriers: ${carriersError.message}`);
    }

    // Get client condition codes for knockout checking
    const clientConditionCodes = health.conditions.map((c) => c.code);

    // Helper function to get max face amount for age from age-tiered limits
    const getMaxFaceAmountForAge = (
      product: ProductInfo,
      clientAge: number,
    ): number | null => {
      const constraints = product.metadata;
      if (constraints?.ageTieredFaceAmounts?.tiers) {
        const tier = constraints.ageTieredFaceAmounts.tiers.find(
          (t) => clientAge >= t.minAge && clientAge <= t.maxAge,
        );
        if (tier) {
          return tier.maxFaceAmount;
        }
      }
      // Fall back to product-level max
      return product.max_face_amount;
    };

    // Helper function to check for knockout conditions
    const hasKnockoutCondition = (
      product: ProductInfo,
      conditionCodes: string[],
    ): string | null => {
      const constraints = product.metadata;
      if (!constraints?.knockoutConditions?.conditionCodes) {
        return null;
      }
      const knockout = conditionCodes.find((code) =>
        constraints.knockoutConditions!.conditionCodes.includes(code),
      );
      return knockout || null;
    };

    // Helper function to get full underwriting threshold
    const getFullUWThreshold = (
      product: ProductInfo,
      clientAge: number,
    ): number | null => {
      const constraints = product.metadata;
      if (!constraints?.fullUnderwritingThreshold) {
        return null;
      }
      const threshold = constraints.fullUnderwritingThreshold;
      // Check age bands first
      if (threshold.ageBands) {
        const band = threshold.ageBands.find(
          (b) => clientAge >= b.minAge && clientAge <= b.maxAge,
        );
        if (band) {
          return band.threshold;
        }
      }
      return threshold.faceAmountThreshold;
    };

    // Track filtered-out products with reasons
    const filteredOutProducts: FilteredProduct[] = [];

    // Filter products by eligibility criteria
    const eligibleCarriers: CarrierInfo[] = (carriers || [])
      .map((carrier) => ({
        id: carrier.id,
        name: carrier.name,
        products: ((carrier.products || []) as ProductInfo[]).filter(
          (product) => {
            // Filter by product type
            if (!coverage.productTypes.includes(product.product_type)) {
              return false; // Don't track - wrong product type is expected
            }

            // Filter by age eligibility
            if (product.min_age && client.age < product.min_age) {
              filteredOutProducts.push({
                productName: product.name,
                carrierName: carrier.name,
                reason: `Client age ${client.age} below minimum ${product.min_age}`,
              });
              return false;
            }
            if (product.max_age && client.age > product.max_age) {
              filteredOutProducts.push({
                productName: product.name,
                carrierName: carrier.name,
                reason: `Client age ${client.age} above maximum ${product.max_age}`,
              });
              return false;
            }

            // Filter by age-tiered face amount limits
            const maxFaceForAge = getMaxFaceAmountForAge(product, client.age);
            if (maxFaceForAge !== null && coverage.faceAmount > maxFaceForAge) {
              filteredOutProducts.push({
                productName: product.name,
                carrierName: carrier.name,
                reason: `Face amount $${coverage.faceAmount.toLocaleString()} exceeds age-tier max $${maxFaceForAge.toLocaleString()}`,
              });
              return false;
            }

            // Filter by knockout conditions
            const knockoutCondition = hasKnockoutCondition(
              product,
              clientConditionCodes,
            );
            if (knockoutCondition) {
              filteredOutProducts.push({
                productName: product.name,
                carrierName: carrier.name,
                reason: `Knockout condition: ${knockoutCondition}`,
              });
              return false;
            }

            // Basic face amount check (for products without age tiers)
            if (
              maxFaceForAge === null &&
              product.min_face_amount &&
              coverage.faceAmount < product.min_face_amount
            ) {
              filteredOutProducts.push({
                productName: product.name,
                carrierName: carrier.name,
                reason: `Face amount below minimum $${product.min_face_amount.toLocaleString()}`,
              });
              return false;
            }

            return true;
          },
        ),
      }))
      .filter((carrier) => carrier.products.length > 0);

    console.log(
      `[underwriting-ai] Found ${eligibleCarriers.length} carriers with eligible products. ` +
        `Filtered out ${filteredOutProducts.length} products for age ${client.age}, ` +
        `face amount $${coverage.faceAmount}, conditions: ${clientConditionCodes.join(", ") || "none"}`,
    );

    // Fetch decision tree rules if specified
    let decisionTreeRules = null;
    if (decisionTreeId) {
      const { data: treeData } = await supabase
        .from("underwriting_decision_trees")
        .select("rules")
        .eq("id", decisionTreeId)
        .single();

      if (treeData) {
        decisionTreeRules = treeData.rules;
      }
    }

    // Fetch parsed guides for eligible carriers
    const carrierGuides: Map<string, GuideInfo[]> = new Map();
    if (imoId && eligibleCarriers.length > 0) {
      const carrierIds = eligibleCarriers.map((c) => c.id);
      const { data: guidesData } = await supabase
        .from("underwriting_guides")
        .select(
          `
          id,
          name,
          carrier_id,
          parsed_content,
          version,
          carriers!underwriting_guides_carrier_id_fkey (name)
        `,
        )
        .eq("imo_id", imoId)
        .eq("parsing_status", "completed")
        .in("carrier_id", carrierIds);

      if (guidesData && guidesData.length > 0) {
        for (const guide of guidesData) {
          const carrierName =
            (guide.carriers as { name: string } | null)?.name || "Unknown";
          const guideInfo: GuideInfo = {
            id: guide.id,
            name: guide.name,
            carrier_id: guide.carrier_id,
            carrier_name: carrierName,
            parsed_content: guide.parsed_content,
            version: guide.version,
          };

          const existing = carrierGuides.get(guide.carrier_id) || [];
          existing.push(guideInfo);
          carrierGuides.set(guide.carrier_id, existing);
        }
        console.log(
          `[underwriting-ai] Found ${guidesData.length} parsed guides for analysis`,
        );
      }
    }

    // Fetch health condition names for context
    const conditionCodes = health.conditions.map((c) => c.code);
    let conditionNames: Record<string, string> = {};
    if (conditionCodes.length > 0) {
      const { data: conditionsData } = await supabase
        .from("underwriting_health_conditions")
        .select("code, name")
        .in("code", conditionCodes);

      if (conditionsData) {
        conditionNames = conditionsData.reduce(
          (acc, c) => ({ ...acc, [c.code]: c.name }),
          {},
        );
      }
    }

    // Build the AI prompt
    const systemPrompt = buildSystemPrompt(
      eligibleCarriers,
      decisionTreeRules,
      carrierGuides,
      health.conditions.map((c) => conditionNames[c.code] || c.code),
      client.age,
    );
    const userPrompt = buildUserPrompt(
      client,
      health,
      coverage,
      conditionNames,
    );

    // Call Claude API
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Parse AI response
    const aiContent =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    // Add full underwriting info to eligible products in recommendations
    const productsRequiringFullUW: string[] = [];
    for (const carrier of eligibleCarriers) {
      for (const product of carrier.products) {
        const threshold = getFullUWThreshold(product, client.age);
        if (threshold !== null && coverage.faceAmount > threshold) {
          productsRequiringFullUW.push(
            `${carrier.name} - ${product.name} (threshold: $${threshold.toLocaleString()})`,
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        filteredProducts: filteredOutProducts,
        fullUnderwritingRequired: productsRequiringFullUW,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Underwriting analysis error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Analysis failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function buildSystemPrompt(
  carriers: CarrierInfo[],
  decisionTreeRules: unknown,
  carrierGuides: Map<string, GuideInfo[]>,
  clientConditions: string[],
  clientAge?: number,
): string {
  const carrierList = carriers
    .map(
      (c) =>
        `- ${c.name} (ID: ${c.id}): Products: ${c.products
          .map((p) => {
            const limits: string[] = [];
            if (p.min_age || p.max_age) {
              limits.push(`ages ${p.min_age || 0}-${p.max_age || 99}`);
            }
            if (p.min_face_amount || p.max_face_amount) {
              const min = p.min_face_amount
                ? `$${p.min_face_amount.toLocaleString()}`
                : "$0";
              const max = p.max_face_amount
                ? `$${p.max_face_amount.toLocaleString()}`
                : "unlimited";
              limits.push(`face ${min}-${max}`);
            }
            // Include full underwriting threshold if present
            const constraints = p.metadata;
            if (constraints?.fullUnderwritingThreshold) {
              let threshold =
                constraints.fullUnderwritingThreshold.faceAmountThreshold;
              // Check for age-specific threshold
              if (clientAge && constraints.fullUnderwritingThreshold.ageBands) {
                const band =
                  constraints.fullUnderwritingThreshold.ageBands.find(
                    (b) => clientAge >= b.minAge && clientAge <= b.maxAge,
                  );
                if (band) {
                  threshold = band.threshold;
                }
              }
              limits.push(`full UW above $${threshold.toLocaleString()}`);
            }
            const limitStr = limits.length > 0 ? ` (${limits.join(", ")})` : "";
            return `${p.name} [${p.product_type}]${limitStr} (ID: ${p.id})`;
          })
          .join(", ")}`,
    )
    .join("\n");

  let rulesSection = "";
  if (decisionTreeRules) {
    rulesSection = `
DECISION TREE RULES (Apply these first when matching):
${JSON.stringify(decisionTreeRules, null, 2)}
`;
  }

  // Build guide context section with token budget enforcement
  let guidesSection = "";
  if (carrierGuides.size > 0) {
    const guideEntries: string[] = [];
    let totalGuideChars = 0;

    for (const [_carrierId, guides] of carrierGuides) {
      // Stop if we've exceeded total budget
      if (totalGuideChars >= MAX_TOTAL_GUIDE_CHARS) {
        console.log(
          `[underwriting-ai] Token budget exhausted at ${totalGuideChars} chars`,
        );
        break;
      }

      for (const guide of guides) {
        if (!guide.parsed_content) continue;

        // Stop if budget exhausted
        if (totalGuideChars >= MAX_TOTAL_GUIDE_CHARS) break;

        // Parse and validate guide content with error handling
        let content: ParsedGuideContent;
        try {
          const parsed = JSON.parse(guide.parsed_content);

          // Validate required structure
          if (!parsed || typeof parsed !== "object") {
            console.warn(
              `[underwriting-ai] Invalid guide content for ${guide.name}: not an object`,
            );
            continue;
          }
          if (!Array.isArray(parsed.sections)) {
            console.warn(
              `[underwriting-ai] Invalid guide content for ${guide.name}: sections not an array`,
            );
            continue;
          }

          content = parsed as ParsedGuideContent;
        } catch (parseError) {
          console.warn(
            `[underwriting-ai] Failed to parse guide content for ${guide.name}:`,
            parseError,
          );
          continue;
        }

        // Extract relevant excerpts with remaining budget
        const remainingBudget = MAX_TOTAL_GUIDE_CHARS - totalGuideChars;
        const relevantExcerpts = extractRelevantExcerpts(
          content,
          clientConditions,
          remainingBudget,
        );

        if (relevantExcerpts.length > 0) {
          const excerptText = relevantExcerpts.join("\n\n");
          totalGuideChars += excerptText.length;

          const versionInfo = guide.version ? ` (v${guide.version})` : "";
          guideEntries.push(
            `### ${guide.carrier_name} - ${guide.name}${versionInfo}\n${excerptText}`,
          );
        }
      }
    }

    if (guideEntries.length > 0) {
      guidesSection = `
CARRIER UNDERWRITING GUIDE EXCERPTS:
Use this carrier-specific information to make more accurate recommendations.
Reference these guides when relevant to increase confidence in your assessment.

${guideEntries.join("\n\n---\n\n")}
`;
    }

    console.log(
      `[underwriting-ai] Total guide content: ${totalGuideChars} chars from ${guideEntries.length} guides`,
    );
  }

  return `You are an expert insurance underwriter assistant specializing in life insurance. Your role is to analyze client health profiles and provide carrier/product recommendations.

AVAILABLE CARRIERS AND PRODUCTS:
${carrierList}
${rulesSection}${guidesSection}
UNDERWRITING GUIDELINES:
1. Consider client age, health conditions, tobacco use, BMI, and medication usage
2. Preferred/Preferred Plus ratings typically require:
   - No tobacco use (at least 3-5 years clean)
   - BMI between 18.5-30
   - No major health conditions or well-controlled conditions
   - Normal blood pressure (1 or fewer BP medications)

3. Standard ratings are typical for:
   - Well-controlled chronic conditions
   - BMI 30-35
   - 1-2 BP medications
   - Former tobacco users (1-3 years clean)

4. Substandard/Table ratings for:
   - Multiple or poorly controlled conditions
   - BMI > 35
   - 3+ BP medications
   - Recent tobacco use
   - Significant health history

5. Decline considerations:
   - Active cancer (except certain early-stage/cured)
   - Severe heart disease
   - End-stage conditions
   - Active substance abuse

RESPONSE FORMAT:
You MUST respond with ONLY a JSON object in this exact format (no other text):
{
  "health_tier": "preferred_plus|preferred|standard_plus|standard|substandard|table_rated|decline",
  "risk_factors": ["factor1", "factor2"],
  "recommendations": [
    {
      "carrier_id": "uuid",
      "carrier_name": "Carrier Name",
      "product_id": "uuid",
      "product_name": "Product Name",
      "expected_rating": "Preferred|Standard|Table 2-4|Decline",
      "confidence": 0.0-1.0,
      "key_factors": ["positive factor 1", "positive factor 2"],
      "concerns": ["concern 1"],
      "priority": 1,
      "guide_references": ["Guide name - relevant section/page if known"]
    }
  ],
  "reasoning": "Brief explanation of analysis (2-3 sentences)"
}

Important:
- Always include at least 1-3 recommendations unless the client should be declined
- Use actual carrier_id and product_id from the AVAILABLE CARRIERS list
- Confidence should reflect how certain you are about the rating
- Priority 1 = best match, higher numbers = lower priority
- Be conservative with ratings - it's better to under-promise
- Include guide_references when your recommendation is informed by carrier guide content`;
}

/**
 * Extract relevant excerpts from parsed guide content based on client conditions.
 * Uses targeted keyword matching to find sections that mention the client's health conditions.
 * Enforces a character budget to prevent token explosion.
 */
function extractRelevantExcerpts(
  content: ParsedGuideContent,
  conditions: string[],
  charBudget: number,
): string[] {
  const excerpts: string[] = [];
  let usedChars = 0;

  // Focus on condition-specific keywords only - avoid overly generic terms
  // that would match nearly every page and explode token usage
  const conditionKeywords = conditions.map((t) => t.toLowerCase());

  // Only include specific underwriting terms, not generic ones like "underwriting", "rating", etc.
  const specificKeywords = [
    "build chart",
    "table rating",
    "decline",
    "tobacco class",
    "nicotine",
    "smoker",
    "non-smoker",
    "bmi chart",
    "height weight",
  ];

  const _searchTerms = [...conditionKeywords, ...specificKeywords];

  // Prioritize sections that match client conditions over generic matches
  const scoredSections = content.sections.map((section) => {
    const sectionLower = section.content.toLowerCase();
    let score = 0;
    const matchedTerms: string[] = [];

    // Higher score for condition matches
    for (const term of conditionKeywords) {
      if (sectionLower.includes(term)) {
        score += 10;
        matchedTerms.push(term);
      }
    }

    // Lower score for specific keyword matches
    for (const term of specificKeywords) {
      if (sectionLower.includes(term)) {
        score += 2;
        matchedTerms.push(term);
      }
    }

    return { section, score, matchedTerms };
  });

  // Sort by relevance score (highest first)
  scoredSections.sort((a, b) => b.score - a.score);

  // Take top relevant sections within budget
  for (const {
    section,
    score,
    matchedTerms: _matchedTerms,
  } of scoredSections) {
    if (excerpts.length >= MAX_EXCERPTS_PER_GUIDE) break;
    if (usedChars >= charBudget) break;
    if (score === 0) break; // No matches, stop

    // Truncate if needed to fit budget
    let excerpt = section.content;
    const remainingBudget = charBudget - usedChars;
    const maxForExcerpt = Math.min(MAX_EXCERPT_LENGTH, remainingBudget);

    if (excerpt.length > maxForExcerpt) {
      excerpt = excerpt.substring(0, maxForExcerpt) + "...";
    }

    excerpts.push(`[Page ${section.pageNumber}]: ${excerpt}`);
    usedChars += excerpt.length;
  }

  return excerpts;
}

function buildUserPrompt(
  client: AnalysisRequest["client"],
  health: AnalysisRequest["health"],
  coverage: AnalysisRequest["coverage"],
  conditionNames: Record<string, string>,
): string {
  const conditionsText =
    health.conditions.length > 0
      ? health.conditions
          .map((c) => {
            const name = conditionNames[c.code] || c.code;
            const details = Object.entries(c.responses)
              .map(
                ([key, val]) =>
                  `  - ${key}: ${Array.isArray(val) ? val.join(", ") : val}`,
              )
              .join("\n");
            return `- ${name}:\n${details}`;
          })
          .join("\n\n")
      : "No health conditions reported";

  const tobaccoText = health.tobacco.currentUse
    ? `Yes - ${health.tobacco.type || "unspecified"} (${health.tobacco.frequency || "frequency unknown"})`
    : "No current tobacco/nicotine use";

  const bmiCategory =
    client.bmi < 18.5
      ? "Underweight"
      : client.bmi < 25
        ? "Normal"
        : client.bmi < 30
          ? "Overweight"
          : client.bmi < 35
            ? "Obese Class I"
            : client.bmi < 40
              ? "Obese Class II"
              : "Obese Class III";

  return `Analyze this client for life insurance underwriting:

CLIENT PROFILE:
- Age: ${client.age}
- Gender: ${client.gender}
- State: ${client.state}
- BMI: ${client.bmi} (${bmiCategory})

HEALTH CONDITIONS:
${conditionsText}

TOBACCO/NICOTINE USE:
${tobaccoText}

MEDICATIONS:
- Blood Pressure Medications: ${health.medications.bpMedCount}
- Cholesterol Medications: ${health.medications.cholesterolMedCount}

COVERAGE REQUEST:
- Face Amount: $${coverage.faceAmount.toLocaleString()}
- Product Types: ${coverage.productTypes.join(", ")}

Based on this profile, provide your underwriting assessment and carrier recommendations in the required JSON format.`;
}
