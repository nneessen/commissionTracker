// scripts/seed-apriority-term-module.ts
// Seed script: aPriority Term Life Insurance training module
// Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-apriority-term-module.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = process.env.USER_ID;
const IMO_ID = process.env.IMO_ID;

if (!USER_ID || !IMO_ID) {
  console.error("ERROR: USER_ID and IMO_ID env vars are required.");
  console.error(
    "Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-apriority-term-module.ts",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types for seed data
// ---------------------------------------------------------------------------
interface ContentBlockSeed {
  content_type: string;
  title: string;
  rich_text_content?: string;
  script_prompt_text?: string;
  script_prompt_instructions?: string;
  external_url?: string;
  external_url_label?: string;
}

interface QuizOptionSeed {
  option_text: string;
  is_correct: boolean;
}

interface QuizQuestionSeed {
  question_type: string;
  question_text: string;
  explanation: string;
  points: number;
  options: QuizOptionSeed[];
}

interface QuizSeed {
  pass_threshold: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  shuffle_options: boolean;
  xp_bonus_perfect: number;
  time_limit_minutes?: number;
  questions: QuizQuestionSeed[];
}

interface LessonSeed {
  title: string;
  lesson_type: string;
  estimated_duration_minutes: number;
  xp_reward: number;
  description: string;
  is_required: boolean;
  content_blocks?: ContentBlockSeed[];
  quiz?: QuizSeed;
}

// ---------------------------------------------------------------------------
// Module metadata
// ---------------------------------------------------------------------------
const MODULE_TITLE = "aPriority Term Life Insurance";
const MODULE_DESCRIPTION =
  "Master Baltimore Life's aPriority Term product line — simplified and fully underwritten term options, riders (WOP, ADB, CIB, DI, ADBR), medical question sets, application process, and the Protector Level Term product.";
const MODULE_CATEGORY = "product_knowledge";
const MODULE_DIFFICULTY = "beginner";
const MODULE_DURATION = 60;
const MODULE_XP = 225;
const MODULE_TAGS = [
  "baltimore-life",
  "aPriority",
  "term",
  "simplified-underwriting",
  "protector-level-term",
];

// ---------------------------------------------------------------------------
// Lesson data
// ---------------------------------------------------------------------------
const LESSONS: LessonSeed[] = [
  // =========================================================================
  // LESSON 1: aPriority Term Overview & Market Positioning (content)
  // =========================================================================
  {
    title: "aPriority Term Overview & Market Positioning",
    lesson_type: "content",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Learn the key advantages of aPriority Term and which market segments it serves best.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Product Advantages",
        rich_text_content: `<h2>aPriority Term — Product Advantages</h2>
<p>Baltimore Life's aPriority Term is a <strong>simplified issue term life insurance product</strong> designed for fast, accessible coverage.</p>
<h3>Key Features</h3>
<ul>
<li><strong>Guaranteed level death benefit</strong> — coverage amount never decreases during the term</li>
<li><strong>Level premiums</strong> — monthly payment stays the same for the entire term period</li>
<li><strong>Conversion option</strong> — convert to permanent coverage without new medical underwriting</li>
<li><strong>Multiple term lengths:</strong> 10, 15, 20, and 30-year terms available</li>
<li><strong>Simplified underwriting</strong> — no paramedical exam required for qualifying face amounts</li>
<li><strong>Fast issue</strong> — streamlined application process via INSpeed NOW</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Market Positioning",
        rich_text_content: `<h2>Who Is This Product For?</h2>
<table>
<thead><tr><th>Market Segment</th><th>Why aPriority Term Fits</th></tr></thead>
<tbody>
<tr><td><strong>Young Families</strong></td><td>Affordable protection during child-rearing years; 20 or 30-year terms match mortgage and education timelines</td></tr>
<tr><td><strong>Established Families</strong></td><td>Bridge coverage for remaining mortgage, college funding, or income replacement until retirement</td></tr>
<tr><td><strong>Pre-Retired (50–65)</strong></td><td>10 or 15-year terms to cover final working years and transition to retirement savings</td></tr>
<tr><td><strong>Business Owners</strong></td><td>Key person coverage, loan protection, or buy-sell funding at competitive term rates</td></tr>
</tbody>
</table>
<blockquote><strong>Selling point:</strong> aPriority Term's simplified underwriting means faster approvals and no needles — a major advantage for clients who are hesitant about medical exams.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 2: Simplified vs. Fully Underwritten (content)
  // =========================================================================
  {
    title: "Simplified vs. Fully Underwritten",
    lesson_type: "content",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Understand the differences between aPriority Simplified and Protector Level Term — face amounts, UW classes, and premium classes.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "aPriority Simplified vs. Protector Level Term",
        rich_text_content: `<h2>Two Products, One Family</h2>
<p>Baltimore Life offers two term products under the aPriority umbrella:</p>
<table>
<thead><tr><th>Feature</th><th>aPriority Simplified</th><th>Protector Level Term</th></tr></thead>
<tbody>
<tr><td><strong>Underwriting</strong></td><td>Simplified issue (medical questions only)</td><td>Fully underwritten (labs, paramed possible)</td></tr>
<tr><td><strong>Face Amounts</strong></td><td>$25,000 – $150,000</td><td>$100,000+</td></tr>
<tr><td><strong>UW Classes</strong></td><td>Standard, Special</td><td>Preferred Plus, Preferred, Standard</td></tr>
<tr><td><strong>Premium Classes</strong></td><td>Nontobacco, Tobacco</td><td>Nontobacco, Tobacco</td></tr>
<tr><td><strong>Best For</strong></td><td>Quick issue, lower face amounts, exam-averse clients</td><td>Higher coverage needs, healthier clients wanting best rates</td></tr>
</tbody>
</table>`,
      },
      {
        content_type: "rich_text",
        title: "Product Details",
        rich_text_content: `<h2>Product Details — aPriority Simplified</h2>
<ul>
<li><strong>Face amounts:</strong> $25,000 minimum — $150,000 maximum</li>
<li><strong>UW classes:</strong> Standard (Standard–Table 4 risks) and Special (Table 5–8 risks, not available ages 15–17)</li>
<li><strong>Premium classes:</strong> Nontobacco and Tobacco</li>
<li><strong>Issue ages:</strong> Standard: 15–75, Special: 18–75</li>
<li><strong>Paramed required:</strong> Ages 61–75 with face amounts $75,001–$150,000 — agent must order paramedical exam and urine specimen</li>
<li><strong>Male/Female rates</strong> — gender-distinct pricing</li>
<li><strong>Non-participating</strong> (no dividends)</li>
</ul>
<h2>Product Details — Protector Level Term</h2>
<ul>
<li><strong>Face amounts:</strong> $100,001 minimum — no explicit maximum ($500,000 max for 10-Year Term only)</li>
<li><strong>UW classes:</strong> Preferred Plus, Preferred, Standard Table P</li>
<li><strong>Premium classes:</strong> Nontobacco, Tobacco</li>
<li><strong>Premium bands:</strong> $50,000 / $100,001 / $250,000 / $500,000 / $1,000,000 (10-year term uses $50K, $100,001, and $250K bands only)</li>
<li><strong>Full underwriting</strong> — may include paramed, labs, Rx check</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 3: Product Details Deep Dive (content)
  // =========================================================================
  {
    title: "Product Details Deep Dive",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Master issue age limits, premium payment modes, conversion features, and the INSpeed NOW application process.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Maximum Issue Ages by Term Length",
        rich_text_content: `<h2>Maximum Issue Ages by Term Length</h2>
<table>
<thead><tr><th>Term Length</th><th>Max Issue Age (Nontobacco)</th><th>Max Issue Age (Tobacco)</th></tr></thead>
<tbody>
<tr><td><strong>10-Year Term</strong></td><td>75</td><td>75</td></tr>
<tr><td><strong>15-Year Term</strong></td><td>70</td><td>70</td></tr>
<tr><td><strong>20-Year Term</strong></td><td>65</td><td>65</td></tr>
<tr><td><strong>30-Year Term</strong></td><td>55</td><td>50</td></tr>
</tbody>
</table>
<blockquote><strong>Key detail:</strong> Note the 30-year term difference — nontobacco max age is 55, but tobacco max age is only 50. This is a common trip-up point.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Premium Payment Modes",
        rich_text_content: `<h2>Premium Payment Modes</h2>
<h3>EFT (Electronic Funds Transfer)</h3>
<ul>
<li>Monthly, quarterly, semi-annual, or annual payment options</li>
<li><strong>Preferred method</strong> — lower mode cost factor</li>
<li>Automatic draft from bank account</li>
</ul>
<h3>Direct Bill</h3>
<ul>
<li>Monthly, quarterly, semi-annual, or annual</li>
<li>Paper bill sent to policyholder</li>
<li>Slightly higher mode factor than EFT</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Conversion Feature",
        rich_text_content: `<h2>Conversion Feature</h2>
<p>One of the most valuable features of aPriority Term:</p>
<ul>
<li><strong>Convert to permanent coverage</strong> without new medical underwriting</li>
<li><strong>Conversion window:</strong> Available through the end of the level premium period or age 70, whichever comes first</li>
<li><strong>Minimum hold period:</strong> Policy must be in force for at least <strong>5 years</strong> before conversion</li>
<li>Convert to any Baltimore Life permanent product available at the time of conversion</li>
<li>New permanent policy uses the insured's <strong>attained age</strong> at time of conversion for premium calculation</li>
</ul>
<blockquote><strong>Selling point:</strong> "You're not locked in forever — if your needs change, you can convert this to permanent coverage without having to requalify medically."</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Application Process — INSpeed NOW",
        rich_text_content: `<h2>Application Process — INSpeed NOW</h2>
<p>Baltimore Life uses the <strong>INSpeed NOW</strong> platform for all application submissions. Three submission methods:</p>
<ol>
<li><strong>Online via INSpeed NOW portal</strong> — preferred method, fastest processing</li>
<li><strong>Email submission</strong> — scan and email completed application</li>
<li><strong>Fax submission</strong> — traditional fax to home office</li>
</ol>
<h3>Key Process Points</h3>
<ul>
<li>All simplified applications processed through the INSpeed NOW system</li>
<li>Instant decision possible for qualifying applications</li>
<li>Agent receives real-time status updates</li>
<li>E-delivery available for policy documents</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 4: Medical Questions & Underwriting Grid (practice)
  // =========================================================================
  {
    title: "Medical Questions & Underwriting Grid",
    lesson_type: "practice",
    estimated_duration_minutes: 6,
    xp_reward: 25,
    description:
      "Master the four medical question sets (A/B/C/D) and practice determining which set applies to each client.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Medical Question Sets Overview",
        rich_text_content: `<h2>Medical Question Sets — A, B, C, D</h2>
<p>aPriority uses <strong>four tiers of medical questions</strong> based on the applicant's age and requested face amount. The grid applies to both simplified and fully underwritten products.</p>
<table>
<thead><tr><th>Age</th><th>$15K–$25K</th><th>$25K–$75K</th><th>$75K–$150K</th><th>&gt;$150K (Fully UW)</th></tr></thead>
<tbody>
<tr><td><strong>0–17</strong></td><td>A</td><td>A</td><td>A</td><td>D</td></tr>
<tr><td><strong>18–49</strong></td><td>B</td><td>B</td><td>B</td><td>D</td></tr>
<tr><td><strong>50–60</strong></td><td>C</td><td>C</td><td>C</td><td>D</td></tr>
<tr><td><strong>61–80</strong></td><td>C</td><td>C</td><td>C + 3 Questions</td><td>D</td></tr>
</tbody>
</table>
<h3>Key Rules</h3>
<ul>
<li><strong>Set A</strong> — fewest questions (basic health history, juvenile applicants)</li>
<li><strong>Set B</strong> — additional health questions for adult applicants ages 18–49</li>
<li><strong>Set C</strong> — expanded age-specific questions for ages 50+</li>
<li><strong>Set D</strong> — most comprehensive set (fully underwritten, face amounts &gt;$150K)</li>
<li><strong>Ages 61–80, $75K–$150K:</strong> Set C <strong>plus 3 additional questions</strong></li>
<li><strong>Ages 61–75, $75,001–$150K:</strong> Agent must order a <strong>paramedical exam and urine specimen</strong></li>
</ul>`,
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Age 35, $50K Simplified",
        script_prompt_text: `Your client is 35 years old and applying for $50,000 of aPriority Simplified term coverage. Which medical question set applies to them?`,
        script_prompt_instructions:
          "Answer: Set B. The client is age 35 (within the 18–49 range). Per the grid, ages 18–49 use Set B for all simplified face amounts ($15K–$150K). No paramedical exam required since they're under age 61.",
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Age 63, $100K",
        script_prompt_text: `Your client is 63 years old and wants $100,000 of aPriority Simplified coverage. Which medical question set applies, and are there any additional requirements?`,
        script_prompt_instructions:
          "Answer: Set C plus 3 additional questions. Age 63 falls in the 61–80 range, and $100K is in the $75K–$150K column, which requires Set C PLUS 3 additional questions. Additionally, since the client is ages 61–75 with a face amount of $75,001–$150,000, the agent must order a paramedical exam and urine specimen.",
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Product Knowledge Check (quiz)
  // =========================================================================
  {
    title: "Product Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Test your understanding of aPriority Term product details, issue ages, conversion features, and medical question sets.",
    is_required: true,
    quiz: {
      pass_threshold: 70,
      max_attempts: 3,
      shuffle_questions: true,
      show_correct_answers: true,
      shuffle_options: true,
      xp_bonus_perfect: 10,
      questions: [
        {
          question_type: "multiple_choice",
          question_text:
            "What is the minimum face amount for aPriority Simplified?",
          explanation:
            "aPriority Simplified has a minimum face amount of $25,000 and a maximum of $150,000.",
          points: 1,
          options: [
            { option_text: "$10,000", is_correct: false },
            { option_text: "$25,000", is_correct: true },
            { option_text: "$50,000", is_correct: false },
            { option_text: "$100,000", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the maximum issue age for a 30-year term with tobacco use?",
          explanation:
            "30-year term max issue age is 55 for nontobacco but only 50 for tobacco users.",
          points: 1,
          options: [
            { option_text: "45", is_correct: false },
            { option_text: "50", is_correct: true },
            { option_text: "55", is_correct: false },
            { option_text: "60", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The aPriority Term conversion feature requires the policy to be in force for at least 5 years.",
          explanation:
            "The minimum hold period before conversion is 5 years. Conversion is available through the end of the level period or age 70.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the maximum face amount for aPriority Simplified?",
          explanation:
            "aPriority Simplified maxes out at $150,000. For higher amounts, use Protector Level Term ($100K+).",
          points: 1,
          options: [
            { option_text: "$100,000", is_correct: false },
            { option_text: "$150,000", is_correct: true },
            { option_text: "$250,000", is_correct: false },
            { option_text: "$500,000", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The conversion window for aPriority Term extends through:",
          explanation:
            "Conversion is available through the end of the level premium period or age 70, whichever comes first.",
          points: 1,
          options: [
            {
              option_text:
                "End of the level premium period or age 70, whichever comes first",
              is_correct: true,
            },
            { option_text: "The first 10 years only", is_correct: false },
            { option_text: "Age 65 for all terms", is_correct: false },
            { option_text: "Anytime during the policy's life", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "EFT payment has a lower mode cost factor than Direct Bill.",
          explanation:
            "EFT (Electronic Funds Transfer) is the preferred payment method and carries a lower mode cost factor compared to Direct Bill.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What application platform does Baltimore Life use for aPriority products?",
          explanation:
            "Baltimore Life uses INSpeed NOW for all aPriority application submissions, supporting online, email, and fax methods.",
          points: 1,
          options: [
            { option_text: "INSpeed NOW", is_correct: true },
            { option_text: "iGO e-App", is_correct: false },
            { option_text: "iPipeline", is_correct: false },
            { option_text: "FireLight", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What UW classes are available for Protector Level Term?",
          explanation:
            "Protector Level Term offers Preferred Plus, Preferred, and Standard classes — better rate classes than the simplified product.",
          points: 1,
          options: [
            {
              option_text: "Preferred Plus, Preferred, Standard",
              is_correct: true,
            },
            { option_text: "Standard and Special only", is_correct: false },
            { option_text: "Elite, Preferred, Standard", is_correct: false },
            { option_text: "Standard only", is_correct: false },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 6: Riders — Waiver of Premium & Accidental Death (content)
  // =========================================================================
  {
    title: "Riders: Waiver of Premium & Accidental Death",
    lesson_type: "content",
    estimated_duration_minutes: 6,
    xp_reward: 20,
    description:
      "Understand the Waiver of Premium and Accidental Death Benefit riders — eligibility, limits, and expiration rules.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Waiver of Premium (WOP)",
        rich_text_content: `<h2>Waiver of Premium (WOP) Rider</h2>
<p>The WOP rider waives the insured's premium payments if they become totally disabled.</p>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>16–55</td></tr>
<tr><td><strong>Expiration</strong></td><td>Age 60</td></tr>
<tr><td><strong>UW Class Restriction</strong></td><td>Standard class only (not available for Special class)</td></tr>
<tr><td><strong>Elimination Period</strong></td><td>6 months of total disability before waiver begins</td></tr>
<tr><td><strong>Retroactive</strong></td><td>Once approved, premiums are waived retroactively to date of disability</td></tr>
</tbody>
</table>
<blockquote><strong>Key limitation:</strong> WOP is only available to Standard class — not Special class applicants. If the client is rated Special, this rider is not an option.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Accidental Death Benefit (ADB)",
        rich_text_content: `<h2>Accidental Death Benefit (ADB) Rider</h2>
<p>The ADB rider pays an additional amount above the face amount if death is caused by accident.</p>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>0–65</td></tr>
<tr><td><strong>UW Class</strong></td><td>Standard class only</td></tr>
<tr><td><strong>Expiration</strong></td><td>Age 70 (except when base policy ends earlier)</td></tr>
<tr><td><strong>Minimum Benefit</strong></td><td>$15,000</td></tr>
<tr><td><strong>Maximum Benefit</strong></td><td>1.5x the base face amount, up to $300,000</td></tr>
<tr><td><strong>Premiums</strong></td><td>Level for full term of rider coverage (for 20-Pay, cannot exceed 20 years, only available at issue)</td></tr>
</tbody>
</table>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 7: Riders — Children's Insurance & Disability Income (content)
  // =========================================================================
  {
    title: "Riders: Children's Insurance & Disability Income",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Learn the Children's Insurance Benefit and Non-Occupational Disability Income riders — eligibility, benefit details, and fine print.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Children's Insurance Benefit (CIB)",
        rich_text_content: `<h2>Children's Insurance Benefit (CIB) Rider</h2>
<p>The CIB rider provides term life insurance on the named children of the insured.</p>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Insured (parent) ages</strong></td><td>18–60</td></tr>
<tr><td><strong>Child eligibility ages</strong></td><td>0–14 (must be under 15 at issue)</td></tr>
<tr><td><strong>Coverage amount</strong></td><td>$5,000 – $20,000 per child (not more than 50% of the base policy)</td></tr>
<tr><td><strong>UW Class</strong></td><td>Standard class only (not available with Special class)</td></tr>
<tr><td><strong>Benefit expires</strong></td><td>Age 70 of base insured or age 25 of child insured</td></tr>
</tbody>
</table>
<h3>Conversion Options</h3>
<ul>
<li>Each child can <strong>convert to permanent coverage</strong> without medical evidence — up to <strong>5x the rider face amount</strong> (maximum $50,000)</li>
<li><strong>Conversion triggers:</strong> Child's attained age 18, 21, or 25; the child's marriage; or the base insured's attained age 70</li>
</ul>
<h3>Guaranteed Temporary Coverage</h3>
<ul>
<li>While rider is in force, <strong>newborn children automatically receive $2,000 death benefit</strong> beginning at 7 days old for a 90-day period</li>
<li>After 90 days, an application to continue coverage under the rider must be submitted and approved</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Non-Occupational Disability Income (DI) Rider",
        rich_text_content: `<h2>Non-Occupational Disability Income (DI) Rider</h2>
<p>This rider provides a monthly benefit for two years during the insured's "Total Disability" for <strong>non-occupational</strong> (off-the-job) injuries and sicknesses only.</p>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>18–55 (age at last birthday)</td></tr>
<tr><td><strong>Expires</strong></td><td>Age 60</td></tr>
<tr><td><strong>UW Class</strong></td><td>Standard class only</td></tr>
<tr><td><strong>Minimum Monthly Benefit</strong></td><td>$100</td></tr>
<tr><td><strong>Maximum Monthly Benefit</strong></td><td>Lesser of: $2,000, 5% of base policy coverage, or 60% of insured's monthly income</td></tr>
<tr><td><strong>Elimination Period</strong></td><td>90 days</td></tr>
<tr><td><strong>Benefit Period</strong></td><td>2 years (24 months)</td></tr>
</tbody>
</table>
<h3>Eligibility Requirements</h3>
<ul>
<li>Insured must be <strong>employed and covered by workers' compensation</strong> or other government program</li>
<li>Insured must work a minimum of <strong>30 hours per week</strong></li>
<li>Some occupations are excluded from eligibility</li>
<li>Premiums are <strong>guaranteed in the first year</strong> and may increase thereafter</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "DI Rider Fine Print",
        rich_text_content: `<h2>DI Rider — Fine Print You Must Know</h2>
<h3>Additional / Concurrent Disability</h3>
<ul>
<li><strong>Same or related cause:</strong> If the insured sustains an additional disability for the same or related cause before the 2-year benefit period ends — treated as a <strong>continuation</strong> (no new waiting period, no extension of benefit period)</li>
<li><strong>Unrelated cause:</strong> If the insured suffers an unrelated additional disability before the 2-year period ends — treated as a <strong>new disability</strong> with a new 90-day elimination period and a new 2-year benefit period</li>
<li>The company will <strong>never pay more than one disability benefit</strong> for two or more simultaneous disabilities</li>
</ul>
<h3>Recurrent Disability</h3>
<ul>
<li>If the insured becomes totally disabled again for the <strong>same or related cause</strong> — treated as a <strong>continuation</strong> of the prior disability</li>
<li><strong>Exception:</strong> If the insured worked a minimum of <strong>30 hours per week</strong> in a gainful occupation for at least <strong>6 months</strong> between the two periods — treated as a <strong>new disability</strong> with a new 90-day elimination period and full 2-year benefit</li>
</ul>
<blockquote><strong>Important:</strong> This is a <strong>non-occupational</strong> rider — it does NOT cover disabilities caused by work-related injuries. The insured must be covered by workers' compensation or a government program.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 8: Accelerated Death Benefit Rider (content)
  // =========================================================================
  {
    title: "Accelerated Death Benefit Rider",
    lesson_type: "content",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Understand the Accelerated Death Benefit Rider — terminal illness and nursing facility benefits, lien mechanics, and state variations.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Terminal Illness & Nursing Facility Benefits",
        rich_text_content: `<h2>Accelerated Death Benefit Rider (ADBR)</h2>
<p>The ADBR allows the policyholder to access a portion of the death benefit while still alive under qualifying conditions. Included at issue in all available states unless the owner opts out.</p>
<h3>Terminal Illness Benefit</h3>
<ul>
<li><strong>Maximum acceleration:</strong> 75% of the death benefit</li>
<li><strong>Qualification:</strong> Diagnosed as terminally ill with a life expectancy of <strong>12 months or less</strong></li>
<li>Remaining benefit stays in force for beneficiaries</li>
</ul>
<h3>Qualified Nursing Facility Benefit</h3>
<ul>
<li><strong>Maximum acceleration:</strong> 50% of the death benefit</li>
<li><strong>Qualification:</strong> Confined to a qualified nursing facility with expectation of permanent confinement</li>
<li><em>Not available in CA, CT, or FL (Form 8245 states)</em></li>
</ul>
<h3>Claim Limits</h3>
<ul>
<li><strong>Minimum claim:</strong> $5,000</li>
<li><strong>Maximum claim:</strong> $250,000</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Lien Mechanics — How It Works",
        rich_text_content: `<h2>Lien Mechanics</h2>
<p>When the ADBR is exercised, a <strong>lien</strong> is placed against the death benefit:</p>
<ul>
<li><strong>Service fee:</strong> $100</li>
<li><strong>Interest rate:</strong> Up to 8% annual interest on the lien amount</li>
<li>Upon the insured's death, the beneficiary receives the death benefit <strong>minus the lien and accumulated interest</strong></li>
</ul>
<h3>Example: $100,000 Death Benefit — Terminal Illness</h3>
<table>
<thead><tr><th>Item</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Maximum Rider Benefit (75%)</td><td>$75,000</td></tr>
<tr><td>Service Fee</td><td>$100</td></tr>
<tr><td>Accelerated Death Benefit Lien</td><td>$75,100</td></tr>
<tr><td>Benefit Amount Paid to You</td><td>$75,000</td></tr>
</tbody>
</table>
<h3>Death Occurs One Year After Acceleration</h3>
<table>
<thead><tr><th>Item</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Policy Death Benefit</td><td>$100,000</td></tr>
<tr><td>Less Lien</td><td>-$75,100</td></tr>
<tr><td>Less 8% Interest</td><td>-$6,008</td></tr>
<tr><td><strong>Net Death Proceeds</strong></td><td><strong>$18,892</strong></td></tr>
</tbody>
</table>`,
      },
      {
        content_type: "rich_text",
        title: "State Variations (PA/IN)",
        rich_text_content: `<h2>State Variations</h2>
<p>Some states have modified ADBR benefit limits:</p>
<table>
<thead><tr><th>State</th><th>Terminal Illness Max</th><th>Nursing Facility Max</th></tr></thead>
<tbody>
<tr><td><strong>Standard (most states)</strong></td><td>75%</td><td>50%</td></tr>
<tr><td><strong>Pennsylvania</strong></td><td>65%</td><td>40%</td></tr>
<tr><td><strong>Indiana</strong></td><td>65%</td><td>40%</td></tr>
</tbody>
</table>
<blockquote><strong>Agent note:</strong> Always verify state-specific ADBR limits when quoting. PA and IN clients receive lower acceleration percentages than the standard 75%/50%.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 9: Protector Level Term — Fully Underwritten (content)
  // =========================================================================
  {
    title: "Protector Level Term — Fully Underwritten",
    lesson_type: "content",
    estimated_duration_minutes: 6,
    xp_reward: 20,
    description:
      "Learn the Protector Level Term product — minimum face amounts, premium bands, rate classes, and available riders.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Protector Level Term — Product Details",
        rich_text_content: `<h2>Protector Level Term — Product Details</h2>
<p>The Protector Level Term is Baltimore Life's <strong>fully underwritten term product</strong> for clients who want higher coverage amounts and the best rate classes.</p>
<table>
<thead><tr><th>Feature</th><th>Detail</th></tr></thead>
<tbody>
<tr><td><strong>Minimum Face Amount</strong></td><td>$100,001</td></tr>
<tr><td><strong>Maximum Face Amount</strong></td><td>No explicit maximum ($500,000 max for 10-Year Term only)</td></tr>
<tr><td><strong>UW Classes</strong></td><td>Preferred Plus, Preferred, Standard Table P</td></tr>
<tr><td><strong>Premium Classes</strong></td><td>Nontobacco, Tobacco</td></tr>
<tr><td><strong>Term Lengths</strong></td><td>10, 15, 20, 30 years</td></tr>
<tr><td><strong>Non-Participating</strong></td><td>No dividends</td></tr>
<tr><td><strong>Nonforfeiture Options</strong></td><td>None</td></tr>
</tbody>
</table>
<h3>Premium Bands</h3>
<p>Protector Level Term uses <strong>5 face amount bands</strong> for premium calculation:</p>
<ul>
<li><strong>Band 1:</strong> $50,000</li>
<li><strong>Band 2:</strong> $100,001</li>
<li><strong>Band 3:</strong> $250,000</li>
<li><strong>Band 4:</strong> $500,000</li>
<li><strong>Band 5:</strong> $1,000,000</li>
</ul>
<p><strong>Note:</strong> 10-year term only uses the $50,000, $100,001, and $250,000 bands.</p>
<p>Higher bands receive lower per-unit premiums. Encourage clients to hit the next band threshold when feasible — a small increase in coverage can sometimes mean a lower per-thousand cost.</p>`,
      },
      {
        content_type: "rich_text",
        title: "Riders & Conversion",
        rich_text_content: `<h2>Riders Available on Protector Level Term</h2>
<p>Rider benefits are the same as those offered on simplified face amounts of $100,000 and less:</p>
<ul>
<li><strong>Waiver of Premium (WOP)</strong> — ages 16–55, expires at 60</li>
<li><strong>Accidental Death Benefit (ADB)</strong> — ages 0–65, min $15K, max 1.5x base to $300K</li>
<li><strong>Children's Insurance Benefit (CIB)</strong> — ages 18–60 of insured</li>
<li><strong>Non-Occ Disability Income (DI)</strong> — ages 18–55, $100–$2,000/mo</li>
<li><strong>Accelerated Death Benefit Rider (ADBR)</strong> — included at issue (terminal illness 75% + nursing facility 50%)</li>
</ul>
<h3>Conversion Feature</h3>
<ul>
<li>Same conversion terms as aPriority Simplified</li>
<li>Available through end of level period or age 70</li>
<li>5-year minimum hold period</li>
<li>No new medical underwriting required</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Payment Modes",
        rich_text_content: `<h2>Payment Modes — Protector Level Term</h2>
<ul>
<li><strong>EFT (preferred):</strong> Monthly, quarterly, semi-annual, annual</li>
<li><strong>Direct Bill:</strong> Monthly, quarterly, semi-annual, annual</li>
<li>Same mode factors as aPriority Simplified</li>
</ul>
<blockquote><strong>Pro tip:</strong> For clients qualifying for Preferred Plus, the combination of best rate class + highest face amount band + annual EFT payment results in the absolute lowest cost per $1,000 of coverage. Run that illustration!</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 10: Final Assessment — aPriority Term Mastery (quiz)
  // =========================================================================
  {
    title: "Final Assessment: aPriority Term Mastery",
    lesson_type: "quiz",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Comprehensive assessment covering the full aPriority Term product line — simplified and fully underwritten products, riders, and key details.",
    is_required: true,
    quiz: {
      pass_threshold: 75,
      max_attempts: 3,
      shuffle_questions: true,
      show_correct_answers: true,
      shuffle_options: true,
      xp_bonus_perfect: 20,
      questions: [
        {
          question_type: "multiple_choice",
          question_text:
            "What face amount range does aPriority Simplified cover?",
          explanation:
            "aPriority Simplified covers $25,000 to $150,000. Higher amounts require Protector Level Term.",
          points: 1,
          options: [
            { option_text: "$25,000 – $150,000", is_correct: true },
            { option_text: "$10,000 – $100,000", is_correct: false },
            { option_text: "$50,000 – $250,000", is_correct: false },
            { option_text: "$100,000 – $500,000", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The WOP rider is restricted to which underwriting class?",
          explanation:
            "Waiver of Premium is only available to Standard class applicants — Special class cannot add WOP.",
          points: 1,
          options: [
            { option_text: "Standard class only", is_correct: true },
            { option_text: "Special class only", is_correct: false },
            { option_text: "Both Standard and Special", is_correct: false },
            { option_text: "Preferred Plus only", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The Non-Occupational DI rider covers work-related injuries.",
          explanation:
            "The Non-Occupational DI rider specifically does NOT cover work-related injuries — those are covered by workers' compensation.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the maximum ADB rider benefit amount?",
          explanation:
            "ADB maximum is 1.5 times the base face amount, up to a cap of $300,000.",
          points: 1,
          options: [
            { option_text: "Equal to the base face amount", is_correct: false },
            {
              option_text: "1.5x the base face amount, up to $300,000",
              is_correct: true,
            },
            { option_text: "2x the base face amount", is_correct: false },
            { option_text: "$500,000 maximum", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The ADBR lien charges what annual interest rate on the accelerated amount?",
          explanation:
            "The ADBR applies an 8% annual interest rate on the accelerated benefit amount, plus a $100 administrative fee.",
          points: 1,
          options: [
            { option_text: "5%", is_correct: false },
            { option_text: "6%", is_correct: false },
            { option_text: "8%", is_correct: true },
            { option_text: "10%", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "For the DI rider, a recurrent disability for the same cause is treated as a new disability only if:",
          explanation:
            "A recurrent same-cause disability is only treated as new if the insured worked 30+ hours/week for at least 6 months between the two periods. Otherwise, it's a continuation.",
          points: 1,
          options: [
            {
              option_text:
                "The insured worked 30+ hours/week for at least 6 months between disabilities",
              is_correct: true,
            },
            {
              option_text: "The recurrence happens after 90 days",
              is_correct: false,
            },
            {
              option_text: "The insured files a new claim form",
              is_correct: false,
            },
            {
              option_text: "The original benefit period has fully expired",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "In Pennsylvania, the ADBR terminal illness acceleration maximum is 75%.",
          explanation:
            "Pennsylvania has a reduced maximum — 65% for terminal illness (vs. 75% standard) and 40% for nursing facility (vs. 50% standard).",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Protector Level Term's minimum face amount is:",
          explanation:
            "Protector Level Term starts at $100,001 minimum — designed for clients needing higher coverage amounts with fully underwritten rate classes.",
          points: 1,
          options: [
            { option_text: "$50,000", is_correct: false },
            { option_text: "$100,001", is_correct: true },
            { option_text: "$150,000", is_correct: false },
            { option_text: "$250,000", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The CIB rider allows each child to convert to permanent coverage at up to:",
          explanation:
            "Children covered by the CIB can convert to permanent coverage at up to 5x the CIB benefit without medical evidence.",
          points: 1,
          options: [
            { option_text: "2x the CIB benefit", is_correct: false },
            { option_text: "3x the CIB benefit", is_correct: false },
            { option_text: "5x the CIB benefit", is_correct: true },
            { option_text: "10x the CIB benefit", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the DI rider's elimination period and benefit duration?",
          explanation:
            "The Non-Occupational DI rider has a 90-day elimination period and a 2-year (24-month) benefit period.",
          points: 1,
          options: [
            {
              option_text: "90-day elimination, 2-year benefit period",
              is_correct: true,
            },
            {
              option_text: "30-day elimination, 5-year benefit period",
              is_correct: false,
            },
            {
              option_text: "60-day elimination, 1-year benefit period",
              is_correct: false,
            },
            {
              option_text: "180-day elimination, 3-year benefit period",
              is_correct: false,
            },
          ],
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log("🚀 Starting aPriority Term Module seed...\n");

  // Idempotency check
  const { data: existing, error: checkErr } = await supabase
    .from("training_modules")
    .select("id")
    .eq("title", MODULE_TITLE)
    .eq("imo_id", IMO_ID!)
    .maybeSingle();

  if (checkErr) {
    console.error("Error checking for existing module:", checkErr);
    process.exit(1);
  }

  if (existing) {
    console.log(
      `Module "${MODULE_TITLE}" already exists (id: ${existing.id}). Skipping.`,
    );
    console.log("To re-seed, delete the existing module first.");
    process.exit(0);
  }

  // 1. Create module
  console.log("Creating module...");
  const { data: mod, error: modErr } = await supabase
    .from("training_modules")
    .insert({
      title: MODULE_TITLE,
      description: MODULE_DESCRIPTION,
      category: MODULE_CATEGORY,
      difficulty_level: MODULE_DIFFICULTY,
      estimated_duration_minutes: MODULE_DURATION,
      xp_reward: MODULE_XP,
      tags: MODULE_TAGS,
      imo_id: IMO_ID,
      created_by: USER_ID,
      metadata: {},
    })
    .select()
    .single();

  if (modErr) {
    console.error("Failed to create module:", modErr);
    process.exit(1);
  }
  console.log(`  ✓ Module created: ${mod.id}\n`);

  // 2. Create lessons
  for (let i = 0; i < LESSONS.length; i++) {
    const lesson = LESSONS[i];
    console.log(
      `Creating lesson ${i + 1}/${LESSONS.length}: "${lesson.title}"...`,
    );

    const { data: les, error: lesErr } = await supabase
      .from("training_lessons")
      .insert({
        module_id: mod.id,
        title: lesson.title,
        lesson_type: lesson.lesson_type,
        estimated_duration_minutes: lesson.estimated_duration_minutes,
        xp_reward: lesson.xp_reward,
        description: lesson.description,
        is_required: lesson.is_required,
        sort_order: i,
        imo_id: IMO_ID,
      })
      .select()
      .single();

    if (lesErr) {
      console.error(`  ✗ Failed to create lesson "${lesson.title}":`, lesErr);
      process.exit(1);
    }
    console.log(`  ✓ Lesson created: ${les.id}`);

    // 3. Create content blocks
    if (lesson.content_blocks) {
      for (let j = 0; j < lesson.content_blocks.length; j++) {
        const block = lesson.content_blocks[j];
        const insertData: Record<string, unknown> = {
          lesson_id: les.id,
          content_type: block.content_type,
          title: block.title,
          sort_order: j,
          imo_id: IMO_ID,
        };

        if (block.rich_text_content) {
          insertData.rich_text_content = block.rich_text_content;
        }
        if (block.script_prompt_text) {
          insertData.script_prompt_text = block.script_prompt_text;
        }
        if (block.script_prompt_instructions) {
          insertData.script_prompt_instructions =
            block.script_prompt_instructions;
        }
        if (block.external_url) {
          insertData.external_url = block.external_url;
        }
        if (block.external_url_label) {
          insertData.external_url_label = block.external_url_label;
        }

        const { error: blockErr } = await supabase
          .from("training_lesson_content")
          .insert(insertData);

        if (blockErr) {
          console.error(
            `  ✗ Failed to create block "${block.title}":`,
            blockErr,
          );
          process.exit(1);
        }
        console.log(
          `    ✓ Block ${j}: "${block.title}" (${block.content_type})`,
        );
      }
    }

    // 4. Create quiz
    if (lesson.quiz) {
      const quiz = lesson.quiz;
      const { data: q, error: qErr } = await supabase
        .from("training_quizzes")
        .insert({
          lesson_id: les.id,
          pass_threshold: quiz.pass_threshold,
          max_attempts: quiz.max_attempts,
          shuffle_questions: quiz.shuffle_questions,
          show_correct_answers: quiz.show_correct_answers,
          shuffle_options: quiz.shuffle_options,
          xp_bonus_perfect: quiz.xp_bonus_perfect,
          time_limit_minutes: quiz.time_limit_minutes || null,
          imo_id: IMO_ID,
        })
        .select()
        .single();

      if (qErr) {
        console.error(`  ✗ Failed to create quiz:`, qErr);
        process.exit(1);
      }
      console.log(`    ✓ Quiz created: ${q.id}`);

      // 5. Create questions + options
      for (let k = 0; k < quiz.questions.length; k++) {
        const question = quiz.questions[k];
        const { data: qn, error: qnErr } = await supabase
          .from("training_quiz_questions")
          .insert({
            quiz_id: q.id,
            question_type: question.question_type,
            question_text: question.question_text,
            explanation: question.explanation,
            points: question.points,
            sort_order: k,
            imo_id: IMO_ID,
          })
          .select()
          .single();

        if (qnErr) {
          console.error(`  ✗ Failed to create question ${k}:`, qnErr);
          process.exit(1);
        }

        // 6. Create options
        for (let m = 0; m < question.options.length; m++) {
          const opt = question.options[m];
          const { error: optErr } = await supabase
            .from("training_quiz_options")
            .insert({
              question_id: qn.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct,
              sort_order: m,
            });

          if (optErr) {
            console.error(
              `  ✗ Failed to create option for question ${k}:`,
              optErr,
            );
            process.exit(1);
          }
        }
        console.log(
          `      ✓ Question ${k}: "${question.question_text.substring(0, 50)}..." (${question.options.length} options)`,
        );
      }
    }
  }

  console.log("\n✅ Seed complete!");
  console.log(`Module: "${MODULE_TITLE}"`);
  console.log(`Module ID: ${mod.id}`);
  console.log(`Lessons: ${LESSONS.length}`);
  console.log(
    `Content blocks: ${LESSONS.reduce((sum, l) => sum + (l.content_blocks?.length || 0), 0)}`,
  );
  console.log(
    `Quiz questions: ${LESSONS.reduce((sum, l) => sum + (l.quiz?.questions.length || 0), 0)}`,
  );
  console.log(
    "\nNote: Module is NOT published. Publish via the admin UI when ready.",
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
