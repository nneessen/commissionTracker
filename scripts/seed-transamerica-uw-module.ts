// scripts/seed-transamerica-uw-module.ts
// Seed script: Transamerica Term & IUL Underwriting Guide training module
// Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-transamerica-uw-module.ts

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
    "Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-transamerica-uw-module.ts",
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
const MODULE_TITLE = "Transamerica Term & IUL Underwriting Guide";
const MODULE_DESCRIPTION =
  "Master Transamerica's underwriting requirements for Trendsetter Super, Trendsetter LB, FFIUL II, and FCIUL II — including digital UW, age/face tables, riders, BMI charts, lifestyle/health history, medical impairments, and non-U.S. citizen eligibility.";
const MODULE_CATEGORY = "carrier_training";
const MODULE_DIFFICULTY = "intermediate";
const MODULE_DURATION = 75;
const MODULE_XP = 275;
const MODULE_TAGS = [
  "transamerica",
  "underwriting",
  "term",
  "IUL",
  "trendsetter",
  "FFIUL",
  "FCIUL",
];

// ---------------------------------------------------------------------------
// Lesson data
// ---------------------------------------------------------------------------
const LESSONS: LessonSeed[] = [
  // =========================================================================
  // LESSON 1: Digital Underwriting & the iGO e-App (content)
  // =========================================================================
  {
    title: "Digital Underwriting & the iGO e-App",
    lesson_type: "content",
    estimated_duration_minutes: 5,
    xp_reward: 20,
    description:
      "Understand Transamerica's digital underwriting process, iGO e-App features, Client-Driven Part II, and post-issue audit procedures.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Digital Underwriting Overview",
        rich_text_content: `<h2>Digital Underwriting Overview</h2>
<p>Transamerica uses a <strong>digital-first underwriting approach</strong> designed to streamline the application process and reduce turnaround times.</p>
<h3>iGO e-App Features</h3>
<ul>
<li><strong>Fully electronic application</strong> — no paper forms required</li>
<li><strong>Real-time data prefill</strong> — reduces errors and speeds up submission</li>
<li><strong>Integrated quoting</strong> — generate quotes directly within the application flow</li>
<li><strong>E-signature capability</strong> — clients can sign digitally for faster issue</li>
<li><strong>Status tracking</strong> — monitor application progress in real time</li>
</ul>
<h3>Client-Driven Part II</h3>
<p>The <strong>Client-Driven Part II</strong> allows the applicant to complete the health history portion of the application independently — without the agent present. Key points:</p>
<ul>
<li>Client receives a secure link via email</li>
<li>Completes health questions on their own time</li>
<li>Responses are submitted directly to underwriting</li>
<li>Agent is notified upon completion</li>
</ul>
<blockquote><strong>Agent tip:</strong> Client-Driven Part II can accelerate the process, but make sure your client knows to complete it promptly — delays here slow down the entire application.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Fraud Warning & Post-Issue Audits",
        rich_text_content: `<h2>Fraud Warning & Post-Issue Audits</h2>
<p>Transamerica takes underwriting integrity seriously. All applications carry a <strong>fraud warning statement</strong> that the applicant acknowledges.</p>
<h3>Post-Issue Audits</h3>
<ul>
<li>Transamerica conducts <strong>random post-issue audits</strong> on approved policies</li>
<li>Audits verify the accuracy of information provided during the application</li>
<li>Material misrepresentation discovered during audit can result in <strong>policy rescission</strong></li>
<li>Agents found facilitating inaccurate applications face <strong>contract termination</strong></li>
</ul>
<blockquote><strong>Key takeaway:</strong> Always ensure your client's health and lifestyle information is accurate. Post-issue audits protect both the carrier and your book of business.</blockquote>`,
      },
      {
        content_type: "external_link",
        title: "Transamerica Agent Portal",
        external_url: "https://www.transamerica.com/individual/products/life-insurance",
        external_url_label: "Transamerica — Life Insurance Products Portal",
      },
    ],
  },

  // =========================================================================
  // LESSON 2: Underwriting Requirements Defined (content)
  // =========================================================================
  {
    title: "Underwriting Requirements Defined",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Learn every underwriting requirement Transamerica uses — from vitals and paramed exams to Rx checks, APS guidelines, and requirement validity periods.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Core Underwriting Requirements",
        rich_text_content: `<h2>Core Underwriting Requirements</h2>
<p>Transamerica uses a range of underwriting tools depending on the applicant's age, face amount, and risk profile.</p>
<table>
<thead><tr><th>Requirement</th><th>Abbreviation</th><th>Description</th></tr></thead>
<tbody>
<tr><td>Vitals / Paramed Exam</td><td>V/P</td><td>Blood pressure, pulse, height, weight, blood and urine specimen collection</td></tr>
<tr><td>Health Online Survey</td><td>HOS</td><td>Online health questionnaire completed by the applicant</td></tr>
<tr><td>Blood Chemistry Profile</td><td>BCP</td><td>Full blood panel including lipids, liver enzymes, glucose, kidney function</td></tr>
<tr><td>Electrocardiogram</td><td>ECG</td><td>Resting EKG — required at higher ages and face amounts</td></tr>
<tr><td>Cognitive Screen</td><td>CS</td><td>Brief cognitive assessment — required at age 70+</td></tr>
</tbody>
</table>`,
      },
      {
        content_type: "rich_text",
        title: "Additional Investigation Tools",
        rich_text_content: `<h2>Additional Investigation Tools</h2>
<table>
<thead><tr><th>Requirement</th><th>Abbreviation</th><th>Description</th></tr></thead>
<tbody>
<tr><td>Inspection Report</td><td>IR</td><td>Third-party background and lifestyle verification</td></tr>
<tr><td>Personal Financial Supplement</td><td>PFS</td><td>Financial justification for high face amounts</td></tr>
<tr><td>Motor Vehicle Report</td><td>MVR</td><td>Driving record check</td></tr>
<tr><td>Criminal Background Check</td><td>CBC</td><td>Criminal history database search</td></tr>
<tr><td>Prescription Check</td><td>Rx</td><td>Pharmacy database search for prescription history</td></tr>
</tbody>
</table>
<p><strong>Prescription Check (Rx):</strong> Transamerica runs Rx checks on all applicants. This reveals medications the client may not have disclosed — always ensure accuracy.</p>`,
      },
      {
        content_type: "rich_text",
        title: "Requirement Validity Periods",
        rich_text_content: `<h2>Requirement Validity Periods</h2>
<p>Underwriting requirements have expiration windows. If a requirement expires before the policy is issued, it must be repeated.</p>
<table>
<thead><tr><th>Requirement</th><th>Ages up to 70</th><th>Ages 71+</th></tr></thead>
<tbody>
<tr><td>Paramed / Vitals</td><td>6 months</td><td>3 months</td></tr>
<tr><td>Blood Chemistry Profile (BCP)</td><td>6 months</td><td>3 months</td></tr>
<tr><td>ECG</td><td>12 months</td><td>6 months</td></tr>
<tr><td>Rx Check</td><td>90 days</td><td>90 days</td></tr>
<tr><td>MVR</td><td>12 months</td><td>12 months</td></tr>
<tr><td>Inspection Report</td><td>6 months</td><td>6 months</td></tr>
</tbody>
</table>
<blockquote><strong>Key fact:</strong> The application itself is valid for <strong>180 days</strong> (6 months). If underwriting hasn't been completed within that window, a new application is required.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "APS Guidelines & Identity Verification",
        rich_text_content: `<h2>APS Guidelines & Identity Verification</h2>
<h3>Attending Physician Statement (APS)</h3>
<p>An APS is ordered when underwriting needs detailed medical records. Common triggers:</p>
<ul>
<li>Significant health conditions disclosed on the application</li>
<li>Prescription history revealing chronic medications</li>
<li>Abnormal lab results from the BCP</li>
<li>High face amount applications requiring additional due diligence</li>
</ul>
<h3>Identity Verification</h3>
<p>Transamerica requires identity verification for all applicants. Acceptable forms include government-issued photo ID.</p>
<h3>IRS Form 4506-C (Tax Return Transcript)</h3>
<p>Required for face amounts of <strong>$5,000,000 and above</strong>. This allows Transamerica to verify income and financial justification for the coverage amount requested.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 3: Underwriting Requirements Knowledge Check (quiz)
  // =========================================================================
  {
    title: "Underwriting Requirements Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Test your understanding of Transamerica's underwriting requirements, validity periods, and investigation tools.",
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
            "How long is a Transamerica application valid before a new one must be submitted?",
          explanation:
            "The application is valid for 180 days (6 months). If underwriting isn't completed in that window, a new application is required.",
          points: 1,
          options: [
            { option_text: "90 days", is_correct: false },
            { option_text: "180 days (6 months)", is_correct: true },
            { option_text: "12 months", is_correct: false },
            { option_text: "60 days", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text: "What does HOS stand for in Transamerica underwriting?",
          explanation:
            "HOS = Health Online Survey — an online health questionnaire completed by the applicant.",
          points: 1,
          options: [
            { option_text: "Health Online Survey", is_correct: true },
            { option_text: "Hospital Ordering System", is_correct: false },
            { option_text: "Home Office Screening", is_correct: false },
            { option_text: "Health Outcome Score", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text: "What does BCP stand for?",
          explanation:
            "BCP = Blood Chemistry Profile — a full blood panel including lipids, liver enzymes, glucose, and kidney function markers.",
          points: 1,
          options: [
            { option_text: "Blood Chemistry Profile", is_correct: true },
            { option_text: "Background Check Protocol", is_correct: false },
            { option_text: "Base Coverage Premium", is_correct: false },
            { option_text: "Beneficiary Certification Process", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "A Cognitive Screen (CS) is required for all Transamerica applicants regardless of age.",
          explanation:
            "The Cognitive Screen is only required at age 70 and above, not for all applicants.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "For applicants aged 71+, how long is a paramed exam valid?",
          explanation:
            "For ages 71+, paramed/vitals validity is shortened to 3 months (vs. 6 months for ages up to 70).",
          points: 1,
          options: [
            { option_text: "1 month", is_correct: false },
            { option_text: "3 months", is_correct: true },
            { option_text: "6 months", is_correct: false },
            { option_text: "12 months", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When is an IRS Form 4506-C (tax return transcript) required?",
          explanation:
            "The IRS 4506-C is required for face amounts of $5,000,000 and above to verify income and financial justification.",
          points: 1,
          options: [
            { option_text: "All applications over $1M", is_correct: false },
            { option_text: "Face amounts of $5,000,000 and above", is_correct: true },
            { option_text: "Only for business-owned policies", is_correct: false },
            { option_text: "When the applicant is self-employed", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "Transamerica runs prescription (Rx) checks on all applicants.",
          explanation:
            "Transamerica runs Rx checks on all applicants to verify prescription history against what was disclosed.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Which of the following commonly triggers an APS (Attending Physician Statement) order?",
          explanation:
            "An APS is ordered when significant health conditions are disclosed, chronic medications appear on Rx check, or lab results are abnormal.",
          points: 1,
          options: [
            {
              option_text:
                "Significant health conditions, abnormal lab results, or chronic medications on Rx check",
              is_correct: true,
            },
            { option_text: "All applications over age 40", is_correct: false },
            { option_text: "Only when the client requests it", is_correct: false },
            { option_text: "Only for term products, never IUL", is_correct: false },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 4: Age & Face Amount Requirements (content)
  // =========================================================================
  {
    title: "Age & Face Amount Requirements",
    lesson_type: "content",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Understand the age and face amount requirement thresholds for Trendsetter Super, Trendsetter LB, FFIUL II, and FCIUL II.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Trendsetter Super & Trendsetter LB Requirements",
        rich_text_content: `<h2>Trendsetter Super & Trendsetter LB — Age/Face Thresholds</h2>
<p>Requirements increase as face amount and age increase. Here are the key thresholds to memorize:</p>
<table>
<thead><tr><th>Face Amount</th><th>Ages 18–40</th><th>Ages 41–50</th><th>Ages 51–60</th><th>Ages 61–70</th><th>Ages 71+</th></tr></thead>
<tbody>
<tr><td>$100K–$249K</td><td>App + Rx</td><td>App + Rx</td><td>App + Rx + BCP</td><td>App + Rx + BCP + ECG</td><td>App + Rx + BCP + ECG + CS</td></tr>
<tr><td>$250K–$499K</td><td>App + Rx</td><td>App + Rx + BCP</td><td>App + Rx + BCP</td><td>App + Rx + BCP + ECG</td><td>App + Rx + BCP + ECG + CS</td></tr>
<tr><td>$500K–$999K</td><td>App + Rx + BCP</td><td>App + Rx + BCP</td><td>App + Rx + BCP + ECG</td><td>App + Rx + BCP + ECG</td><td>Full suite</td></tr>
<tr><td>$1M–$4.99M</td><td>App + Rx + BCP</td><td>App + Rx + BCP + IR</td><td>App + Rx + BCP + ECG + IR</td><td>Full suite + PFS</td><td>Full suite + PFS</td></tr>
<tr><td>$5M+</td><td colspan="5">Full suite + PFS + 4506-C (tax transcript)</td></tr>
</tbody>
</table>
<blockquote><strong>Simplified rule of thumb:</strong> More money + older age = more requirements. Under 40 and under $500K is the lightest underwriting.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "FCIUL II Requirements Highlights",
        rich_text_content: `<h2>FCIUL II (Financial Choice IUL II) Requirements</h2>
<p>FCIUL II follows similar thresholds to the term products but has some unique characteristics:</p>
<ul>
<li><strong>Issue ages:</strong> 0–80 (varies by premium funding)</li>
<li><strong>Minimum face amount:</strong> $25,000</li>
<li>BCP required at <strong>lower face amounts</strong> than term products for older ages</li>
<li>ECG required starting at age 51 for face amounts $500K+</li>
<li>All IUL applications require <strong>illustration review</strong> by the home office</li>
</ul>
<blockquote><strong>Agent note:</strong> IUL underwriting can take longer due to the illustration review step. Set client expectations accordingly.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "FFIUL II Requirements Highlights",
        rich_text_content: `<h2>FFIUL II (Financial Foundation IUL II) Requirements</h2>
<p>FFIUL II is Transamerica's accumulation-focused IUL product:</p>
<ul>
<li><strong>Issue ages:</strong> 0–75</li>
<li><strong>Minimum face amount:</strong> $25,000</li>
<li>Underwriting requirements mirror FCIUL II at most thresholds</li>
<li>Higher face amounts ($1M+) require Personal Financial Supplement</li>
<li><strong>Fluidless eligibility</strong> available for certain age/face combinations — no blood or urine required</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Key Footnotes & Exceptions",
        rich_text_content: `<h2>Key Footnotes & Exceptions</h2>
<ul>
<li><strong>Fluidless eligibility:</strong> Select age/face combinations qualify for underwriting without blood or urine specimens. Check the specific product grid for eligibility.</li>
<li><strong>Cognitive Screen at age 70:</strong> Required for all products at ages 70 and above regardless of face amount.</li>
<li><strong>IRS 4506-C at $5M+:</strong> Tax return transcript required for all products when face amount reaches $5,000,000 or more.</li>
<li><strong>Personal Financial Supplement:</strong> Required for high face amounts — typically $1M+ depending on age.</li>
<li><strong>Inspection Report:</strong> Ordered for high face amounts or when underwriting flags lifestyle concerns.</li>
</ul>
<blockquote><strong>Pro tip:</strong> Familiarize yourself with the fluidless thresholds — being able to tell a client "no needles required" is a powerful selling point.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Available Riders by Product (content)
  // =========================================================================
  {
    title: "Available Riders by Product",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Learn the full rider lineup across Transamerica products — from ADB and chronic illness to LTC and terminal illness riders.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Rider Availability Matrix",
        rich_text_content: `<h2>Rider Availability Matrix</h2>
<p>Not all riders are available on all products. Here's the quick-reference grid:</p>
<table>
<thead><tr><th>Rider</th><th>Trendsetter Super</th><th>Trendsetter LB</th><th>FFIUL II</th><th>FCIUL II</th></tr></thead>
<tbody>
<tr><td>Accidental Death Benefit (ADB)</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Base Insured Rider</td><td>—</td><td>—</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Children's Benefit (CB)</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Chronic Illness Rider</td><td>Yes</td><td>Yes*</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Critical Illness Rider</td><td>Yes</td><td>Yes*</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Disability Waiver of Premium (DWP)</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Guaranteed Insurability Rider (GIR)</td><td>—</td><td>—</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Income Protection Option (IPO)</td><td>Yes</td><td>Yes</td><td>—</td><td>—</td></tr>
<tr><td>LTC Rider</td><td>—</td><td>—</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Monthly Deduction Insurance (MDI)</td><td>—</td><td>—</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Terminal Illness Rider</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
</tbody>
</table>
<p><em>* Trendsetter LB includes living benefits (chronic/critical/terminal illness) as built-in features, not optional riders.</em></p>`,
      },
      {
        content_type: "rich_text",
        title: "ADB, Base Insured & Children's Benefit",
        rich_text_content: `<h2>ADB, Base Insured & Children's Benefit Riders</h2>
<h3>Accidental Death Benefit (ADB)</h3>
<ul>
<li>Pays an <strong>additional death benefit</strong> if the insured dies from an accident</li>
<li>Maximum benefit varies by product — typically up to the face amount</li>
<li>Available on all four products</li>
</ul>
<h3>Base Insured Rider</h3>
<ul>
<li>Available on <strong>FFIUL II and FCIUL II only</strong></li>
<li>Provides additional term insurance on the base insured within the IUL policy</li>
<li>Cost-effective way to increase coverage without a separate policy</li>
</ul>
<h3>Children's Benefit Rider (CB)</h3>
<ul>
<li>Covers <strong>all eligible children</strong> under one rider</li>
<li>Term coverage on each child, convertible to permanent at specific milestones</li>
<li>Available on all four products</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Chronic & Critical Illness Riders",
        rich_text_content: `<h2>Chronic & Critical Illness Riders</h2>
<h3>Chronic Illness Accelerated Death Benefit Rider</h3>
<ul>
<li>Allows acceleration of a portion of the death benefit if the insured is <strong>chronically ill</strong></li>
<li>Chronic illness = unable to perform 2 of 6 Activities of Daily Living (ADLs) for 90+ days, or severe cognitive impairment</li>
<li><strong>Exclusions:</strong> Pre-existing conditions diagnosed before policy issue may be excluded</li>
<li>Accelerated benefit is paid as a <strong>lien against the death benefit</strong></li>
</ul>
<h3>Critical Illness Accelerated Death Benefit Rider</h3>
<ul>
<li>Allows acceleration if the insured is diagnosed with a <strong>qualifying critical illness</strong></li>
<li>Covered conditions typically include: heart attack, stroke, major organ transplant, invasive cancer, kidney failure</li>
<li><strong>Waiting period:</strong> Condition must be diagnosed at least 30 days after policy issue</li>
<li>One-time benefit — once paid, the rider terminates</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "DWP, GIR, IPO, LTC, MDI & Terminal Illness Riders",
        rich_text_content: `<h2>Additional Rider Details</h2>
<h3>Disability Waiver of Premium (DWP)</h3>
<ul>
<li>Waives premiums if the insured becomes <strong>totally disabled</strong></li>
<li>Typically requires 6-month waiting period before waiver kicks in</li>
<li>Available on all four products</li>
</ul>
<h3>Guaranteed Insurability Rider (GIR)</h3>
<ul>
<li><strong>IUL products only</strong> (FFIUL II, FCIUL II)</li>
<li>Allows purchase of additional coverage at specified intervals without medical evidence</li>
<li>Valuable for younger clients whose income will grow</li>
</ul>
<h3>Income Protection Option (IPO)</h3>
<ul>
<li><strong>Term products only</strong> (Trendsetter Super, Trendsetter LB)</li>
<li>Converts a portion of term coverage to permanent coverage at specific intervals</li>
</ul>
<h3>Long-Term Care (LTC) Rider</h3>
<ul>
<li><strong>IUL products only</strong></li>
<li>Issue ages: typically <strong>18–70</strong> (varies by state)</li>
<li>Provides LTC benefits funded by the policy's death benefit and cash value</li>
<li>Eliminates the need for a separate LTC policy</li>
</ul>
<h3>Monthly Deduction Insurance (MDI)</h3>
<ul>
<li><strong>IUL products only</strong></li>
<li>Additional term insurance within the IUL structure</li>
</ul>
<h3>Terminal Illness Rider</h3>
<ul>
<li><strong>Auto-attached on all products</strong> — no additional cost</li>
<li>Allows acceleration of death benefit if the insured is diagnosed with a terminal illness (typically 12–24 months life expectancy)</li>
<li>Maximum acceleration varies — typically up to $500,000 or 75% of face amount</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 6: Riders & Eligibility Deep Dive (quiz)
  // =========================================================================
  {
    title: "Riders & Eligibility Deep Dive",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Test your knowledge of Transamerica rider availability, eligibility requirements, and benefit details.",
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
            "Which rider is auto-attached at no additional cost on all Transamerica products?",
          explanation:
            "The Terminal Illness Rider is automatically included on all Transamerica life products at no extra charge.",
          points: 1,
          options: [
            { option_text: "Terminal Illness Rider", is_correct: true },
            { option_text: "Chronic Illness Rider", is_correct: false },
            { option_text: "Accidental Death Benefit", is_correct: false },
            { option_text: "Disability Waiver of Premium", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The LTC (Long-Term Care) Rider is available on which Transamerica products?",
          explanation:
            "The LTC rider is available only on IUL products — FFIUL II and FCIUL II. It is not available on term products.",
          points: 1,
          options: [
            { option_text: "FFIUL II and FCIUL II only", is_correct: true },
            { option_text: "All four products", is_correct: false },
            { option_text: "Trendsetter Super only", is_correct: false },
            { option_text: "Trendsetter LB and FCIUL II", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The Chronic Illness Rider requires the insured to be unable to perform 2 of 6 ADLs for at least 90 days.",
          explanation:
            "Chronic illness is defined as inability to perform 2 of 6 Activities of Daily Living for 90+ days, or severe cognitive impairment.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the typical maximum ADB (Accidental Death Benefit) on Transamerica products?",
          explanation:
            "The ADB rider typically pays up to the face amount of the policy as an additional death benefit for accidental death.",
          points: 1,
          options: [
            { option_text: "Up to the face amount of the policy", is_correct: true },
            { option_text: "$100,000 regardless of face amount", is_correct: false },
            { option_text: "50% of the face amount", is_correct: false },
            { option_text: "$500,000 maximum", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The Guaranteed Insurability Rider (GIR) is most valuable for which type of client?",
          explanation:
            "GIR allows purchasing additional coverage without medical evidence at future dates — ideal for younger clients whose income will grow.",
          points: 1,
          options: [
            {
              option_text:
                "Younger clients whose income is expected to grow over time",
              is_correct: true,
            },
            { option_text: "Retirees looking to reduce coverage", is_correct: false },
            { option_text: "Clients with pre-existing conditions", is_correct: false },
            { option_text: "Business owners only", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The Income Protection Option (IPO) is available on FFIUL II.",
          explanation:
            "The IPO is available only on term products (Trendsetter Super and Trendsetter LB), not on IUL products.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the waiting period for the Critical Illness Rider after policy issue?",
          explanation:
            "The Critical Illness Rider has a 30-day waiting period — the qualifying condition must be diagnosed at least 30 days after the policy issue date.",
          points: 1,
          options: [
            { option_text: "30 days", is_correct: true },
            { option_text: "90 days", is_correct: false },
            { option_text: "6 months", is_correct: false },
            { option_text: "No waiting period", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Trendsetter LB includes chronic, critical, and terminal illness benefits as:",
          explanation:
            "Trendsetter LB ('Living Benefits') includes these as built-in features, not optional riders. They're part of the base product.",
          points: 1,
          options: [
            {
              option_text: "Built-in features (not optional riders)",
              is_correct: true,
            },
            { option_text: "Optional riders at additional cost", is_correct: false },
            { option_text: "Riders available only in certain states", is_correct: false },
            { option_text: "Add-ons requiring separate underwriting", is_correct: false },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 7: BMI Charts & Rate Classes (practice)
  // =========================================================================
  {
    title: "BMI Charts & Rate Classes",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Master BMI-to-rate-class mapping for Transamerica products and practice real-world client scenarios.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "BMI Ranges & Rate Class Mapping (Ages 16–59)",
        rich_text_content: `<h2>BMI Ranges & Rate Class Mapping — Ages 16–59</h2>
<p>Transamerica uses BMI as a primary factor in rate class determination. Lower BMI generally qualifies for better rate classes.</p>
<table>
<thead><tr><th>Rate Class</th><th>BMI Range (Ages 16–59)</th></tr></thead>
<tbody>
<tr><td><strong>Preferred Plus / Preferred Elite</strong></td><td>18.0 – 27.0</td></tr>
<tr><td><strong>Preferred</strong></td><td>18.0 – 30.0</td></tr>
<tr><td><strong>Standard Plus</strong></td><td>18.0 – 32.0</td></tr>
<tr><td><strong>Standard</strong></td><td>16.0 – 38.0</td></tr>
</tbody>
</table>
<blockquote><strong>Key insight:</strong> A BMI of 29.5 at age 45 qualifies for <strong>Preferred</strong> (under the 30.0 cutoff). Know these thresholds — they directly impact premium pricing.</blockquote>`,
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Age 45, BMI 29.5",
        script_prompt_text: `Your client is 45 years old with a BMI of 29.5. They're applying for Trendsetter Super. What is the best rate class they can qualify for based on BMI alone?`,
        script_prompt_instructions:
          "Answer: Preferred. BMI 29.5 falls within the Preferred range of 18.0–30.0 for ages 16–59. It does NOT qualify for Preferred Plus/Elite (max 27.0) but comfortably qualifies for Preferred.",
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Age 62, BMI 33",
        script_prompt_text: `Your client is 62 years old with a BMI of 33. They're applying for FFIUL II. What rate class does their BMI qualify them for?`,
        script_prompt_instructions:
          "Answer: Standard (Nontobacco or Tobacco Standard depending on tobacco status). At ages 60+, the BMI thresholds tighten. A BMI of 33 at age 62 exceeds the Standard Plus cutoff (typically ~30–31 for 60+) but falls within the Standard range. The exact threshold depends on the 60+ chart, but 33 is generally Standard class territory.",
      },
      {
        content_type: "rich_text",
        title: "BMI Ranges — Ages 60+ & Juvenile",
        rich_text_content: `<h2>BMI Ranges — Ages 60+ & Juvenile</h2>
<h3>Ages 60+</h3>
<p>BMI thresholds <strong>tighten at age 60</strong>. The ranges narrow, meaning clients must have a lower BMI to achieve the same rate class as younger applicants.</p>
<table>
<thead><tr><th>Rate Class</th><th>BMI Range (Ages 60+)</th></tr></thead>
<tbody>
<tr><td><strong>Preferred Plus / Preferred Elite</strong></td><td>18.0 – 25.0</td></tr>
<tr><td><strong>Preferred</strong></td><td>18.0 – 28.0</td></tr>
<tr><td><strong>Standard Plus</strong></td><td>18.0 – 31.0</td></tr>
<tr><td><strong>Standard</strong></td><td>16.0 – 36.0</td></tr>
</tbody>
</table>
<h3>Juvenile BMI (Ages 0–15)</h3>
<p>Juvenile applicants use a separate BMI chart that adjusts for growth patterns. Standard childhood BMI percentile guidelines apply — consult the underwriting manual for specific thresholds by age and gender.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 8: Underwriting Tips — Coverage Amounts (content)
  // =========================================================================
  {
    title: "Underwriting Tips: Coverage Amounts",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Learn Transamerica's income replacement formulas, premium-to-income guidelines, and business planning coverage rules.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Income Replacement Formula",
        rich_text_content: `<h2>Income Replacement Formula</h2>
<p>Transamerica uses age-based multipliers to determine appropriate coverage amounts based on the insured's income:</p>
<table>
<thead><tr><th>Age Range</th><th>Multiplier</th><th>Example ($75K income)</th></tr></thead>
<tbody>
<tr><td>18–35</td><td><strong>40x</strong> income</td><td>$3,000,000</td></tr>
<tr><td>36–45</td><td><strong>(75 - age)x</strong> income</td><td>$2,250,000 (age 45)</td></tr>
<tr><td>46–55</td><td><strong>(75 - age)x</strong> income</td><td>$1,500,000 (age 55)</td></tr>
<tr><td>56–65</td><td><strong>(75 - age)x</strong> income</td><td>$750,000 (age 65)</td></tr>
<tr><td>66–70</td><td><strong>(75 - age)x</strong> income</td><td>$375,000 (age 70)</td></tr>
</tbody>
</table>
<blockquote><strong>Formula:</strong> Ages 18–35 use a flat 40x multiplier. Ages 36–70 use (75 minus age) as the multiplier.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Special Coverage Rules",
        rich_text_content: `<h2>Special Coverage Rules</h2>
<h3>Non-Income Earning Spouse</h3>
<ul>
<li>Coverage typically limited to <strong>50–100% of the primary earner's coverage</strong></li>
<li>Underwriting evaluates the economic impact of the non-earning spouse's role (childcare, household management)</li>
</ul>
<h3>College Students</h3>
<ul>
<li>Coverage amounts are limited based on <strong>anticipated future income</strong></li>
<li>Parental financial support may be considered</li>
<li>Typically limited to lower face amounts until income is established</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Premium-to-Income Guidelines",
        rich_text_content: `<h2>Premium-to-Income Guidelines</h2>
<p>Transamerica uses premium-to-income ratios to ensure the coverage amount is financially appropriate:</p>
<ul>
<li><strong>Individual coverage:</strong> Annual premium should not exceed <strong>15% of annual income</strong></li>
<li><strong>Total household coverage:</strong> Annual premium should not exceed <strong>20% of household income</strong></li>
</ul>
<p>If the requested coverage results in premiums above these thresholds, underwriting may require a <strong>Personal Financial Supplement (PFS)</strong> to justify the amount.</p>`,
      },
      {
        content_type: "rich_text",
        title: "Business Planning Coverage",
        rich_text_content: `<h2>Business Planning Coverage</h2>
<p>Transamerica underwrites several business insurance scenarios:</p>
<h3>Key Person Insurance</h3>
<ul>
<li>Covers the financial loss if a key employee dies</li>
<li>Coverage amount based on the employee's contribution to revenue/profits</li>
<li>Typically 5–10x the key person's compensation</li>
</ul>
<h3>Buy-Sell Agreement Funding</h3>
<ul>
<li>Coverage matches the <strong>business valuation</strong> or the insured owner's share</li>
<li>Requires documentation of the buy-sell agreement</li>
</ul>
<h3>Business Loan Protection</h3>
<ul>
<li>Coverage equals the <strong>outstanding loan balance</strong></li>
<li>Bank/lender may be named as collateral assignee</li>
</ul>
<blockquote><strong>Pro tip:</strong> Business cases often require PFS documentation. Prepare your client to provide business financials upfront to avoid delays.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 9: Lifestyle & Health History (content)
  // =========================================================================
  {
    title: "Lifestyle & Health History",
    lesson_type: "content",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Understand rate class criteria for tobacco, cholesterol, blood pressure, family history, driving, aviation, and substance abuse.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Rate Class Criteria — Tobacco, Cholesterol & BP",
        rich_text_content: `<h2>Rate Class Criteria — Key Health Metrics</h2>
<table>
<thead><tr><th>Factor</th><th>Preferred Plus</th><th>Preferred</th><th>Standard Plus</th><th>Standard</th></tr></thead>
<tbody>
<tr><td><strong>Tobacco</strong></td><td>Never or quit 5+ years</td><td>Never or quit 5+ years</td><td>Never or quit 3+ years</td><td>Current or recent user</td></tr>
<tr><td><strong>Total Cholesterol</strong></td><td>≤ 220 mg/dL</td><td>≤ 250 mg/dL</td><td>≤ 280 mg/dL</td><td>≤ 300 mg/dL</td></tr>
<tr><td><strong>Cholesterol Ratio</strong></td><td>≤ 4.5</td><td>≤ 5.5</td><td>≤ 6.5</td><td>≤ 7.5</td></tr>
<tr><td><strong>Blood Pressure</strong></td><td>≤ 130/80</td><td>≤ 140/85</td><td>≤ 145/90</td><td>≤ 150/95 (treated OK)</td></tr>
<tr><td><strong>Family History</strong></td><td>No cardiac/cancer death <60</td><td>No cardiac/cancer death <60</td><td>Flexible</td><td>No restriction</td></tr>
</tbody>
</table>
<blockquote><strong>Remember:</strong> These are the <em>maximum values</em> for each class. A client at the borderline may be offered the next class down.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "Personal History, Driving & Aviation",
        rich_text_content: `<h2>Personal History, Driving & Aviation</h2>
<h3>Driving Record</h3>
<ul>
<li><strong>Preferred Plus:</strong> Clean record — no DUI/DWI ever, no reckless driving in 5 years, max 2 minor violations in 3 years</li>
<li><strong>Preferred:</strong> No DUI/DWI in 5 years, max 3 minor violations in 3 years</li>
<li><strong>Standard:</strong> No DUI/DWI in 3 years, more flexibility on violations</li>
<li><strong>Decline:</strong> Current license suspension, DUI within 1 year, or 2+ DUIs in 5 years</li>
</ul>
<h3>Aviation</h3>
<ul>
<li><strong>Commercial pilots:</strong> Generally eligible for all rate classes</li>
<li><strong>Private pilots:</strong> May receive flat extra premium or table rating depending on hours and experience</li>
<li><strong>Student pilots:</strong> May be postponed or rated</li>
</ul>
<h3>Avocations (Hazardous Activities)</h3>
<ul>
<li>Skydiving, scuba diving, rock climbing, auto racing — evaluated individually</li>
<li>May result in flat extras, exclusion riders, or decline depending on frequency and risk level</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Alcohol & Substance Abuse History",
        rich_text_content: `<h2>Alcohol & Substance Abuse History</h2>
<table>
<thead><tr><th>Rate Class</th><th>Alcohol/Substance History Requirement</th></tr></thead>
<tbody>
<tr><td><strong>Preferred Plus</strong></td><td>No history of abuse treatment, no alcohol-related incidents ever</td></tr>
<tr><td><strong>Preferred</strong></td><td>No abuse treatment in past 10 years, no alcohol-related driving incidents in 10 years</td></tr>
<tr><td><strong>Standard Plus</strong></td><td>No abuse treatment in past 5 years</td></tr>
<tr><td><strong>Standard</strong></td><td>No abuse treatment in past 3 years, stable lifestyle</td></tr>
</tbody>
</table>
<blockquote><strong>Agent tip:</strong> Substance abuse history is one of the most sensitive topics. Encourage full disclosure — the Rx check will reveal prescribed medications like naltrexone or disulfiram, and undisclosed history leads to rescission.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 10: Medical Impairments Reference (practice)
  // =========================================================================
  {
    title: "Medical Impairments Reference",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Practice real-world underwriting scenarios for common medical impairments and understand class eligibility.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Conditions at a Glance",
        rich_text_content: `<h2>Medical Impairments — Conditions at a Glance</h2>
<table>
<thead><tr><th>Condition</th><th>Preferred Possible?</th><th>Standard</th><th>Decline Risk</th></tr></thead>
<tbody>
<tr><td>Controlled Hypertension (1 med)</td><td><strong>Yes</strong></td><td>Yes</td><td>Low</td></tr>
<tr><td>Well-controlled Type 2 Diabetes</td><td>Unlikely</td><td><strong>Yes (table rating)</strong></td><td>Moderate</td></tr>
<tr><td>Type 1 Diabetes (insulin)</td><td>No</td><td>Table rating</td><td>Moderate-High</td></tr>
<tr><td>Depression/Anxiety (controlled)</td><td><strong>Yes</strong></td><td>Yes</td><td>Low</td></tr>
<tr><td>Cancer (in remission 5+ yrs)</td><td>Possible</td><td><strong>Yes</strong></td><td>Low</td></tr>
<tr><td>Cancer (in remission < 2 yrs)</td><td>No</td><td>Table/Postpone</td><td>High</td></tr>
<tr><td>Sleep Apnea (CPAP compliant)</td><td><strong>Yes</strong></td><td>Yes</td><td>Low</td></tr>
<tr><td>Heart Attack (5+ yrs ago)</td><td>No</td><td>Table rating</td><td>Moderate</td></tr>
<tr><td>Epilepsy (well-controlled)</td><td>Unlikely</td><td>Standard</td><td>Low-Moderate</td></tr>
<tr><td>Chronic Kidney Disease (early)</td><td>No</td><td>Table rating</td><td>Moderate</td></tr>
<tr><td>HIV (controlled, undetectable)</td><td>No</td><td>Table rating</td><td>Moderate</td></tr>
<tr><td>Active substance abuse</td><td>No</td><td>No</td><td><strong>Decline</strong></td></tr>
</tbody>
</table>`,
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Controlled Hypertension",
        script_prompt_text: `Your client has controlled hypertension on one medication (lisinopril). Blood pressure readings are consistently 128/78. No other health conditions. Age 50. What rate class can they potentially qualify for?`,
        script_prompt_instructions:
          "Answer: Preferred is possible. Controlled hypertension on a single medication with BP readings within the Preferred range (≤140/85) can qualify for Preferred class. The key factors: single medication, consistent control, no end-organ damage, no other significant conditions.",
      },
      {
        content_type: "script_prompt",
        title: "Scenario: Type 1 Diabetes",
        script_prompt_text: `Your client has Type 1 diabetes, insulin-dependent, diagnosed at age 12. Now age 35 with A1C of 7.2%. They're asking about life insurance with living benefit riders. What should you tell them about eligibility?`,
        script_prompt_instructions:
          "Answer: They can get coverage but expect a table rating (Standard or substandard). Type 1 diabetes is not eligible for Preferred classes. Living benefit riders (critical/chronic illness) are generally available, but the chronic illness rider may have limitations or exclusions related to diabetic complications. The terminal illness rider is auto-included. A1C of 7.2% is reasonable control which helps their case.",
      },
      {
        content_type: "rich_text",
        title: "Case Scenarios from the Guide",
        rich_text_content: `<h2>Case Scenarios — Real-World Examples</h2>
<h3>Henry — Age 52, Smoker, High BP</h3>
<p>Henry is 52, smokes half a pack daily, blood pressure 142/88 on 2 medications. BMI 31. Applying for $250K Trendsetter Super.</p>
<ul>
<li><strong>Rate class:</strong> Tobacco Standard (smoker status) with potential table rating for BP on 2 meds</li>
<li><strong>Requirements:</strong> App + Rx + BCP (age 51–60, $250K+)</li>
<li>BMI 31 at age 52 falls within Tobacco Standard range</li>
</ul>
<h3>Tina — Age 38, Healthy, High Coverage</h3>
<p>Tina is 38, nonsmoker, no medications, BMI 24, BP 118/72. Applying for $1.5M FFIUL II.</p>
<ul>
<li><strong>Rate class:</strong> Preferred Plus / Preferred Elite eligible</li>
<li><strong>Requirements:</strong> App + Rx + BCP + Inspection Report (age 36–45, $1M+)</li>
<li>PFS required for $1M+ at her age</li>
</ul>
<h3>Phil — Age 67, Controlled Diabetes</h3>
<p>Phil is 67, nonsmoker, Type 2 diabetes on metformin, A1C 6.8%, BMI 28. Applying for $200K Trendsetter Super.</p>
<ul>
<li><strong>Rate class:</strong> Standard to Table 2-4 (diabetes rating)</li>
<li><strong>Requirements:</strong> App + Rx + BCP + ECG (age 61–70, $100K–$249K)</li>
<li>Well-controlled T2 diabetes with good A1C is ratable, not declinable</li>
</ul>
<h3>Kim — Age 28, Cancer Survivor</h3>
<p>Kim is 28, had stage I thyroid cancer at age 23, cancer-free for 5 years, no ongoing treatment. BMI 22. Applying for $500K Trendsetter LB.</p>
<ul>
<li><strong>Rate class:</strong> Standard to Preferred possible (5+ years remission from early-stage cancer)</li>
<li><strong>Requirements:</strong> App + Rx + BCP (age 18–40, $500K), APS likely for cancer history</li>
<li>Thyroid cancer with early stage and 5+ year remission has favorable underwriting outlook</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 11: Non-U.S. Citizen Underwriting (content)
  // =========================================================================
  {
    title: "Non-U.S. Citizen Underwriting",
    lesson_type: "content",
    estimated_duration_minutes: 7,
    xp_reward: 20,
    description:
      "Understand Transamerica's underwriting requirements for non-U.S. citizens including visa types, eligibility, and EAC categories.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "General Requirements for Non-Citizens",
        rich_text_content: `<h2>Non-U.S. Citizen Underwriting — General Requirements</h2>
<p>Transamerica does insure non-U.S. citizens, but with additional requirements and restrictions:</p>
<h3>Basic Eligibility</h3>
<ul>
<li>Must be a <strong>legal U.S. resident</strong> with valid immigration status</li>
<li>Must have a <strong>U.S. address</strong> and be physically present in the U.S.</li>
<li>Must have a <strong>Social Security Number (SSN)</strong> or <strong>Individual Taxpayer Identification Number (ITIN)</strong></li>
<li><strong>Minimum U.S. residency:</strong> Typically at least 1 year of continuous U.S. residency</li>
</ul>
<h3>Additional Documentation</h3>
<ul>
<li>Copy of valid immigration documentation (visa, green card, EAD)</li>
<li>Proof of U.S. residency (utility bills, lease, mortgage)</li>
<li>Employment verification if applicable</li>
</ul>`,
      },
      {
        content_type: "rich_text",
        title: "Key Visa Types & Eligibility",
        rich_text_content: `<h2>Key Visa Types & Eligibility</h2>
<table>
<thead><tr><th>Visa Type</th><th>Description</th><th>Eligible?</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><strong>Green Card</strong></td><td>Permanent Resident</td><td>Yes</td><td>Treated similarly to U.S. citizens</td></tr>
<tr><td><strong>H-1B</strong></td><td>Specialty Occupation</td><td>Yes</td><td>Valid employment verification required</td></tr>
<tr><td><strong>L-1</strong></td><td>Intracompany Transferee</td><td>Yes</td><td>Company transfer documentation needed</td></tr>
<tr><td><strong>E-2</strong></td><td>Treaty Investor</td><td>Yes</td><td>Business documentation required</td></tr>
<tr><td><strong>O-1</strong></td><td>Extraordinary Ability</td><td>Yes</td><td>Standard underwriting</td></tr>
<tr><td><strong>F-1</strong></td><td>Student</td><td>Limited</td><td>Coverage amount restrictions apply</td></tr>
<tr><td><strong>B-1/B-2</strong></td><td>Tourist/Business Visitor</td><td><strong>No</strong></td><td>Not eligible — temporary visit only</td></tr>
<tr><td><strong>J-1</strong></td><td>Exchange Visitor</td><td>Limited</td><td>Case-by-case evaluation</td></tr>
</tbody>
</table>
<blockquote><strong>Key rule:</strong> Tourist and business visitor visas (B-1/B-2) are NOT eligible. The applicant must have a status indicating long-term U.S. presence.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "EAC Category Code Highlights",
        rich_text_content: `<h2>EAC Category Codes — Quick Reference</h2>
<p>Transamerica uses <strong>Employment Authorization Category (EAC) codes</strong> to evaluate non-citizen eligibility. Key categories:</p>
<h3>Generally Eligible Categories</h3>
<ul>
<li><strong>C09/C10:</strong> Adjustment of Status applicants — eligible while green card application is pending</li>
<li><strong>A05:</strong> Asylee — eligible after asylum is granted</li>
<li><strong>A07:</strong> Refugee — eligible</li>
<li><strong>C33:</strong> DACA recipients — eligible (case-by-case, may have face amount limitations)</li>
</ul>
<h3>Generally Declined Categories</h3>
<ul>
<li><strong>C11:</strong> Deferred Enforced Departure — typically not eligible</li>
<li><strong>C14:</strong> Deferred Action (non-DACA) — typically declined</li>
<li>Any category indicating <strong>pending deportation</strong> or <strong>removal proceedings</strong></li>
</ul>
<blockquote><strong>Agent tip:</strong> When working with non-citizen clients, collect their immigration documents early and submit them with the application. This prevents delays and shows underwriting you're thorough.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 12: Final Assessment — Transamerica Underwriting Mastery (quiz)
  // =========================================================================
  {
    title: "Final Assessment: Transamerica Underwriting Mastery",
    lesson_type: "quiz",
    estimated_duration_minutes: 8,
    xp_reward: 30,
    description:
      "Comprehensive assessment covering all major Transamerica underwriting topics — digital UW, requirements, riders, BMI, impairments, and non-citizen eligibility.",
    is_required: true,
    quiz: {
      pass_threshold: 80,
      max_attempts: 3,
      shuffle_questions: true,
      show_correct_answers: true,
      shuffle_options: true,
      xp_bonus_perfect: 25,
      questions: [
        {
          question_type: "multiple_choice",
          question_text:
            "What does the Client-Driven Part II allow applicants to do?",
          explanation:
            "Client-Driven Part II lets the applicant complete health history questions independently via a secure link, without the agent present.",
          points: 1,
          options: [
            {
              option_text:
                "Complete health history questions independently via a secure link",
              is_correct: true,
            },
            {
              option_text: "Skip the paramed exam entirely",
              is_correct: false,
            },
            {
              option_text: "Choose their own underwriter",
              is_correct: false,
            },
            {
              option_text: "Submit the application without agent involvement",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "At what face amount does Transamerica require IRS Form 4506-C?",
          explanation:
            "The IRS 4506-C (tax return transcript) is required at face amounts of $5,000,000 and above for all products.",
          points: 1,
          options: [
            { option_text: "$1,000,000+", is_correct: false },
            { option_text: "$2,500,000+", is_correct: false },
            { option_text: "$5,000,000+", is_correct: true },
            { option_text: "$10,000,000+", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The LTC rider is available on both Transamerica term and IUL products.",
          explanation:
            "The LTC rider is available only on IUL products (FFIUL II and FCIUL II). It is not available on Trendsetter Super or Trendsetter LB.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "For ages 18–35, Transamerica's income replacement formula uses what multiplier?",
          explanation:
            "Ages 18–35 use a flat 40x income multiplier. Ages 36+ use (75 minus age) as the multiplier.",
          points: 1,
          options: [
            { option_text: "20x income", is_correct: false },
            { option_text: "30x income", is_correct: false },
            { option_text: "40x income", is_correct: true },
            { option_text: "(75 - age)x income", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What BMI range qualifies for Preferred Plus at ages 16–59?",
          explanation:
            "Preferred Plus / Preferred Elite requires a BMI between 18.0 and 27.0 for applicants ages 16–59.",
          points: 1,
          options: [
            { option_text: "18.0 – 27.0", is_correct: true },
            { option_text: "18.0 – 30.0", is_correct: false },
            { option_text: "16.0 – 25.0", is_correct: false },
            { option_text: "20.0 – 28.0", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Which visa type is NOT eligible for Transamerica coverage?",
          explanation:
            "B-1/B-2 (Tourist/Business Visitor) visas indicate temporary visit only — not eligible for coverage. The applicant must have long-term U.S. presence.",
          points: 1,
          options: [
            { option_text: "H-1B (Specialty Occupation)", is_correct: false },
            { option_text: "Green Card (Permanent Resident)", is_correct: false },
            { option_text: "B-1/B-2 (Tourist/Business Visitor)", is_correct: true },
            { option_text: "L-1 (Intracompany Transferee)", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "A client with well-controlled hypertension on one medication can potentially qualify for Preferred class.",
          explanation:
            "Yes — controlled hypertension on a single medication with BP within Preferred limits (≤140/85) can qualify for Preferred class, assuming no end-organ damage or other significant conditions.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Transamerica's annual premium-to-income guideline for individual coverage is:",
          explanation:
            "Individual coverage premiums should not exceed 15% of annual income. Total household coverage should not exceed 20%.",
          points: 1,
          options: [
            { option_text: "Not to exceed 10%", is_correct: false },
            { option_text: "Not to exceed 15%", is_correct: true },
            { option_text: "Not to exceed 20%", is_correct: false },
            { option_text: "Not to exceed 25%", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the Cognitive Screen requirement for Transamerica?",
          explanation:
            "The Cognitive Screen is required at age 70 and above for all products, regardless of face amount.",
          points: 1,
          options: [
            {
              option_text: "Required at age 70+ for all products",
              is_correct: true,
            },
            { option_text: "Required at age 60+ for IUL only", is_correct: false },
            { option_text: "Required for face amounts over $1M", is_correct: false },
            { option_text: "Only if APS reveals cognitive concerns", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "For Preferred Plus rate class, what is the blood pressure requirement?",
          explanation:
            "Preferred Plus requires blood pressure of ≤130/80. Preferred allows ≤140/85, Standard Plus ≤145/90.",
          points: 1,
          options: [
            { option_text: "≤ 120/70", is_correct: false },
            { option_text: "≤ 130/80", is_correct: true },
            { option_text: "≤ 140/85", is_correct: false },
            { option_text: "≤ 150/95", is_correct: false },
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
  console.log("🚀 Starting Transamerica UW Module seed...\n");

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
