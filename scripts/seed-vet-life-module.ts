// scripts/seed-vet-life-module.ts
// Seed script: Veteran Life Insurance Sales Script training module
// Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-vet-life-module.ts

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
    "Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-vet-life-module.ts",
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
const MODULE_TITLE = "Veteran Life Insurance Sales Script";
const MODULE_DESCRIPTION =
  "Master the complete veteran life insurance sales call — from understanding VA programs (VGLI, VA Life, SGLI), through discovery, health qualification, product presentation, objection handling, and closing the application.";
const MODULE_CATEGORY = "script_training";
const MODULE_DIFFICULTY = "intermediate";
const MODULE_DURATION = 90;
const MODULE_XP = 250;
const MODULE_TAGS = [
  "veteran",
  "life-insurance",
  "sales-script",
  "VGLI",
  "IUL",
  "mortgage-protection",
];

// ---------------------------------------------------------------------------
// Lesson data
// ---------------------------------------------------------------------------
const LESSONS: LessonSeed[] = [
  // =========================================================================
  // LESSON 1: Understanding Veteran Insurance Programs (content)
  // =========================================================================
  {
    title: "Understanding Veteran Insurance Programs",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Learn the foundation of veteran insurance programs — SGLI, VGLI, and VA Life — so you can speak their language and identify coverage gaps.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Why This Matters",
        rich_text_content: `<h2>Why This Matters</h2>
<p>Veterans love their families and they love insurance — but most have <strong>significant gaps</strong> in their coverage that they don't even know about.</p>
<p>This lesson builds the foundation so you <strong>speak their language</strong>. When you can fluently discuss SGLI, VGLI, and VA Life, veterans immediately know you're not just another agent — you actually understand their world.</p>
<p>The goal isn't to bash their existing coverage. It's to show them where the gaps are and how private coverage fills them.</p>`,
      },
      {
        content_type: "rich_text",
        title: "SGLI — Servicemembers' Group Life Insurance",
        rich_text_content: `<h2>SGLI — Servicemembers' Group Life Insurance</h2>
<p><strong>What it is:</strong> Term life insurance for active duty service members.</p>
<ul>
<li>Coverage up to <strong>$500,000</strong></li>
<li>Available to active duty, Guard, and Reserves</li>
<li><strong>Not free</strong> — premiums are deducted from their paycheck (many think it's free because it's automatic)</li>
<li><strong>120-day coverage</strong> after separation from service</li>
<li>If disabled at separation, coverage can extend up to <strong>2 years</strong> (SGLI Disability Extension)</li>
</ul>
<blockquote><strong>Key takeaway:</strong> SGLI ends shortly after they leave the military. If they separated more than 120 days ago without converting, they may have NO coverage.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "VGLI — Veterans' Group Life Insurance",
        rich_text_content: `<h2>VGLI — Veterans' Group Life Insurance</h2>
<p><strong>What it is:</strong> Term life insurance that veterans can convert from SGLI after separation.</p>
<ul>
<li>Coverage up to <strong>$500,000</strong></li>
<li><strong>6-month window</strong> after separation to apply (120 days SGLI continuation + extension)</li>
<li><strong>No cash value</strong> — it's pure term</li>
<li><strong>No living benefits</strong> — can't access money if critically ill</li>
<li>Premiums <strong>double every 5 years</strong> based on age brackets</li>
<li>Price increases make it extremely expensive long-term</li>
</ul>
<blockquote><strong>Agent tip:</strong> "I usually side with them that there's nothing I can compete with on their VGLI" — this builds trust. Don't bash it. Acknowledge it, then show the gaps.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "VA Life Insurance",
        rich_text_content: `<h2>VA Life Insurance (S-DVI / VALife)</h2>
<p><strong>What it is:</strong> Whole life insurance exclusively for service-connected disabled veterans.</p>
<ul>
<li>Coverage up to <strong>$40,000</strong> only</li>
<li>Only available to veterans with a <strong>service-connected disability rating</strong></li>
<li>Auto-qualify (no medical underwriting)</li>
<li><strong>2-year waiting period</strong> before full death benefit pays out</li>
<li>Premiums <strong>increase every year</strong></li>
</ul>
<blockquote><strong>Key takeaway:</strong> $40k is rarely enough. Most families need $250k–$500k+ for mortgage protection and income replacement.</blockquote>`,
      },
      {
        content_type: "rich_text",
        title: "The Gap — Where We Come In",
        rich_text_content: `<h2>The Gap — Where We Come In</h2>
<table>
<thead><tr><th>Feature</th><th>SGLI</th><th>VGLI</th><th>VA Life</th><th>Private (Us)</th></tr></thead>
<tbody>
<tr><td>Coverage Amount</td><td>Up to $500k</td><td>Up to $500k</td><td>Up to $40k</td><td><strong>Unlimited</strong></td></tr>
<tr><td>Living Benefits</td><td>No</td><td>No</td><td>No</td><td><strong>Yes</strong></td></tr>
<tr><td>Cash Value</td><td>No</td><td>No</td><td>No</td><td><strong>Yes (Whole/IUL)</strong></td></tr>
<tr><td>Premium Stability</td><td>Level</td><td>Doubles every 5yr</td><td>Increases yearly</td><td><strong>Level/Guaranteed</strong></td></tr>
<tr><td>Availability</td><td>Active duty only</td><td>6-month window</td><td>Disabled vets only</td><td><strong>Anyone who qualifies</strong></td></tr>
</tbody>
</table>
<p><strong>The bottom line:</strong> Veterans have options, but every VA program has significant limitations. Private coverage fills the gaps with living benefits, cash value, stable premiums, and higher coverage amounts.</p>
<blockquote><strong>Key insight:</strong> Veterans especially <strong>love IULs</strong> if they're healthy enough to qualify — the combination of permanent coverage, living benefits, and cash value growth resonates deeply.</blockquote>`,
      },
      {
        content_type: "external_link",
        title: "VA.gov Life Insurance Resources",
        external_url: "https://www.va.gov/life-insurance/",
        external_url_label: "VA.gov — Official Life Insurance Programs",
      },
    ],
  },

  // =========================================================================
  // LESSON 2: VA Programs Knowledge Check (quiz)
  // =========================================================================
  {
    title: "VA Programs Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Test your understanding of SGLI, VGLI, and VA Life Insurance programs.",
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
            "How long does a veteran have to apply for VGLI after leaving active duty?",
          explanation:
            "Veterans have a limited enrollment window. After 120 days of SGLI continuation, they have up to 240 days total from separation to convert.",
          points: 1,
          options: [
            { option_text: "30 days", is_correct: false },
            { option_text: "90 days", is_correct: false },
            {
              option_text:
                "6 months (within 120-day SGLI window + extension)",
              is_correct: true,
            },
            { option_text: "1 year", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text: "SGLI coverage is free for active duty military.",
          explanation:
            "SGLI premiums are deducted from the service member's paycheck. Many think it's free because it's automatic.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text: "What happens to VGLI premiums over time?",
          explanation:
            "VGLI uses an increasing premium structure that doubles at each 5-year age bracket, making it very expensive long-term.",
          points: 1,
          options: [
            { option_text: "They stay level for life", is_correct: false },
            { option_text: "They double every 5 years", is_correct: true },
            { option_text: "They decrease with age", is_correct: false },
            {
              option_text: "They increase 3% annually",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "VA Life Insurance is available to which veterans?",
          explanation:
            "VA Life (S-DVI/VALife) is specifically for veterans with a service-connected disability rating who auto-qualify.",
          points: 1,
          options: [
            { option_text: "All honorably discharged veterans", is_correct: false },
            { option_text: "Only combat veterans", is_correct: false },
            {
              option_text: "Only service-connected disabled veterans",
              is_correct: true,
            },
            { option_text: "Veterans under age 65", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text: "VGLI policies build cash value over time.",
          explanation:
            "VGLI is a term product — no cash value, no living benefits. This is a key gap where private coverage excels.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "What is the maximum coverage amount for VA Life Insurance?",
          explanation:
            "VA Life only covers up to $40k — far below what most families need for mortgage protection and income replacement.",
          points: 1,
          options: [
            { option_text: "$10,000", is_correct: false },
            { option_text: "$40,000", is_correct: true },
            { option_text: "$100,000", is_correct: false },
            { option_text: "$500,000", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "If a veteran becomes disabled while covered by SGLI, they can extend their coverage up to 2 years.",
          explanation:
            "The SGLI Disability Extension provides up to 2 years of free coverage for totally disabled members.",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Which product type do veterans tend to love if they're healthy enough to qualify?",
          explanation:
            "Veterans love IULs because they combine permanent coverage, living benefits, and a cash-value growth component.",
          points: 1,
          options: [
            { option_text: "Term life", is_correct: false },
            { option_text: "Whole life", is_correct: false },
            {
              option_text: "IUL (Indexed Universal Life)",
              is_correct: true,
            },
            { option_text: "VGLI", is_correct: false },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 3: Opening the Call — First Impressions (practice)
  // =========================================================================
  {
    title: "Opening the Call — First Impressions",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Master the critical first 30 seconds of the call — introduction, credibility, and setting the tone.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "The First 30 Seconds",
        rich_text_content: `<h2>The First 30 Seconds</h2>
<p>The opening makes or breaks the call. You have roughly <strong>30 seconds</strong> to establish trust, credibility, and rapport.</p>
<h3>Tone Tips:</h3>
<ul>
<li><strong>Warm and confident</strong> — not salesy, not timid</li>
<li><strong>Respectful</strong> — remember, you're speaking to someone who served</li>
<li>Mention having them <strong>grab a pen and paper</strong> — this engages them actively</li>
<li><strong>Smile while speaking</strong> — they can hear it in your voice</li>
</ul>
<blockquote>Your energy sets the entire tone. If you sound bored, they'll be bored. If you sound rushed, they'll feel pressured. Be present.</blockquote>`,
      },
      {
        content_type: "script_prompt",
        title: "The Introduction",
        script_prompt_text: `Hi {{ CLIENT NAME }}, it's [Your Name] with The Standard Financial Group. We received your request for exploring life insurance options through the private sector. Did I catch you at a bad time?`,
        script_prompt_instructions:
          "Warm, upbeat tone. Pause after asking if it's a bad time — let them respond. Don't rush. Smile as you speak — they can hear it.",
      },
      {
        content_type: "script_prompt",
        title: "Establishing Credibility",
        script_prompt_text: `Ok, before we get started, I just want to make sure you received my state insurance license I emailed to you. I sent that to {{ THEIR EMAIL ADDRESS }}. If you don't see that in your primary inbox, make sure you check your junk...

We do go through some pretty extensive testing and thorough background checks federally, statewide, and also with each insurance company we're contracted with. It's super easy to validate or verify a license as well. If you just go to your state's Department of Insurance website, and punch in my state license number, it will populate everything you need to know about me.`,
        script_prompt_instructions:
          "Confident and transparent tone. This builds trust early — don't skip it. Speak naturally, not like you're reading. If they didn't get the email, resend it live.",
      },
      {
        content_type: "rich_text",
        title: "Pro Tips for the Opening",
        rich_text_content: `<h2>Pro Tips for the Opening</h2>
<ul>
<li><strong>Don't rush past the credibility piece</strong> — it separates you from scammers</li>
<li>Let them verify you. The more <strong>transparent</strong> you are, the more trust you build</li>
<li>If they didn't get the email, <strong>resend it live</strong> on the call</li>
<li>The license verification step is one of the most important differentiators in the entire call</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 4: Discovery — Establishing the Need (practice)
  // =========================================================================
  {
    title: "Discovery — Establishing the Need",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Learn to uncover the emotional 'why' behind every prospect's need — the discovery phase drives the entire sale.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Why Discovery Is Everything",
        rich_text_content: `<h2>Why Discovery Is Everything</h2>
<p>You can't sell the right product if you don't know their situation. Discovery uncovers the emotional <strong>"why"</strong> — coverage isn't about policies, it's about <strong>protecting people</strong>.</p>
<p><strong>Listen more than you talk.</strong> The best agents spend 70% of discovery listening and 30% asking questions. Every piece of information they give you becomes ammunition for the close.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Opening Discovery Questions",
        script_prompt_text: `So if you could... fill me in a little bit more first... what got you looking into life insurance? Was it to cover final arrangements, leave money behind, or cover outstanding debts like a mortgage?...`,
        script_prompt_instructions:
          "Empathetic, curious tone. After asking, STOP talking. Consciously listen & wait to speak. Let them share their story. Take notes on everything they say — you'll reference it later.",
      },
      {
        content_type: "script_prompt",
        title: "Identifying the Beneficiary",
        script_prompt_text: `Now, when you were looking into coverage, were you looking for yourself or did you have a spouse/significant other in mind as well?

Who is the beneficiary... Who are you trying to protect here?

Why do you feel like [beneficiary] will need this?`,
        script_prompt_instructions:
          "Get the beneficiary's name — you'll use it throughout the call. Ask follow-ups: Do they work? Could they maintain mortgage payments alone? The beneficiary becomes your anchor for the rest of the conversation.",
      },
      {
        content_type: "rich_text",
        title: "The Existing Insurance Deep Dive",
        rich_text_content: `<h2>The Existing Insurance Deep Dive</h2>
<p>Most families have <strong>3-4 policies</strong>. Find out:</p>
<ul>
<li><strong>WHAT</strong> they have (term, whole, group through work)</li>
<li><strong>HOW MUCH</strong> coverage</li>
<li><strong>WITH WHICH</strong> companies</li>
<li><strong>WHY</strong> they got each one</li>
</ul>
<p>This is <strong>critical</strong> — if they object later saying "I already have coverage," you can redirect: <em>"No, you said that policy was for burial. This is different — this is mortgage protection."</em></p>`,
      },
      {
        content_type: "script_prompt",
        title: "Existing Insurance Questions",
        script_prompt_text: `Now looking into other insurances... Most families I speak with typically have 3-4 different life insurance policies in place.

Do you have any existing WHOLE LIFE or TERM LIFE insurance?

And do you know how much coverage you have and with what companies?`,
        script_prompt_instructions:
          "Non-judgmental fact-finding. Take detailed notes. Ask WHY they got each policy — you'll reference this later when positioning your product as additive, not replacement.",
      },
      {
        content_type: "rich_text",
        title: "Key Insight: One Policy Can't Do Everything",
        rich_text_content: `<h2>Key Insight: One Policy Can't Do Everything</h2>
<p>Use this line when they mention existing coverage:</p>
<blockquote>"Your mortgage protection isn't getting rid of your [type] policy — you keep that. You can't have one policy do several different things because you would just run out of money."</blockquote>
<p>This reframes your product as <strong>additive, not replacement</strong>. They're not replacing anything — they're filling a gap.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Setting the Stage — Your Role & Process (practice)
  // =========================================================================
  {
    title: "Setting the Stage — Your Role & Process",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Frame your role as a medical field underwriter and set expectations for the call process.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "The Power of Framing",
        rich_text_content: `<h2>The Power of Framing</h2>
<p>Before presenting products, you need to frame your role. Three key elements:</p>
<ol>
<li><strong>"Medical field underwriter"</strong> — positions you as an expert advocate, not a salesperson</li>
<li><strong>"35 companies"</strong> — communicates breadth and that you're shopping for the best deal</li>
<li><strong>Process explanation</strong> — manages expectations and reduces pressure ("we have to apply, can't buy outright")</li>
</ol>`,
      },
      {
        content_type: "script_prompt",
        title: "Role Framing & Process Overview",
        script_prompt_text: `Alright {{ CLIENT NAME }}, I'll make this pretty quick for you. My job is pretty simple. I'm what's called a medical field underwriter and I am contracted with roughly 35 different insurance companies that specialize in mortgage protection.

This gives me the ability to search around and see which companies have the best coverage options and costs that are tailored to you specifically.

We'll just spend a couple minutes going over the basics regarding your mortgage, finances and health, to see which company you're most likely to qualify with...

After we go over the numbers, we'll submit an application to that carrier because anything we go over today can't be purchased outright. We would have to apply for it ultimately and I'm happy to help you with that process.

From there, it's a waiting game... If you're declined, no big deal. We would just circle to the next best option... If you're approved you'll be insured immediately...

Does that make sense?`,
        script_prompt_instructions: `Confident, matter-of-fact delivery. The "attorney, not judge" analogy is key — you're on their side. Emphasize "no big deal if declined" to reduce pressure. The fact that they can't buy outright removes the scary commitment moment.`,
      },
      {
        content_type: "script_prompt",
        title: "The Attorney Analogy",
        script_prompt_text: `So, I'm not the judge, I'm more like your attorney, so the more information you can provide, the more helpful it will be in finding the best carrier for you.`,
        script_prompt_instructions:
          "Short but powerful. This one line shifts the entire dynamic from adversarial to collaborative. Pause briefly after for it to land.",
      },
      {
        content_type: "rich_text",
        title: "Why This Framing Works",
        rich_text_content: `<h2>Why This Framing Works</h2>
<p>Three psychological principles at play:</p>
<ol>
<li><strong>Expert authority</strong> — "medical field underwriter" sounds specialized and knowledgeable</li>
<li><strong>Abundance of choice</strong> — "35 companies" means they're getting the best deal, not just your company's product</li>
<li><strong>Low pressure</strong> — "can't purchase outright, must apply" removes the scary commitment moment from the call</li>
</ol>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 6: Health & Financial Qualification (practice)
  // =========================================================================
  {
    title: "Health & Financial Qualification",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Navigate health and financial questions with a conversational, trust-building approach.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Making Health Questions Feel Normal",
        rich_text_content: `<h2>Making Health Questions Feel Normal</h2>
<p>This is where many agents lose trust. The key is a <strong>conversational tone</strong> — not an interrogation.</p>
<p>Normalize it: <em>"Even if you've been prescribed and not actually took the medication, it can still be on your medical records."</em></p>
<p>The height/weight humor for women lightens the mood and shows personality.</p>
<blockquote>Remember: you're their attorney, not the judge. The more comfortable they feel, the more honest they'll be.</blockquote>`,
      },
      {
        content_type: "script_prompt",
        title: "Health Qualification Script",
        script_prompt_text: `I've got your age as {{ LEAD_AGE }}, and your DOB is?

Are you a smoker?

And as far as your health goes, do you have any medical conditions or take any prescriptions for anything in the last 10 years, even if you've been prescribed and not actually took the medication. It can still be on your medical records.

Any history at all of heart attack, stroke, cancer or diabetes?

[If diabetes]: What type? What's your A1C? What medications?
[Blood pressure]: On medication? What readings?
[Cholesterol]: On medication?
[Kidney/liver issues?]
[Thyroid?]
[Asthma or COPD? Oxygen or sleep apnea?]
[Lupus or arthritis?]
[Anxiety, depression, or bipolar?]
[Any surgeries or hospitalizations in the last 5 years?]

Now I didn't think so, but they do just require us to ask — any DUIs or felonies?

So I know I'm not supposed to ask you this, but what's a good height and weight for you before breakfast?`,
        script_prompt_instructions: `Conversational, not clinical. Flow naturally between questions. For the DUI/felony question: "I didn't think so, they do just require us to ask." For height/weight with women: "So I know I'm not supposed to ask you this, but what's a good height and weight for you before breakfast?" Keep it light.`,
      },
      {
        content_type: "script_prompt",
        title: "Occupation & Income Questions",
        script_prompt_text: `For the sake of the application, about how much would you say you bring home per month? Just a ballpark.

[If married]: Is your spouse currently working? What would you say they bring in per month?`,
        script_prompt_instructions: `"Just a ballpark" reduces pressure. Never make them feel judged about income. This info helps size the policy appropriately.`,
      },
      {
        content_type: "rich_text",
        title: "Handling the 'I Don't See the Need' Pushback",
        rich_text_content: `<h2>Handling the "I Don't See the Need" Pushback</h2>
<p>If they don't see coverage as a need, <strong>repaint the picture</strong>. Don't argue — redirect to the beneficiary.</p>
<p>The reframe from "you" to the beneficiary is the most powerful pivot in the script.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Repainting the Picture",
        script_prompt_text: `I totally understand and it's great that you're doing well financially. But honestly, that's all the more reason to treat life insurance as a necessity.

High income usually means higher expenses, and often more financial responsibilities — things like a mortgage, kids' education, or family support.

So the question isn't "Can you afford life insurance?" — it's "Can [beneficiary] afford for you to not have it?"

Let's just look at what's available — worst case, we find something that doesn't make sense and shake hands, walk away and still be friends. Best case, you lock in peace of mind.

Sounds good?`,
        script_prompt_instructions: `Empathetic but firm. The reframe from "you" to the beneficiary is the pivot. Always bring it back to who they're protecting, not what they're spending.`,
      },
    ],
  },

  // =========================================================================
  // LESSON 7: Mid-Script Knowledge Check (quiz)
  // =========================================================================
  {
    title: "Mid-Script Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Validate your understanding of the opening, discovery, framing, and health qualification phases.",
    is_required: true,
    quiz: {
      pass_threshold: 70,
      max_attempts: 3,
      shuffle_questions: true,
      show_correct_answers: true,
      shuffle_options: true,
      xp_bonus_perfect: 15,
      questions: [
        {
          question_type: "multiple_choice",
          question_text: "What is the primary goal of the opening?",
          explanation:
            "The opening sets the trust foundation. Without credibility, nothing else in the call works.",
          points: 1,
          options: [
            {
              option_text: "Build rapport and establish credibility",
              is_correct: true,
            },
            {
              option_text: "Present product options immediately",
              is_correct: false,
            },
            {
              option_text: "Ask about their health conditions",
              is_correct: false,
            },
            { option_text: "Collect their SSN", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "You should criticize the prospect's existing coverage to create urgency.",
          explanation:
            "Never criticize — discover WHY they have each policy so you can position your product as additive, not replacement.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The 'medical field underwriter' framing is designed to:",
          explanation:
            "This reframes the relationship from 'I'm selling you' to 'I'm advocating for you.'",
          points: 1,
          options: [
            {
              option_text:
                "Position you as an expert consultant, not a salesperson",
              is_correct: true,
            },
            {
              option_text: "Make you sound more official for compliance",
              is_correct: false,
            },
            {
              option_text: "Confuse the prospect into trusting you",
              is_correct: false,
            },
            {
              option_text: "Justify charging higher premiums",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When asking health questions, the best approach is:",
          explanation:
            "Clinical or apologetic tones make people uncomfortable. Keep it natural.",
          points: 1,
          options: [
            {
              option_text:
                "Conversational and matter-of-fact — normalize the process",
              is_correct: true,
            },
            {
              option_text: "Clinical and formal like a doctor's office",
              is_correct: false,
            },
            {
              option_text: "Apologetic — 'Sorry I have to ask this'",
              is_correct: false,
            },
            {
              option_text: "Skip the hard questions to avoid discomfort",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "You should skip the credibility piece (license verification) to save time.",
          explanation:
            "The credibility piece separates you from scammers. It's one of the most important parts of the opening.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When a prospect says 'I don't see the need,' you should:",
          explanation:
            "The reframe from their perspective to the beneficiary's perspective is the most powerful pivot in the script.",
          points: 1,
          options: [
            {
              option_text:
                "Redirect focus to the beneficiary — 'Can they afford for you NOT to have it?'",
              is_correct: true,
            },
            {
              option_text: "Argue about the importance of life insurance",
              is_correct: false,
            },
            {
              option_text: "End the call — they're not interested",
              is_correct: false,
            },
            {
              option_text: "Offer a discount to create urgency",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text: "The 'attorney, not judge' analogy communicates:",
          explanation:
            "This line instantly builds alliance and encourages openness during health/financial questions.",
          points: 1,
          options: [
            {
              option_text:
                "You're on their side and the more they share, the better you can help",
              is_correct: true,
            },
            {
              option_text: "You have legal authority over their case",
              is_correct: false,
            },
            {
              option_text: "They should hire a lawyer before proceeding",
              is_correct: false,
            },
            {
              option_text: "The insurance company is the enemy",
              is_correct: false,
            },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 8: Product Presentations — Policy Types (content)
  // =========================================================================
  {
    title: "Product Presentations — Policy Types",
    lesson_type: "content",
    estimated_duration_minutes: 12,
    xp_reward: 30,
    description:
      "Master the 5 core product presentations — Whole Life, Cash Back Term, Level Term, IUL, and Graded/Guaranteed Issue.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Know Your Arsenal",
        rich_text_content: `<h2>Know Your Arsenal</h2>
<p>You need to master <strong>5 product types</strong> and know when to use each one. The system recommends the best carrier, but <strong>YOU</strong> need to present it with confidence.</p>
<p>Each product script follows a pattern:</p>
<ol>
<li>What it is</li>
<li>Key benefits</li>
<li>Living benefits</li>
<li>Cash value (if applicable)</li>
<li>Immediate coverage</li>
</ol>
<p>Always end with <strong>"Does that make sense?"</strong> — it's a micro-commitment that keeps them engaged.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Whole Life Presentation",
        script_prompt_text: `The product I'm going to try to get you approved for is a whole life policy. This is 100% guaranteed to pay out because it lasts your whole life.

Your premiums will never increase — what you pay today is what you pay for the rest of your life.

It comes with built-in living benefits. What that means is if you're ever diagnosed as critically ill, chronically ill, or terminally ill, you can access a portion of your death benefit while you're still alive — tax-free — to cover medical bills, treatments, or anything you need.

It also builds cash value over time, which you can borrow against or withdraw from if needed.

And the best part — you're insured immediately upon approval. No waiting period.

Does that make sense?`,
        script_prompt_instructions:
          "Steady, reassuring tone. Emphasize 'guaranteed to pay out' and 'premiums will never increase.' Have them write down each benefit as you go through them.",
      },
      {
        content_type: "script_prompt",
        title: "Cash Back Term Presentation",
        script_prompt_text: `The product I'm going to try to get you approved for is a cash back term. It is 100% guaranteed to pay out.

Here's what makes it unique — if you outlive the policy, they will return 100% of the money you had put into it plus interest, tax free.

So either your family gets the full death benefit if something happens to you, or YOU get all your money back if nothing does. It's essentially a win-win.

It also comes with built-in living benefits — critical, chronic, or terminal illness access.

And it builds cash value that you can access during the life of the policy.

Does that make sense?`,
        script_prompt_instructions:
          "This is the crowd-pleaser. Emphasize the 'get your money back' angle — it's the unique selling point. Make it sound like a no-lose scenario. Show genuine excitement about this product.",
      },
      {
        content_type: "script_prompt",
        title: "Level Term Presentation",
        script_prompt_text: `The product I'm going to try to get you approved for is a [10/20/30 year] level term.

It's 100% guaranteed to pay out during the term. Your premiums are locked in — they will never increase for the entire [10/20/30 year] period.

It comes with built-in living benefits — critical illness, chronic illness, and terminal illness riders.

You're insured immediately upon approval.

Does that make sense?`,
        script_prompt_instructions:
          "Shortest product pitch. Clean and simple. Use when budget is tight or health limits options. Don't oversell it — let the simplicity speak for itself.",
      },
      {
        content_type: "script_prompt",
        title: "IUL (Indexed Universal Life) Presentation",
        script_prompt_text: `The product I'm going to try to get you approved for is an IUL — an Indexed Universal Life policy.

Let me break this down simply. Think of it as having 2 buckets:

Bucket 1 is your cost of coverage — this pays for your death benefit and living benefits, just like any other policy.

Bucket 2 is your cash value — and here's where it gets exciting. This bucket follows the S&P 500 index. When the market goes up, your cash value grows. When the market goes down, you have a floor — you never lose money.

Over time, that cash value can grow significantly, and you can access it tax-free through policy loans — for retirement, emergencies, whatever you need.

Plus you get the same living benefits — critical, chronic, and terminal illness coverage.

Veterans especially love this because it's permanent coverage with real wealth-building potential.

Does that make sense?`,
        script_prompt_instructions:
          "This is the premium product. The '2 buckets' explanation makes it accessible. Vets especially love this one. Show genuine excitement — this IS the superior product. Take your time explaining the S&P 500 component.",
      },
      {
        content_type: "script_prompt",
        title: "Graded / Guaranteed Issue Presentation",
        script_prompt_text: `What I'm going to recommend just given your health is what's called a guaranteed issue life insurance policy.

I have good news — there IS something available for you.

This is a whole life policy that lasts your entire life. It has a 2-year waiting period — during those first 2 years, if something were to happen, your beneficiary gets 100% of the premiums back plus an extra 10%.

After that 2-year window, your beneficiary receives the full death benefit.

Your premiums are locked in and will never increase.

Does that make sense?`,
        script_prompt_instructions:
          "Sensitive delivery — this is for health-challenged prospects. Be positive: 'I have good news — there IS something available for you.' Don't make them feel like a last resort. Emphasize the positive — they CAN get coverage.",
      },
      {
        content_type: "rich_text",
        title: "When to Use Each Product",
        rich_text_content: `<h2>When to Use Each Product</h2>
<table>
<thead><tr><th>Prospect Profile</th><th>Product</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Healthy + wants permanent</td><td><strong>Whole Life</strong></td><td>Guaranteed payout, level premiums, cash value</td></tr>
<tr><td>Healthy + wants money back</td><td><strong>Cash Back Term</strong></td><td>Return of premium if they outlive — the crowd-pleaser</td></tr>
<tr><td>Healthy + budget-conscious</td><td><strong>Level Term</strong></td><td>Lowest cost, simple, locked premiums</td></tr>
<tr><td>Healthy + wants growth</td><td><strong>IUL</strong></td><td>Cash value growth, S&P 500 index, tax-free loans — vets love this</td></tr>
<tr><td>Health challenges</td><td><strong>Graded / GI</strong></td><td>No medical underwriting, 2-year waiting period</td></tr>
</tbody>
</table>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 9: Gold / Silver / Bronze — Presenting Options (practice)
  // =========================================================================
  {
    title: "Gold / Silver / Bronze — Presenting Options",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Present tiered pricing options using the Gold/Silver/Bronze framework and close toward the application.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "The Psychology of Tiered Options",
        rich_text_content: `<h2>The Psychology of Tiered Options</h2>
<p>Why 3 options work:</p>
<ul>
<li><strong>Anchoring</strong> — Gold sets the ceiling, making Silver and Bronze feel reasonable</li>
<li><strong>The compromise effect</strong> — most people naturally pick the middle option</li>
<li><strong>"Foot in the door"</strong> — Bronze removes the barrier to starting</li>
</ul>
<p><strong>Always let the client pick</strong> — your job is to present, not pressure. The choice gives them ownership of the decision.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Presenting Gold / Silver / Bronze",
        script_prompt_text: `I am going to give you some options here... if what I'm showing you is too much or too little, let me know...

Write down the words Gold, Silver and Bronze.

GOLD — This is going to be on the pricey side, I wouldn't recommend this but they still have me show it to you. This would be [coverage amount] for [monthly premium].

SILVER — Most popular choice. This balances good coverage with an affordable monthly cost. [Coverage amount] for [monthly premium].

BRONZE — This would just be to get your foot in the door and lock in your current age, health and habits. [Coverage amount] for [monthly premium].

Now if any of those are too much or too little, I can always adjust in real time. What jumps out to you?`,
        script_prompt_instructions:
          "Have them write G/S/B down — it engages them. Present Gold first as the anchor. Highlight Silver as 'most popular.' Position Bronze as a smart starting point, not a downgrade. The real-time adjustment offer reduces pressure.",
      },
      {
        content_type: "script_prompt",
        title: "The Close — Moving to Application",
        script_prompt_text: `Perfect, so now unfortunately, I don't get to make the final decision, if I did everyone would get approved...

But the insurance company does that. So we still have to submit your application to the home office to see if you can even qualify.

But if you are able to get approved through underwriting, which option makes the most financial sense that you want to leave behind to [beneficiary]? (gold, silver or bronze)

[Wait for answer]

And that [coverage amount] is going to be comfortable for you every single month?`,
        script_prompt_instructions:
          "PAUSE after asking which option. Let them answer. Don't fill the silence. Then confirm affordability. If hesitation, recommend going lower — sustainability matters more than size.",
      },
      {
        content_type: "rich_text",
        title: "Handling Hesitation on Price",
        rich_text_content: `<h2>Handling Hesitation on Price</h2>
<p>If they hesitate on monthly cost, <strong>always recommend going lower</strong>:</p>
<blockquote>"If this is something you feel that you cannot maintain month after month, we can look at lower options. Anything you choose... you can always increase your coverage later on."</blockquote>
<p><strong>Never let ego push a client into a premium they'll cancel in 3 months.</strong> A maintained Bronze is infinitely better than a cancelled Silver.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 10: Objection Handling (practice)
  // =========================================================================
  {
    title: "Objection Handling",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Handle the top objections — 'I need to think about it,' 'I need to talk to my spouse,' and 'I can\\'t afford it.'",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Objections Are Not Rejections",
        rich_text_content: `<h2>Objections Are Not Rejections</h2>
<p>Every objection is a request for <strong>more information or reassurance</strong>.</p>
<p>The #1 rule: <strong>Acknowledge first, then redirect.</strong> Never argue.</p>
<p>The 3 most common objections:</p>
<ol>
<li>"I need to think about it"</li>
<li>"I need to talk to my spouse"</li>
<li>"I'm not sure I can afford it"</li>
</ol>`,
      },
      {
        content_type: "script_prompt",
        title: "Think About It / Unsure",
        script_prompt_text: `Totally understand — and just so you know, applying now doesn't mean you're locked into anything. You're simply seeing what you can get approved for.

There's no commitment until you accept the policy. And if something changes, we can always adjust.`,
        script_prompt_instructions:
          "Calm, zero-pressure tone. The key reframe: applying does NOT equal buying. They're just finding out what's available to them.",
      },
      {
        content_type: "script_prompt",
        title: "Need to Talk to Spouse (Wife Version)",
        script_prompt_text: `Oh, trust me, I get it — I'm a wife too. But girl, let's be real... do you really wanna go to your spouse with a big ol' "maybe"?

That's like telling them, "Hey babe, pack your bags, we might be going to Bora Bora!"

Let's see if you're approved first, then you can take them the real numbers and be like, "Look what I got us!"`,
        script_prompt_instructions:
          "Playful, relatable tone. Use humor to disarm. The logic is sound — show up with real numbers, not a maybe. Adapt the humor to match their energy.",
      },
      {
        content_type: "script_prompt",
        title: "Need to Talk to Spouse (Husband Version)",
        script_prompt_text: `Oh, I get it — I'm married too, so I know the drill. But honestly... do you really wanna walk in the house and tell your wife, "Hey, maybe we're getting this policy... maybe not"?

That's like telling her you might be taking her to dinner and then showing up with drive-thru fries.

Let's at least see if you're approved first, so when you talk to her, you've got the real numbers and not just a maybe.`,
        script_prompt_instructions:
          "Bro-level humor. Same logical structure as the wife version — real numbers beat maybes. Adapt the humor to match their energy and personality.",
      },
      {
        content_type: "rich_text",
        title: "The Urgency Nudge",
        rich_text_content: `<h2>The Urgency Nudge</h2>
<p>Close the objection handling with this key point:</p>
<blockquote>"It's better to apply now and push the start date out a few days so you can talk with your spouse — because if we wait too long, you may not qualify later. Health and age are everything when it comes to life insurance."</blockquote>
<p><strong>Time and health</strong> are the two things they can't control. This isn't pressure — it's truth.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Soft Close After Objection",
        script_prompt_text: `So given everything you've told me, it sounds like SOMETHING is going to be better than nothing and that this would be more of a necessity for [beneficiary]...

Would you agree with that?`,
        script_prompt_instructions:
          "This is the trial close after handling objections. If they agree, transition to application. If they push back, circle back to the beneficiary's need. Don't rush past the pause — let them answer.",
      },
    ],
  },

  // =========================================================================
  // LESSON 11: The Application Process (practice)
  // =========================================================================
  {
    title: "The Application Process",
    lesson_type: "practice",
    estimated_duration_minutes: 12,
    xp_reward: 30,
    description:
      "Guide the prospect through the application seamlessly — from basic info through SSN, banking, and submission.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Momentum Is Everything",
        rich_text_content: `<h2>Momentum Is Everything</h2>
<p>Once they say yes, move <strong>seamlessly</strong> into the application. Don't give them space to second-guess.</p>
<p>Keep it conversational — you're <strong>"just gathering info."</strong> Every question should feel routine, not high-stakes.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Collecting Basic Info",
        script_prompt_text: `Let's get started on the app.

Can you confirm how you spell your full legal name?

Date of birth?

Height and weight again, just to double check?

What's your current address?

And what's the best email to send your documents to?`,
        script_prompt_instructions:
          "Brisk, professional pace. These are easy questions that build compliance momentum. They said yes — now you're just handling paperwork.",
      },
      {
        content_type: "script_prompt",
        title: "The SSN Conversation",
        script_prompt_text: `Now we're at the section where the insurance company checks your prescription history to make sure you're healthy enough to qualify.

They just want to confirm you're not strapped to a hospital bed or over 500 lbs — it's how they avoid needing bloodwork or urine tests.

To do that, they need your social. This goes directly to the carrier, not me, and is standard across the industry...

Think of it like TSA at the airport — they don't let you on the plane without ID. The insurance company needs to verify who you are to issue a policy.

And I promise you, this is more secure than Grandma's secret sweet potato pie recipe.`,
        script_prompt_instructions:
          "This is the #1 sticking point. Lead with the WHY (prescription check), not the ask. Humor helps. If they push back, offer to walk through license verification or FaceTime to build trust.",
      },
      {
        content_type: "rich_text",
        title: "If They Still Resist on SSN",
        rich_text_content: `<h2>If They Still Resist on SSN</h2>
<p>Offer to:</p>
<ul>
<li><strong>FaceTime</strong> — show your face and credentials</li>
<li><strong>Walk through credential verification</strong> — Department of Insurance lookup</li>
<li>Remind them: <em>"At the end of the day, I would be the one to make sure that check gets delivered to your family, so I want to make sure you're comfortable with me."</em></li>
</ul>
<p><strong>Trust is earned, not demanded.</strong> If they still won't provide it, respect their boundary and offer to follow up later.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Banking & Effective Date",
        script_prompt_text: `Now we're at the effective date. Most people choose to start immediately so they're covered right away...

Who do you bank with so I can make sure they partner with them?

The account number?

The carrier requires a valid U.S. bank account to prevent fraud and confirm the policy is legitimate...

Think of it like Netflix or a gym membership — it's automatic, hassle-free, and it protects your family every single month without you having to think about it.

And nothing comes out until the carrier officially approves you and issues your policy. Think of it like putting something on hold at Target — they don't charge you until it's yours.`,
        script_prompt_instructions:
          "Frame banking as fraud protection FOR THEM. The Netflix/gym analogy normalizes automatic payments. If they worry about surprise drafts: 'Nothing comes out until the carrier officially approves you.'",
      },
      {
        content_type: "script_prompt",
        title: "Health Recap & Small Talk",
        script_prompt_text: `Before I submit this, any other health conditions we didn't go over?

While I'm plugging that in, quick question — what branch were you in?

How long did you serve?`,
        script_prompt_instructions:
          "The small talk here is strategic — it builds rapport during a tense moment (submission) and honors their service. Genuine interest goes a long way. Thank them for their service.",
      },
    ],
  },

  // =========================================================================
  // LESSON 12: Closing & Long-Term Relationship (content)
  // =========================================================================
  {
    title: "Closing & Long-Term Relationship",
    lesson_type: "content",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Deliver the final recap, set expectations, and build a lifelong client relationship.",
    is_required: true,
    content_blocks: [
      {
        content_type: "script_prompt",
        title: "The Final Recap",
        script_prompt_text: `Alright [Name], here's the final recap:

Coverage Amount: $____
Monthly Premium: $____
Carrier: [Carrier Name] (if approved)
Effective Date: ____

If for any reason this isn't approved, I'll follow up with a backup plan that's just as strong.

You'll hear back in 1-2 business days if it's not instant approval.`,
        script_prompt_instructions:
          "Clean, organized, confident. No hesitation. Reassure with the backup plan mention — it shows you have options and won't leave them hanging.",
      },
      {
        content_type: "script_prompt",
        title: "Building the Lifelong Relationship",
        script_prompt_text: `Lastly, I'm going to be your life insurance broker for life. If anything ever changes or you have questions, you can call or text me directly at [Your Number].

I've got you covered now and always — sound good?

Do you have any questions before we wrap up?`,
        script_prompt_instructions:
          "Warm, genuine. This isn't just a close — it's the start of a relationship. Referrals come from agents who stay in touch. Mean what you say.",
      },
      {
        content_type: "rich_text",
        title: "The Complete Call Flow — Summary",
        rich_text_content: `<h2>The Complete Call Flow — Summary</h2>
<p>Bookmark this lesson for quick reference before calls:</p>
<ol>
<li><strong>Opening & Credibility</strong> — Introduce yourself, verify license email</li>
<li><strong>Discovery & Need</strong> — What got them looking? Who's the beneficiary?</li>
<li><strong>Existing Insurance</strong> — What do they have, how much, with who, and why?</li>
<li><strong>Role Framing</strong> — Medical field underwriter, 35 companies, attorney analogy</li>
<li><strong>Health & Financial Qualification</strong> — Full health checklist, income, occupation</li>
<li><strong>Soft Close</strong> — "Something is better than nothing for [beneficiary]"</li>
<li><strong>Company Presentation</strong> — Present the recommended carrier</li>
<li><strong>Policy Type Presentation</strong> — Whole Life / Cash Back / Term / IUL / GI</li>
<li><strong>Gold / Silver / Bronze</strong> — Three tiered options</li>
<li><strong>Close</strong> — "Which option makes the most financial sense for [beneficiary]?"</li>
<li><strong>Objection Handling</strong> — Think about it / Spouse / Afford</li>
<li><strong>Application</strong> — Basic info → SSN → Banking → Submit</li>
<li><strong>Recap & Relationship</strong> — Confirm details, set expectations, lifelong broker</li>
</ol>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 13: Final Assessment — Complete Script Mastery (quiz)
  // =========================================================================
  {
    title: "Final Assessment — Complete Script Mastery",
    lesson_type: "quiz",
    estimated_duration_minutes: 8,
    xp_reward: 30,
    description:
      "Comprehensive assessment covering the entire veteran life insurance sales call flow.",
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
            "The correct order for the full sales call is:",
          explanation:
            "Following the flow prevents premature objections and builds natural momentum.",
          points: 1,
          options: [
            {
              option_text:
                "Opening → Discovery → Role Framing → Health Qs → Soft Close → Product Presentation → G/S/B → Close → Application → Recap",
              is_correct: true,
            },
            {
              option_text:
                "Product Presentation → Discovery → Close → Application",
              is_correct: false,
            },
            {
              option_text:
                "Health Qs → Opening → G/S/B → Discovery → Close",
              is_correct: false,
            },
            {
              option_text:
                "Opening → Product Presentation → Close → Discovery → Application",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When a prospect says 'I need to talk to my spouse,' the best response is:",
          explanation:
            "A 'maybe' is weaker than 'here's what I qualified for.' Help them show up with something concrete.",
          points: 1,
          options: [
            {
              option_text:
                "Acknowledge, use humor, then suggest getting approved first so they have real numbers to share",
              is_correct: true,
            },
            {
              option_text: "Tell them their spouse would want them to sign now",
              is_correct: false,
            },
            {
              option_text: "End the call and schedule a follow-up",
              is_correct: false,
            },
            {
              option_text: "Offer a bigger discount to close immediately",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "You should always present the Gold tier as your recommendation.",
          explanation:
            "Gold is the anchor, not the recommendation. Silver is positioned as 'most popular' — let the prospect choose what fits.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text: "The SSN request should be framed as:",
          explanation:
            "Lead with the WHY, not the ask. People are more willing to share when they understand the purpose.",
          points: 1,
          options: [
            {
              option_text:
                "A prescription history verification required by the carrier for approval",
              is_correct: true,
            },
            {
              option_text: "A mandatory government requirement",
              is_correct: false,
            },
            {
              option_text: "A credit check for premium pricing",
              is_correct: false,
            },
            {
              option_text: "Something you need for your records",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "If a prospect can't afford the Silver option, you should:",
          explanation:
            "A maintained Bronze is infinitely better than a cancelled Silver. Sustainability matters.",
          points: 1,
          options: [
            {
              option_text:
                "Recommend the Bronze as a smart starting point with the ability to increase later",
              is_correct: true,
            },
            {
              option_text: "Push harder on the Silver — they'll find the money",
              is_correct: false,
            },
            {
              option_text: "End the call — they can't afford coverage",
              is_correct: false,
            },
            {
              option_text: "Offer to split the premium with them",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "The 'attorney, not judge' analogy should be used during the closing.",
          explanation:
            "This analogy is used during the role framing / process explanation phase — before health questions — to encourage openness.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Veterans especially respond well to which product type?",
          explanation:
            "Vets love the combination of permanent coverage, living benefits, and investment-grade cash value growth.",
          points: 1,
          options: [
            {
              option_text:
                "IUL (Indexed Universal Life) — if healthy enough to qualify",
              is_correct: true,
            },
            { option_text: "Level term — cheapest option", is_correct: false },
            {
              option_text: "Guaranteed issue — easiest to qualify",
              is_correct: false,
            },
            { option_text: "VGLI — they already know it", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When collecting banking information, the best analogy is:",
          explanation:
            "Normalizing automatic payments with familiar comparisons reduces resistance.",
          points: 1,
          options: [
            {
              option_text:
                "Netflix/gym membership — automatic, hassle-free, and it protects your family",
              is_correct: true,
            },
            {
              option_text: "A mortgage payment — you're used to it",
              is_correct: false,
            },
            {
              option_text: "A savings account — it's like paying yourself",
              is_correct: false,
            },
            {
              option_text: "A utility bill — it's just another bill",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "After handling an objection, the next step is:",
          explanation:
            "Always follow objection handling with a trial close to test if you've resolved the concern.",
          points: 1,
          options: [
            {
              option_text:
                "Trial close — 'Would you agree that something is better than nothing for [beneficiary]?'",
              is_correct: true,
            },
            {
              option_text: "Move straight to the application",
              is_correct: false,
            },
            {
              option_text: "Present more product options",
              is_correct: false,
            },
            {
              option_text: "Ask if they have any more objections",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "If the prospect is declined by the first carrier, the process is over.",
          explanation:
            "With ~35 contracted carriers, there's usually a next-best option. Circle to the next carrier and keep going.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
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
  console.log("🚀 Starting Veteran Life Insurance Module seed...\n");

  // Idempotency check — does module already exist?
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
    console.log(
      "To re-seed, delete the existing module first.",
    );
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
    console.log(`Creating lesson ${i + 1}/${LESSONS.length}: "${lesson.title}"...`);

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
        console.log(`    ✓ Block ${j}: "${block.title}" (${block.content_type})`);
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
          console.error(
            `  ✗ Failed to create question ${k}:`,
            qnErr,
          );
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
