// scripts/seed-apriority-whole-module.ts
// Seed script: aPriority Whole Life Insurance training module
// Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-apriority-whole-module.ts

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
    "Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-apriority-whole-module.ts",
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
const MODULE_TITLE = "aPriority Whole Life Insurance";
const MODULE_DESCRIPTION =
  "Master Baltimore Life's aPriority Whole Life product — participating whole life with guaranteed premiums, cash values, dividends, 7 riders, nonforfeiture options, and the Accelerated Death Benefit Rider.";
const MODULE_CATEGORY = "product_knowledge";
const MODULE_DIFFICULTY = "beginner";
const MODULE_DURATION = 55;
const MODULE_XP = 200;
const MODULE_TAGS = [
  "baltimore-life",
  "aPriority",
  "whole-life",
  "simplified-underwriting",
  "participating",
  "dividends",
];

// ---------------------------------------------------------------------------
// Lesson data
// ---------------------------------------------------------------------------
const LESSONS: LessonSeed[] = [
  // =========================================================================
  // LESSON 1: aPriority Whole Life Overview (content)
  // =========================================================================
  {
    title: "aPriority Whole Life Overview",
    lesson_type: "content",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Learn the key advantages of aPriority Whole Life and its market positioning for different client segments.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Participating Whole Life Advantages",
        rich_text_content: `<h2>aPriority Whole Life — Key Advantages</h2>
<p>Baltimore Life's aPriority Whole Life is a <strong>participating whole life insurance product</strong> with simplified underwriting.</p>
<h3>Core Features</h3>
<ul>
<li><strong>Permanent protection</strong> — coverage never expires as long as premiums are paid</li>
<li><strong>Guaranteed level premiums</strong> — what you pay today is what you pay for life</li>
<li><strong>Guaranteed cash values</strong> — builds cash value on a guaranteed schedule</li>
<li><strong>Participating policy</strong> — eligible for annual dividends (non-guaranteed)</li>
<li><strong>No maturity date at age 100+</strong> — coverage continues beyond age 100 with no additional premiums</li>
<li><strong>Simplified underwriting</strong> — no paramedical exam for qualifying face amounts</li>
</ul>
<blockquote><strong>Selling point:</strong> "This policy never expires, your premiums never increase, it builds cash value you can access, AND it pays dividends. It's the complete package."</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Market Positioning",
        rich_text_content: `<h2>Who Is This Product For?</h2>
<table>
<thead><tr><th>Market Segment</th><th>Why aPriority Whole Life Fits</th></tr></thead>
<tbody>
<tr><td><strong>Young Families</strong></td><td>Lock in low premiums now; cash value growth provides a financial cushion; dividends can reduce future costs</td></tr>
<tr><td><strong>Established Families</strong></td><td>Permanent coverage for final expenses + legacy; cash value as emergency fund or supplemental retirement</td></tr>
<tr><td><strong>Pre-Retired (50–65)</strong></td><td>Guaranteed death benefit for estate/legacy planning; 20-Pay option to be paid up before retirement</td></tr>
<tr><td><strong>Moderate Retired</strong></td><td>Final expense coverage with guaranteed premiums; cash value provides living options</td></tr>
</tbody>
</table>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 2: Product Details (content)
  // =========================================================================
  {
    title: "Product Details",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Master face amounts, issue ages, premium payment periods, nonforfeiture options, and the application process.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Face Amounts, UW Classes & Issue Ages",
        rich_text_content: `<h2>Face Amounts, UW Classes & Issue Ages</h2>
<table>
<thead><tr><th>Feature</th><th>Detail</th></tr></thead>
<tbody>
<tr><td><strong>Minimum Face Amount</strong></td><td>$15,000 (ages 0–49) / $50,000 (ages 50–80)</td></tr>
<tr><td><strong>Maximum Face Amount</strong></td><td>$150,000</td></tr>
<tr><td><strong>UW Classes</strong></td><td>Standard (Standard–Table 4 risks), Special (Table 5–8 risks)</td></tr>
<tr><td><strong>Premium Classes</strong></td><td>Nontobacco and Tobacco</td></tr>
<tr><td><strong>Issue Ages (Standard)</strong></td><td>0–80</td></tr>
<tr><td><strong>Issue Ages (Special)</strong></td><td>18–80</td></tr>
<tr><td><strong>Juvenile</strong></td><td>Ages 0–17 treated as non-tobacco users</td></tr>
<tr><td><strong>Paramed Required</strong></td><td>Ages 61–80 with face amounts $75,001–$150,000</td></tr>
</tbody>
</table>
<blockquote><strong>Note:</strong> The minimum face amount increases at age 50 — from $15,000 to $50,000. This is a common detail agents miss.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Premium Payment Periods & Payment Modes",
        rich_text_content: `<h2>Premium Payment Periods</h2>
<table>
<thead><tr><th>Payment Period</th><th>Description</th><th>Issue Ages</th></tr></thead>
<tbody>
<tr><td><strong>Life-Pay (to age 100)</strong></td><td>Premiums paid for the life of the policy until age 100</td><td>0–80</td></tr>
<tr><td><strong>20-Pay</strong></td><td>Premiums paid for 20 years, then policy is fully paid up</td><td>0–65</td></tr>
</tbody>
</table>
<h3>Payment Modes</h3>
<ul>
<li><strong>EFT (preferred):</strong> Monthly, quarterly, semi-annual, annual</li>
<li><strong>Direct Bill:</strong> Monthly, quarterly, semi-annual, annual</li>
<li>EFT has lower mode cost factor than Direct Bill</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Nonforfeiture Options",
        rich_text_content: `<h2>Nonforfeiture Options</h2>
<p>If the policyholder stops paying premiums, they have the following options (assuming sufficient cash value):</p>
<h3>Extended Term Insurance (ETI)</h3>
<ul>
<li><strong>Standard class only</strong> — not available for Special class</li>
<li>Uses the cash value to purchase paid-up term insurance for the same face amount</li>
<li>Coverage continues for a limited period based on available cash value</li>
<li>This is the <strong>automatic nonforfeiture option</strong> if the policyholder doesn't choose</li>
</ul>
<h3>Reduced Paid-Up Insurance (RPU)</h3>
<ul>
<li>Available to <strong>both Standard and Special class</strong></li>
<li>Uses the cash value to purchase a smaller, fully paid-up whole life policy</li>
<li>No further premiums required — coverage continues at the reduced amount for life</li>
</ul>
<blockquote><strong>Key distinction:</strong> ETI maintains the full face amount for a limited time. RPU provides a reduced face amount for life. ETI is only for Standard class.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Application & Submission Process",
        rich_text_content: `<h2>Application & Submission Process</h2>
<p>Same INSpeed NOW platform as the term product:</p>
<ol>
<li><strong>Online via INSpeed NOW portal</strong> — preferred, fastest processing</li>
<li><strong>Email submission</strong> — scan and send</li>
<li><strong>Fax submission</strong> — traditional method</li>
</ol>
<ul>
<li>Simplified underwriting — medical questions only (no exam for qualifying amounts)</li>
<li>Instant decision possible for qualifying applications</li>
<li>E-delivery available for policy documents</li>
</ul>
<h3>Unearned Premiums Returned at Death</h3>
<p>If premium payments are made in advance (before being applied to the policy), upon death of the insured, the <strong>unearned premiums are returned with the death benefit</strong> amount payable. This is a valuable detail for clients who pay annually — their beneficiaries won't lose the unused portion.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 3: Medical Questions Grid (practice)
  // =========================================================================
  {
    title: "Medical Questions Grid",
    lesson_type: "practice",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Practice determining which medical question set applies based on the client's age and desired face amount.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Medical Question Sets by Age & Face Amount",
        rich_text_content: `<h2>Medical Question Sets — Whole Life</h2>
<p>aPriority Whole Life uses <strong>three sets of medical questions (A, B, C)</strong> based on age and face amount:</p>
<h3>Ages 0–49</h3>
<table>
<thead><tr><th>Age</th><th>$15K–$25K</th><th>$25K–$75K</th><th>$75K–$150K</th></tr></thead>
<tbody>
<tr><td><strong>0–17</strong></td><td>A</td><td>A</td><td>A</td></tr>
<tr><td><strong>18–49</strong></td><td>B</td><td>B</td><td>B</td></tr>
</tbody>
</table>
<h3>Ages 50+ (minimum face amount $50K)</h3>
<table>
<thead><tr><th>Age</th><th>$50K–$75K</th><th>$75K–$150K</th></tr></thead>
<tbody>
<tr><td><strong>50–60</strong></td><td>C</td><td>C</td></tr>
<tr><td><strong>61–80</strong></td><td>C</td><td>C + 3 Questions</td></tr>
</tbody>
</table>
<h3>Key Rules</h3>
<ul>
<li><strong>Set A</strong> — basic health history (juvenile applicants ages 0–17)</li>
<li><strong>Set B</strong> — expanded questions for adult applicants ages 18–49</li>
<li><strong>Set C</strong> — age-specific questions for ages 50+</li>
<li><strong>Ages 61–80, $75K–$150K:</strong> Set C <strong>plus 3 additional questions</strong></li>
<li><strong>Ages 61–80, $75,001–$150K:</strong> Agent must order <strong>paramedical exam and urine specimen</strong></li>
</ul>`,
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Age 55, $60K Whole Life",
        script_prompt_text: `Your client is 55 years old and wants $60,000 of aPriority Whole Life coverage. Which medical question set applies?`,
        script_prompt_instructions:
          "Answer: Set C. The client is age 55 (in the 50–60 range) and requesting $60,000 (in the $50K–$75K column). Set C applies. No paramedical exam required since they are age 55 (under 61) — the paramed is only required for ages 61–80 at $75,001+.",
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Age 70, $100K",
        script_prompt_text: `Your client is 70 years old and wants $100,000 of aPriority Whole Life. What question set applies and are there extra requirements?`,
        script_prompt_instructions:
          "Answer: Set C plus 3 additional questions. Age 70 falls in the 61–80 range, and $100K is in the $75K–$150K column, which requires Set C PLUS 3 additional questions. Additionally, since the client is age 70 (ages 61–80) with a face amount of $75,001–$150,000, the agent must order a paramedical exam and urine specimen.",
      },
    ],
  },

  // =========================================================================
  // LESSON 4: Dividends & Cash Value (content)
  // =========================================================================
  {
    title: "Dividends & Cash Value",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Understand how dividends work, the four dividend options, policy loans, and the Automatic Premium Loan feature.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Dividend Details",
        rich_text_content: `<h2>Dividends — How They Work</h2>
<p>aPriority Whole Life is a <strong>participating policy</strong>, meaning it's eligible to receive annual dividends from Baltimore Life's surplus.</p>
<h3>Key Facts</h3>
<ul>
<li><strong>Dividends are NOT guaranteed</strong> — they're declared annually by the company's board</li>
<li><strong>First dividend payable after 4 years</strong> (policy anniversary year 4)</li>
<li>Dividend amount depends on the company's financial performance, mortality experience, and investment returns</li>
</ul>
<h3>Four Dividend Options</h3>
<table>
<thead><tr><th>Option</th><th>Description</th></tr></thead>
<tbody>
<tr><td><strong>1. Paid-Up Additions</strong></td><td>Dividend purchases additional paid-up whole life coverage — increases the total death benefit and cash value. <em>Most popular option.</em></td></tr>
<tr><td><strong>2. Reduce Premium</strong></td><td>Dividend is applied to reduce the next premium payment due</td></tr>
<tr><td><strong>3. Accumulate at Interest</strong></td><td>Dividend is left with the company to earn interest (like a savings account within the policy)</td></tr>
<tr><td><strong>4. Cash</strong></td><td>Dividend is paid directly to the policyholder as a check or deposit</td></tr>
</tbody>
</table>
<blockquote><strong>Recommendation:</strong> Paid-Up Additions is the best long-term option for most clients — it compounds the death benefit and cash value over time without any additional out-of-pocket cost.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Policy Loans",
        rich_text_content: `<h2>Policy Loans</h2>
<p>Policyholders can borrow against their cash value:</p>
<ul>
<li><strong>Maximum loan interest rate:</strong> 8% annually</li>
<li><strong>Maximum loan amount:</strong> Up to 95% of cash value less any unpaid premium</li>
<li>Loans do <strong>not</strong> need to be repaid — but unpaid loans (plus interest) reduce the death benefit</li>
<li>Loan interest accrues annually and is added to the loan balance if not paid</li>
<li>If total loan balance exceeds cash value, the policy will lapse</li>
</ul>
<blockquote><strong>Agent tip:</strong> Policy loans are a powerful selling point — "You can access your money without canceling the policy." But always explain that unpaid loans reduce the death benefit.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Automatic Premium Loan",
        rich_text_content: `<h2>Automatic Premium Loan (APL)</h2>
<p>The APL is a safety net that prevents policy lapse:</p>
<ul>
<li>If a premium payment is missed and the grace period expires, the policy <strong>automatically borrows from the cash value</strong> to pay the premium</li>
<li>This keeps the policy in force without any action from the policyholder</li>
<li>The borrowed amount accrues interest at the policy loan rate (up to 8%)</li>
<li>APL continues as long as sufficient cash value exists to cover the premium</li>
<li>Must be <strong>elected at the time of application</strong> — can't be added later</li>
</ul>
<blockquote><strong>Always recommend APL:</strong> It's a no-cost safety feature that prevents accidental lapse. There's no reason not to elect it.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Overview Knowledge Check (quiz)
  // =========================================================================
  {
    title: "Overview Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Test your understanding of aPriority Whole Life basics — premium periods, dividends, face amounts, and nonforfeiture options.",
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
            "What are the two premium payment periods available for aPriority Whole Life?",
          explanation:
            "aPriority Whole Life offers Life-Pay (to age 100) and 20-Pay. Life-Pay is available ages 0–80, 20-Pay ages 0–65.",
          points: 1,
          options: [
            { option_text: "Life-Pay (to 100) and 20-Pay", is_correct: true },
            { option_text: "10-Pay and 20-Pay", is_correct: false },
            { option_text: "Life-Pay and 30-Pay", is_correct: false },
            { option_text: "Single Premium and Life-Pay", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text: "When are dividends first payable on aPriority Whole Life?",
          explanation:
            "Dividends are first payable after 4 years (at the 4th policy anniversary). They are non-guaranteed.",
          points: 1,
          options: [
            { option_text: "After 1 year", is_correct: false },
            { option_text: "After 2 years", is_correct: false },
            { option_text: "After 4 years", is_correct: true },
            { option_text: "After 5 years", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the minimum face amount for ages 50–80?",
          explanation:
            "The minimum face amount increases at age 50 — from $15,000 (ages 0–49) to $50,000 (ages 50–80).",
          points: 1,
          options: [
            { option_text: "$15,000", is_correct: false },
            { option_text: "$25,000", is_correct: false },
            { option_text: "$50,000", is_correct: true },
            { option_text: "$100,000", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "Extended Term Insurance (ETI) is available to both Standard and Special class policies.",
          explanation:
            "ETI is only available for Standard class. Special class policies can only use Reduced Paid-Up (RPU) as a nonforfeiture option.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Which dividend option is generally recommended for long-term growth?",
          explanation:
            "Paid-Up Additions compounds the death benefit and cash value over time — it's the best long-term option for most clients.",
          points: 1,
          options: [
            { option_text: "Paid-Up Additions", is_correct: true },
            { option_text: "Cash", is_correct: false },
            { option_text: "Reduce Premium", is_correct: false },
            { option_text: "Accumulate at Interest", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the maximum policy loan amount?",
          explanation:
            "Policyholders can borrow up to 95% of cash value less any unpaid premium, at a maximum interest rate of 8%.",
          points: 1,
          options: [
            { option_text: "50% of cash value", is_correct: false },
            { option_text: "75% of cash value", is_correct: false },
            {
              option_text: "95% of cash value less any unpaid premium",
              is_correct: true,
            },
            { option_text: "100% of cash value", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The Automatic Premium Loan feature can be added at any time after policy issue.",
          explanation:
            "APL must be elected at the time of application — it cannot be added later. Always recommend it at point of sale.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 6: Riders — Waiver, ADB, Children's & GIO (content)
  // =========================================================================
  {
    title: "Riders: Waiver, ADB, Children's & GIO",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Learn the Waiver of Premium, Accidental Death Benefit, Children's Insurance Benefit, and Guaranteed Insurability Option riders.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Waiver of Premium (WOP)",
        rich_text_content: `<h2>Waiver of Premium (WOP) Rider</h2>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>16–55</td></tr>
<tr><td><strong>Expiration</strong></td><td>Age 60</td></tr>
<tr><td><strong>UW Class</strong></td><td>Standard class only (not available for Special)</td></tr>
<tr><td><strong>Elimination Period</strong></td><td>6 months of total disability</td></tr>
</tbody>
</table>
<p>Same terms as the aPriority Term WOP rider — waives premiums during total disability, retroactive once approved.</p>`,
      },
      {
        content_type: "rich_text",
        title: "Accidental Death Benefit (ADB)",
        rich_text_content: `<h2>Accidental Death Benefit (ADB) Rider</h2>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>0–65</td></tr>
<tr><td><strong>Expiration</strong></td><td>Age 70</td></tr>
<tr><td><strong>Minimum Benefit</strong></td><td>$15,000</td></tr>
<tr><td><strong>Maximum Benefit</strong></td><td>1.5x base face amount, up to $300,000</td></tr>
<tr><td><strong>Premiums</strong></td><td>Level for full term of rider coverage (For 20-Pay, cannot exceed 20 years, and only available at issue)</td></tr>
</tbody>
</table>
<p>Pays additional death benefit for accidental death. <strong>Standard underwriting class only</strong> — not available for Special class.</p>`,
      },
      {
        content_type: "rich_text",
        title: "Children's Insurance Benefit (CIB)",
        rich_text_content: `<h2>Children's Insurance Benefit (CIB) Rider</h2>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Premium Period</strong></td><td><strong>Life Pay only</strong> (not available on 20-Pay)</td></tr>
<tr><td><strong>Insured (parent) ages</strong></td><td>18–60</td></tr>
<tr><td><strong>Child eligibility</strong></td><td>Ages 0–14</td></tr>
<tr><td><strong>Coverage</strong></td><td>$5,000 – $20,000 per child, but <strong>not more than 50% of the base</strong> policy face amount</td></tr>
<tr><td><strong>Conversion</strong></td><td>Up to 5x CIB benefit (max $50,000) at child's attained age 18, 21, or 25, child's marriage, or base insured's attained age 70</td></tr>
<tr><td><strong>Benefit Expires</strong></td><td>At age 70 of the base insured or age 25 of the child insured</td></tr>
</tbody>
</table>
<h3>Guaranteed Temporary Coverage for Newborns</h3>
<p>While the CIB rider is in force, <strong>newborn children automatically receive $2,000 death benefit</strong> beginning at 7 days old for a <strong>90-day period</strong>. After 90 days, temporary coverage expires and an application to continue coverage under the rider must be submitted and approved.</p>
<blockquote><strong>Key restriction:</strong> CIB is only available on Life Pay policies — not 20-Pay. Make sure to note this when recommending 20-Pay.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Guaranteed Insurability Option (GIO)",
        rich_text_content: `<h2>Guaranteed Insurability Option (GIO) Rider</h2>
<p>The GIO allows the insured to purchase additional insurance at specified future dates <strong>without evidence of insurability</strong>.</p>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>0–37 (age last birthday)</td></tr>
<tr><td><strong>Minimum Option Amount</strong></td><td>$15,000</td></tr>
<tr><td><strong>Maximum Option Amount</strong></td><td>Lesser of $50,000 or the policy face amount. Total cannot exceed $200,000 minus the sum of all Baltimore Life policies/riders in force on the insured.</td></tr>
</tbody>
</table>
<h3>Option Dates</h3>
<ul>
<li><strong>Regular option dates:</strong> Policy anniversary following the insured's 22nd, 25th, 28th, 31st, 34th, 37th, and 40th birthdays</li>
<li><strong>Alternative option dates:</strong> 61 days following marriage, birth of a child, or adoption</li>
<li><strong>Important:</strong> Exercising an alternative option date <strong>cancels the next regular option date</strong></li>
</ul>
<h3>Premium Details</h3>
<ul>
<li><strong>Life Pay base:</strong> Premiums payable to attained age 40</li>
<li><strong>20-Pay base:</strong> Premiums payable for 20 years or to attained age 40, whichever is shorter</li>
</ul>
<blockquote><strong>Best for:</strong> Young clients (especially children's policies or young adults) whose insurability may change but who want guaranteed future coverage options.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 7: Riders — Single Premium Additional & DI (content)
  // =========================================================================
  {
    title: "Riders: Single Premium Additional & Disability Income",
    lesson_type: "content",
    estimated_duration_minutes: 7,
    xp_reward: 20,
    description:
      "Learn the Single Premium Additional Insurance rider and the Non-Occupational Disability Income rider for whole life policies.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Single Premium Additional Insurance (SPAI)",
        rich_text_content: `<h2>Single Premium Additional Insurance (SPAI) Rider</h2>
<p>The SPAI rider allows the policyholder to purchase additional paid-up whole life coverage with a single lump-sum premium.</p>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Issue Ages</strong></td><td>0–80</td></tr>
<tr><td><strong>Minimum Single Premium</strong></td><td>$100</td></tr>
<tr><td><strong>Maximum</strong></td><td>Based on face amount and age</td></tr>
</tbody>
</table>
<h3>Key Features</h3>
<ul>
<li><strong>1035 Exchange eligible</strong> — clients can transfer cash value from an old policy directly into the SPAI without tax consequences</li>
<li>Additional coverage is <strong>fully paid up immediately</strong> — no ongoing premiums</li>
<li>Increases both the death benefit and cash value from day one</li>
<li>Can be used at policy issue or at specified intervals</li>
</ul>
<h3>Critical Endorsement</h3>
<p><strong>Requires an endorsement that renders the Extended Term Insurance (ETI) nonforfeiture option unavailable.</strong> This means if the policyholder elects the SPAI rider, they lose access to ETI as a nonforfeiture option — only Reduced Paid-Up (RPU) and Cash Surrender remain.</p>
<blockquote><strong>Use case:</strong> Client has an old policy with $5,000 cash value they want to surrender. Instead of cashing out (taxable event), do a 1035 exchange into the SPAI rider — tax-free transfer that boosts their new policy's coverage. But make sure the client understands the ETI tradeoff.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Non-Occupational Disability Income (DI) Rider",
        rich_text_content: `<h2>Non-Occupational Disability Income (DI) Rider</h2>
<table>
<thead><tr><th>Detail</th><th>Specification</th></tr></thead>
<tbody>
<tr><td><strong>Premium Period</strong></td><td><strong>Life Pay only</strong> (not available on 20-Pay)</td></tr>
<tr><td><strong>Issue Ages</strong></td><td>18–55 (age last birthday)</td></tr>
<tr><td><strong>Expires</strong></td><td>Age 60</td></tr>
<tr><td><strong>UW Class</strong></td><td>Standard class only (not available for Special)</td></tr>
<tr><td><strong>Minimum Monthly Benefit</strong></td><td>$100</td></tr>
<tr><td><strong>Maximum Monthly Benefit</strong></td><td>Lesser of: $2,000 / 5% of base policy face amount / 60% of insured's monthly income (all other DI coverages considered)</td></tr>
<tr><td><strong>Elimination Period</strong></td><td>90 days</td></tr>
<tr><td><strong>Benefit Period</strong></td><td>2 years (24 months)</td></tr>
</tbody>
</table>
<h3>Eligibility Requirements</h3>
<ul>
<li><strong>Must work 30+ hours per week</strong> in a gainful occupation</li>
<li><strong>Must be covered by workers compensation</strong> insurance or other government program</li>
<li>Some occupations are excluded from eligibility</li>
<li><strong>Non-occupational only</strong> — covers off-the-job injuries and sickness, NOT work injuries</li>
</ul>
<h3>Premium Details</h3>
<ul>
<li><strong>Premiums guaranteed in first year only</strong> — may increase thereafter</li>
</ul>
<h3>Concurrent & Recurrent Disability Rules</h3>
<ul>
<li><strong>Same/related cause (concurrent):</strong> Additional disability for same or related cause before the 2-year benefit period ends = <strong>continuation</strong> of prior disability. No new waiting period, no extension of benefit period.</li>
<li><strong>Unrelated cause (concurrent):</strong> Unrelated additional disability before the 2-year period ends = <strong>new disability</strong>. New 90-day elimination period, eligible for another full 2-year benefit.</li>
<li><strong>At no time</strong> will the company pay more than one disability benefit for two or more simultaneous disabilities.</li>
<li><strong>Recurrent (same/related cause):</strong> Treated as continuation of prior disability — UNLESS the insured worked 30+ hours/week for at least 6 months between periods, in which case it's treated as a new disability with a new 90-day elimination period and a fresh 2-year benefit.</li>
</ul>
<blockquote><strong>Key restriction:</strong> Like CIB, the DI rider is only available on Life Pay policies. Not available on 20-Pay.</blockquote>`,
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
      "Understand the ADBR for whole life — terminal illness and nursing facility benefits, lien mechanics, and state variations.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Terminal Illness & Nursing Facility Benefits",
        rich_text_content: `<h2>Accelerated Death Benefit Rider (ADBR) — Whole Life</h2>
<p>The whole life ADBR works identically to the term version. Included at issue in all available states unless the owner opts out.</p>
<h3>Terminal Illness Benefit</h3>
<ul>
<li><strong>Maximum acceleration:</strong> 75% of the death benefit</li>
<li><strong>Qualification:</strong> Diagnosed as terminally ill with a life expectancy of <strong>12 months or less</strong></li>
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
        title: "Lien Example — $100K Death Benefit",
        rich_text_content: `<h2>Lien Mechanics — $100K Whole Life Example</h2>
<table>
<thead><tr><th>Item</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Face amount</td><td>$100,000</td></tr>
<tr><td>Terminal illness acceleration (75%)</td><td>$75,000</td></tr>
<tr><td>Service fee (added to lien)</td><td>$100</td></tr>
<tr><td>Accelerated Death Benefit Lien</td><td>$75,100</td></tr>
<tr><td><strong>Benefit Amount Paid to You</strong></td><td><strong>$75,000</strong></td></tr>
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
</table>
<blockquote><strong>Key insight:</strong> The longer the insured lives after acceleration, the more the lien eats into the remaining death benefit. Explain this to clients upfront.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "State Variations (PA/IN)",
        rich_text_content: `<h2>State Variations</h2>
<table>
<thead><tr><th>State</th><th>Terminal Illness Max</th><th>Nursing Facility Max</th></tr></thead>
<tbody>
<tr><td><strong>Most states</strong></td><td>75%</td><td>50%</td></tr>
<tr><td><strong>Pennsylvania</strong></td><td>65%</td><td>40%</td></tr>
<tr><td><strong>Indiana</strong></td><td>65%</td><td>40%</td></tr>
</tbody>
</table>
<p>Same state-specific limits as the term product ADBR.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 9: Whole Life Scenarios — What If... (practice)
  // =========================================================================
  {
    title: "Whole Life Scenarios: What If...",
    lesson_type: "practice",
    estimated_duration_minutes: 6,
    xp_reward: 25,
    description:
      "Practice real-world scenarios — what happens if the insured stops paying, becomes terminally ill, or outlives the policy expectations.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "What If the Insured Lives?",
        rich_text_content: `<h2>"What If the Insured Lives?" — Cash Surrender Value</h2>
<p>Unlike term insurance, whole life has value even if the insured never files a claim:</p>
<ul>
<li><strong>Cash surrender value</strong> grows on a guaranteed schedule plus any dividend additions</li>
<li>The policyholder can <strong>surrender the policy for cash</strong> at any time</li>
<li>They can <strong>borrow against the cash value</strong> (up to 95%) while keeping coverage active</li>
<li>At age 100+, the policy endows — no more premiums owed, coverage continues for life</li>
</ul>
<blockquote><strong>Selling point:</strong> "Whether you live or die, this policy works for you. If something happens, your family gets the death benefit. If nothing happens, you have a cash asset you can use."</blockquote>`,
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Client Wants to Stop Paying",
        script_prompt_text: `Your client has had their aPriority Whole Life policy for 12 years and wants to stop paying premiums. What options do they have?`,
        script_prompt_instructions:
          "Answer: Three options depending on their UW class:\n1. Cash Surrender — surrender the policy and receive the full cash surrender value as a lump sum (taxable to the extent it exceeds basis).\n2. Reduced Paid-Up Insurance (RPU) — available to both Standard and Special class. Uses the cash value to buy a smaller fully paid-up whole life policy. No more premiums, but lower death benefit.\n3. Extended Term Insurance (ETI) — Standard class only. Uses cash value to buy paid-up term insurance for the same face amount, lasting as long as the cash value supports.\nIf they elected Automatic Premium Loan (APL), the policy would automatically borrow from cash value to cover premiums until the cash runs out.",
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Client Is Terminally Ill",
        script_prompt_text: `Your client has a $100,000 aPriority Whole Life policy and has just been diagnosed with a terminal illness (6 months life expectancy). How much can they access while alive?`,
        script_prompt_instructions:
          "Answer: Up to 75% of the death benefit ($75,000) through the Accelerated Death Benefit Rider, subject to the $250,000 maximum claim limit. They'll receive $75,000 and a lien of $75,100 (including $100 service fee) is placed against the policy. The lien accumulates at up to 8% annual interest. If they live 1 year: lien = $75,100 + $6,008 interest = $81,108, leaving net death proceeds of $18,892. In PA or IN, the max is 65% ($65,000) instead of 75%. Not available as nursing facility benefit in CA, CT, or FL.",
      },
      {
        content_type: "rich_text",
        title: "What If the Insured Dies?",
        rich_text_content: `<h2>"What If the Insured Dies?" — Death Benefit</h2>
<ul>
<li><strong>Tax-free death benefit</strong> paid to the named beneficiary</li>
<li><strong>Plus dividend additions</strong> — if Paid-Up Additions was the dividend option, the total death benefit includes all accumulated additions</li>
<li><strong>Minus any outstanding policy loans</strong> (principal + accrued interest)</li>
<li><strong>Minus any ADBR lien</strong> if the accelerated benefit was exercised</li>
</ul>
<h3>Example</h3>
<table>
<thead><tr><th>Component</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Base face amount</td><td>$100,000</td></tr>
<tr><td>Paid-Up Additions (20 years of dividends)</td><td>+$18,500</td></tr>
<tr><td>Outstanding policy loan</td><td>-$12,000</td></tr>
<tr><td><strong>Net death benefit</strong></td><td><strong>$106,500</strong></td></tr>
</tbody>
</table>
<blockquote><strong>Key message:</strong> The death benefit can actually GROW over time thanks to dividend additions. This is a unique advantage of participating whole life vs. term.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 10: Final Assessment — aPriority Whole Life Mastery (quiz)
  // =========================================================================
  {
    title: "Final Assessment: aPriority Whole Life Mastery",
    lesson_type: "quiz",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Comprehensive assessment covering all aPriority Whole Life topics — product details, dividends, riders, nonforfeiture options, and real-world scenarios.",
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
            "What is the minimum face amount for aPriority Whole Life at ages 50–80?",
          explanation:
            "The minimum face amount increases from $15,000 (ages 0–49) to $50,000 at ages 50–80.",
          points: 1,
          options: [
            { option_text: "$15,000", is_correct: false },
            { option_text: "$25,000", is_correct: false },
            { option_text: "$50,000", is_correct: true },
            { option_text: "$100,000", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "How many dividend options are available for aPriority Whole Life?",
          explanation:
            "Four options: Paid-Up Additions, Reduce Premium, Accumulate at Interest, and Cash.",
          points: 1,
          options: [
            { option_text: "2", is_correct: false },
            { option_text: "3", is_correct: false },
            { option_text: "4", is_correct: true },
            { option_text: "5", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "Dividends on aPriority Whole Life are guaranteed by Baltimore Life.",
          explanation:
            "Dividends are NEVER guaranteed — they are declared annually based on the company's financial performance.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The GIO rider allows additional coverage purchases at ages:",
          explanation:
            "GIO regular option dates are policy anniversaries at ages 22, 25, 28, 31, 34, 37, and 40. Alternative dates include marriage and birth/adoption.",
          points: 1,
          options: [
            {
              option_text: "22, 25, 28, 31, 34, 37, and 40",
              is_correct: true,
            },
            { option_text: "Every 5 years from age 20 to 65", is_correct: false },
            { option_text: "Ages 18, 25, 35, and 45", is_correct: false },
            { option_text: "Every policy anniversary", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Which riders are restricted to Life Pay only (not available on 20-Pay)?",
          explanation:
            "Both the Children's Insurance Benefit (CIB) and Non-Occupational DI rider are only available on Life Pay policies.",
          points: 1,
          options: [
            { option_text: "CIB and Non-Occ DI", is_correct: true },
            { option_text: "WOP and ADB", is_correct: false },
            { option_text: "GIO and SPAI", is_correct: false },
            { option_text: "ADB and ADBR", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The SPAI rider is useful for 1035 exchanges because:",
          explanation:
            "A 1035 exchange allows transferring cash value from an old policy into the SPAI without triggering a taxable event.",
          points: 1,
          options: [
            {
              option_text:
                "It allows tax-free transfer of cash value from an old policy",
              is_correct: true,
            },
            {
              option_text: "It doubles the death benefit automatically",
              is_correct: false,
            },
            {
              option_text: "It eliminates the need for underwriting",
              is_correct: false,
            },
            {
              option_text: "It provides a guaranteed 8% return",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "If a policyholder stops paying premiums, the automatic nonforfeiture option for Standard class is Extended Term Insurance.",
          explanation:
            "ETI is the automatic (default) nonforfeiture option for Standard class if the policyholder doesn't actively choose RPU or cash surrender.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the maximum policy loan interest rate for aPriority Whole Life?",
          explanation:
            "Policy loans accrue interest at a maximum rate of 8% annually. Unpaid interest compounds and is added to the loan balance.",
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
            "The GIO rider's issue age range is:",
          explanation:
            "GIO is available for insured ages 0–37. This makes it ideal for children's policies and young adults.",
          points: 1,
          options: [
            { option_text: "0–37", is_correct: true },
            { option_text: "18–55", is_correct: false },
            { option_text: "0–65", is_correct: false },
            { option_text: "16–45", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "If a client exercises the ADBR terminal illness benefit on a $100K policy and dies one year later, how much do beneficiaries receive?",
          explanation:
            "75% acceleration = $75,000 paid to policyholder. Lien = $75,100 ($75,000 + $100 service fee). After 1 year at 8% interest: lien = $75,100 + $6,008 = $81,108. Net death proceeds = $100,000 - $81,108 = $18,892.",
          points: 1,
          options: [
            { option_text: "$25,000", is_correct: false },
            { option_text: "$18,892", is_correct: true },
            { option_text: "$24,900", is_correct: false },
            { option_text: "$12,400", is_correct: false },
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
  console.log("🚀 Starting aPriority Whole Life Module seed...\n");

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
