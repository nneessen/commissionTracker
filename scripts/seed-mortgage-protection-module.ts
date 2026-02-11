// scripts/seed-mortgage-protection-module.ts
// Seed script: Mortgage Protection Sales Script training module
// Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-mortgage-protection-module.ts

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
    "Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx scripts/seed-mortgage-protection-module.ts",
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
const MODULE_TITLE = "Mortgage Protection Sales Script";
const MODULE_DESCRIPTION =
  "Master the complete mortgage protection sales call — from opening fresh and aged leads, through discovery, needs analysis, health qualification, product education (Term, Whole Life, IUL), equity vs mortgage protection, quoting, objection handling, application, and cementing the sale.";
const MODULE_CATEGORY = "script_training";
const MODULE_DIFFICULTY = "intermediate";
const MODULE_DURATION = 120;
const MODULE_XP = 300;
const MODULE_TAGS = [
  "mortgage-protection",
  "life-insurance",
  "sales-script",
  "equity-protection",
  "term-life",
  "whole-life",
  "IUL",
];

// ---------------------------------------------------------------------------
// Lesson data
// ---------------------------------------------------------------------------
const LESSONS: LessonSeed[] = [
  // =========================================================================
  // LESSON 1: Opening the Call — Fresh & Aged Leads (practice)
  // =========================================================================
  {
    title: "Opening the Call — Fresh & Aged Leads",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Master opening scripts for both fresh and aged leads, plus establishing credibility with license verification.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Two Types of Leads, Two Approaches",
        rich_text_content: `<h2>Two Types of Leads, Two Approaches</h2>
<p>Your opening changes depending on whether the lead is <strong>fresh</strong> (recently submitted) or <strong>aged</strong> (submitted weeks/months ago).</p>
<ul>
<li><strong>Fresh leads</strong> — They remember filling out the form. Be direct and professional.</li>
<li><strong>Aged leads</strong> — They probably forgot. You need to earn the right to their time first.</li>
</ul>
<p>Both openings end the same way: <strong>establishing credibility</strong> with your license verification. This step is non-negotiable.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Fresh Lead Introduction",
        script_prompt_text: `Hi {{ LEAD NAME }}, thanks for taking my call. This is [Your Name] from Sitka Life. I'm just giving you a call about your mortgage payoff options that you had requested. I'm the underwriter assigned to your case and have about 10 minutes before my next appointment. I just need to confirm a couple details first if that's ok with you.

I have your email as…
I have your state as…`,
        script_prompt_instructions:
          "Confident, professional tone. The '10 minutes before my next appointment' creates urgency and positions you as busy/in-demand. Confirming their email and state builds compliance momentum with easy yes/no answers.",
      },
      {
        content_type: "script_prompt",
        title: "Aged Lead Introduction",
        script_prompt_text: `{{ Client Name }}, thanks for taking my call. It's [Your Name] with Sitka Life. Listen {{ Client Name }}, I know I'm interrupting your day. Can I have 15 seconds to tell you why I called?`,
        script_prompt_instructions:
          "Respectful, direct tone. Acknowledging you're interrupting earns respect. The '15 seconds' ask is tiny — almost nobody says no. Wait for their response before continuing.",
      },
      {
        content_type: "script_prompt",
        title: "Aged Lead — The Explanation",
        script_prompt_text: `So… you probably don't remember filling this form out, but you had requested information regarding mortgage protection, and I was assigned to go over that with you. Is now a bad time?

Are you even still looking at some options?`,
        script_prompt_instructions:
          "Casual, no-pressure tone. 'You probably don't remember' normalizes the gap. 'Is now a bad time?' is better than 'Is now a good time?' — it's harder to say yes to. If they're lukewarm, ask: 'What had you looking into it in the first place?'",
      },
      {
        content_type: "rich_text",
        title: "Interest-Gauging Questions for Aged Leads",
        rich_text_content: `<h2>Interest-Gauging Questions for Aged Leads</h2>
<p>If the aged lead seems uncertain, use these to re-engage:</p>
<ul>
<li><strong>"What had you looking into it in the first place?"</strong></li>
<li>Common responses: "Make sure mortgage is taken care of" / "Make sure family isn't stuck with that mortgage balance" / "Because I'm getting older"</li>
</ul>
<p>These responses tell you their <strong>emotional driver</strong>. Write it down — you'll use it throughout the call.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Establishing Credibility",
        script_prompt_text: `Ok, before we get started, I just want to make sure you received my state insurance license I emailed to you. I sent that to {{ THEIR EMAIL ADDRESS }}. If you don't see that in your primary inbox, make sure you check your junk, because sometimes it can go in there. I just need to make sure you received it because I'm required by the state to send over my credentials.

We do go through some pretty extensive testing and thorough background checks federally, statewide, and also with each insurance company we're contracted with. It's super easy to validate or verify a license as well. If you just go to your state's Department of Insurance website, and punch in my state license number, it will populate everything you need to know about me.`,
        script_prompt_instructions:
          "Confident and transparent. This is the same credibility piece from the vet script — it separates you from scammers. Don't rush through it. Let them verify you. Have them grab a pen and paper before you continue.",
      },
    ],
  },

  // =========================================================================
  // LESSON 2: Discovery — Understanding Their Situation (practice)
  // =========================================================================
  {
    title: "Discovery — Understanding Their Situation",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Uncover why they need mortgage protection, their family situation, and who they're trying to protect.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Discovery Drives Everything",
        rich_text_content: `<h2>Discovery Drives Everything</h2>
<p>The discovery phase reveals <strong>who they're protecting</strong> and <strong>why they care</strong>. Every answer becomes a tool you'll use later in the call — during the close, during objection handling, during the application.</p>
<p><strong>Listen more than you talk.</strong> Take detailed notes on every answer.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "The Core Discovery Question",
        script_prompt_text: `So, fill me in a little bit.. Tell me the reason you inquired about mortgage protection.`,
        script_prompt_instructions:
          "Open-ended and conversational. After asking, STOP and listen. Common responses: 'I'm getting older,' 'I don't have any coverage,' 'Just saw an ad on Facebook.' Whatever they say is their emotional trigger — write it down.",
      },
      {
        content_type: "script_prompt",
        title: "Deepening the Discovery",
        script_prompt_text: `So {{ CLIENT_NAME }}, what makes you think now is the right time for getting coverage?

Have you ever looked into mortgage protection before?

Are you single or married?

Do you have kids, grandchildren, or any dependents that live with you?

Eventually, when you pass away, who would be responsible for, ya know, taking care of the mortgage, finances, bills, and everything else?

Is this a primary residence or investment property?

Are you looking for coverage on just yourself or your spouse as well?`,
        script_prompt_instructions:
          "Natural, conversational flow. Don't rapid-fire — let each question breathe. If they mention a spouse, ask: 'Is he/she there to listen in with us?' If not, feel it out — if you think you need both on the call, schedule a callback. Otherwise, continue.",
      },
      {
        content_type: "script_prompt",
        title: "Confirming the Beneficiary",
        script_prompt_text: `So if something happened to you, I assume {{ SPOUSE NAME }} would be your beneficiary?`,
        script_prompt_instructions:
          "Get the beneficiary's name confirmed early. You'll use this name throughout the entire rest of the call — in the close, in objection handling, in the application. It personalizes everything.",
      },
      {
        content_type: "rich_text",
        title: "Key Discovery Insights",
        rich_text_content: `<h2>Key Discovery Insights</h2>
<p>By the end of discovery, you should know:</p>
<ul>
<li><strong>WHY</strong> they want coverage (emotional driver)</li>
<li><strong>WHO</strong> they're protecting (beneficiary name)</li>
<li><strong>WHETHER</strong> they're single or married</li>
<li><strong>HOW MANY</strong> dependents they have</li>
<li><strong>WHETHER</strong> both spouses need coverage</li>
<li><strong>TYPE</strong> of property (primary vs investment)</li>
</ul>
<p>Every single one of these facts gets used later. Take notes.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 3: Role Framing & Needs Analysis (practice)
  // =========================================================================
  {
    title: "Role Framing & Needs Analysis",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Frame your role as a medical field underwriter, explain the process, then dig into mortgage and equity details.",
    is_required: true,
    content_blocks: [
      {
        content_type: "script_prompt",
        title: "Role Framing & Process Overview",
        script_prompt_text: `Alright {{ CLIENT NAME }}, I'll make this pretty quick for you. My job is pretty simple. I'm what's called a medical field underwriter and I am contracted with roughly 35 different insurance companies that specialize in mortgage protection. This gives me the ability to search around and see which companies have the best coverage options and costs that are tailored to you specifically.

We'll just spend a couple minutes going over the basics regarding your mortgage, finances and health, to see which company you're most likely to qualify with, and which company will give you the best rate.

After we go over the numbers, we'll submit an application to that carrier because anything we go over today can't be purchased outright. We would have to apply for it ultimately and I'm happy to help you with that process.

From there, it's a waiting game and applications typically take anywhere from 2 to 3 days to find out if you've been approved or denied, depending on the type of policy you apply for. If you're declined, no big deal. We would just circle to the next best option, and since there's so many different options, we can usually help you find something. If you're approved you'll be insured immediately, and then they'll send you a policy packet, and from there you'd have 30 days to make changes to it.

Does that make sense? Any questions about that process?`,
        script_prompt_instructions:
          "Confident, matter-of-fact delivery. Hit the key points: 35 companies, tailored to them, can't buy outright (reduces pressure), 30 days to review if approved. The 'no big deal if declined' line removes fear of rejection.",
      },
      {
        content_type: "script_prompt",
        title: "Mortgage Needs Analysis Questions",
        script_prompt_text: `So how much do you have left to pay on the home?

Okay, do you know how many years you have left to pay on that loan?

Do you have any plans to pay it off any sooner, in like 20-25 years, or are you just playing that by ear?

And how much is your monthly mortgage payment, including taxes and insurance?

And if you were to turn around and sell that home today, do you know about how much you might get for it?`,
        script_prompt_instructions:
          "Matter-of-fact tone. These are straightforward financial questions. The last question about home value is KEY — it lets you calculate equity. Write down every number.",
      },
      {
        content_type: "rich_text",
        title: "Calculating & Leveraging Equity",
        rich_text_content: `<h2>Calculating & Leveraging Equity</h2>
<p><strong>Equity = Home Value − Remaining Mortgage Balance</strong></p>
<p>Example: Home worth $350k, owes $200k → <strong>$150k equity</strong></p>
<blockquote>"Anytime a homeowner has equity, we recommend at the bare minimum, that is what you want to protect. That is your profit. That is your money. We want that to stay with you and your family."</blockquote>
<p>Equity is the most powerful leverage point in mortgage protection. It's <strong>their money</strong> — not the bank's. If they die without coverage, the bank forecloses and keeps the equity.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 4: Health & Financial Qualification (practice)
  // =========================================================================
  {
    title: "Health & Financial Qualification",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Navigate health questions conversationally, gather income details, and deep-dive into existing insurance.",
    is_required: true,
    content_blocks: [
      {
        content_type: "script_prompt",
        title: "The Attorney Framing",
        script_prompt_text: `So, I'm not the judge, I'm more like your attorney, so the more information you can provide the more helpful it will be in finding the best carrier for you.`,
        script_prompt_instructions:
          "Short but critical. This one line shifts the dynamic from interrogation to collaboration. Pause after saying it — let it land before moving into health questions.",
      },
      {
        content_type: "script_prompt",
        title: "Health Qualification Script",
        script_prompt_text: `I've got your age as {{ LEAD_AGE }}, and your DOB is?

Are you a smoker?

And as far as your health goes, do you have any medical conditions or take any prescriptions for anything in the last 10 years, even if you've been prescribed and not actually took the medication. It can still be on your medical records.

Any history at all of heart attack, stroke, cancer or diabetes?

[If diabetes]: Last A1C reading? Age of diagnosis? Type 1 or Type 2? Oral meds, insulin, or both? Names of prescriptions?
[High blood pressure or cholesterol?]: Controlled? How many meds?
[Kidney or liver disease?]
[Thyroid issues?]
[Asthma, COPD, or emphysema?]
[Use of oxygen? Sleep apnea?]: If sleep apnea, on C-PAP?
[Lupus or arthritis?]
[Anxiety, depression, or bipolar medications?]
[Surgeries or hospitalizations in the last 5 years?]

Do you have any DUIs or felonies? I didn't think so, they do just require us to ask.

So I know I'm not supposed to ask you this, but what's a good height and weight for you before breakfast?`,
        script_prompt_instructions:
          "Conversational, not clinical. Flow naturally between questions. For DUI/felony: 'I didn't think so, they do just require us to ask.' For height/weight with women: use the 'before breakfast' humor. Keep it light throughout.",
      },
      {
        content_type: "script_prompt",
        title: "Occupation & Income",
        script_prompt_text: `For the sake of the application, about how much would you say you bring home per month? Just a ballpark.

[If married]: Is your spouse currently working? What would you say they bring in per month?`,
        script_prompt_instructions:
          "'Just a ballpark' reduces pressure. Never make them feel judged about income. This info helps size the policy and determine what they can afford monthly.",
      },
      {
        content_type: "script_prompt",
        title: "Existing Insurance Deep Dive",
        script_prompt_text: `Now looking into other insurances.. Most families I speak with typically have 3-4 different life insurance policies in place. Do you have any existing WHOLE LIFE or TERM LIFE insurance?

And do you know how much coverage you have and with what companies?`,
        script_prompt_instructions:
          "Non-judgmental fact-finding. Gather: total insurance in place, monthly cost, and WHY they got each policy. The 'why' is critical — if they object later saying 'I already have insurance,' you can say: 'No, you said that policy was for burial. This is different.'",
      },
      {
        content_type: "rich_text",
        title: "Why Existing Coverage Matters",
        rich_text_content: `<h2>Why Existing Coverage Matters</h2>
<p>Always find out <strong>WHY</strong> they got each existing policy. This becomes your defense against the "I already have coverage" objection:</p>
<blockquote>"Your mortgage protection is not getting rid of your [type of policy] — you keep that. You can't have one policy do several different things because you would just run out of money."</blockquote>
<p>Your product is <strong>additive, not replacement</strong>. They keep what they have AND add mortgage protection on top.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Final Questions & Building Urgency (practice)
  // =========================================================================
  {
    title: "Final Questions & Building Urgency",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Close the discovery phase by painting the picture of what happens without coverage — make it real and personal.",
    is_required: true,
    content_blocks: [
      {
        content_type: "script_prompt",
        title: "The Impact Questions",
        script_prompt_text: `Okay just a few final questions here...

So god forbid something happened today. Would your family keep the home, or would they just need time to sell it?

And would {{ BENEFICIARY }} be able to pick up that monthly mortgage payment right away?

Do you think having a plan in place to cover the mortgage would be more of a luxury or necessity to have in place?`,
        script_prompt_instructions:
          "Let each question land. These are designed to make the prospect feel the weight of being unprotected. The 'luxury or necessity' question is a trial close — if they say 'necessity,' you have buy-in.",
      },
      {
        content_type: "script_prompt",
        title: "No Existing Insurance — Paint the Picture",
        script_prompt_text: `It doesn't sound like you have insurance now. Do you have any savings, stocks, or like when something does happen to you, what would be used to pay for the mortgage, the car payments, credit card debt, funeral services, and all the bills and expenses; what would be used to pay for all that?

[Client responds]

And who would be the person responsible for having to like… go in, sit down, and actually meet with the lender and have to plan and pay for everything?

[Client responds]

Now, would they be forced to pay out of pocket, or would they have to get a loan and pay all the interest and stuff? And how long would they be able to maintain that monthly mortgage payment and stay in the house?

Do you think having a plan in place to cover the mortgage would be more of a luxury or necessity to have in place?`,
        script_prompt_instructions:
          "Only use this version if they have NO existing life insurance. Each question makes the burden more real and more personal. The progression: money → responsibility → affordability → urgency. End with the luxury/necessity close.",
      },
      {
        content_type: "rich_text",
        title: "Why These Questions Work",
        rich_text_content: `<h2>Why These Questions Work</h2>
<p>These questions don't sell — they <strong>reveal</strong>. The prospect sells themselves on the need by answering honestly about:</p>
<ul>
<li>Who would handle the burden</li>
<li>Whether that person could afford it</li>
<li>How long they could maintain payments</li>
</ul>
<p>By the time they answer "necessity," they've already made the decision. You just need to show them the right product.</p>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 6: Opening & Needs Analysis Knowledge Check (quiz)
  // =========================================================================
  {
    title: "Opening & Needs Analysis Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Test your understanding of opening strategies, discovery, and needs analysis.",
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
            "What is the key difference between opening a fresh lead vs an aged lead?",
          explanation:
            "Fresh leads remember their request — be direct. Aged leads forgot — earn the right to their time first by asking for '15 seconds.'",
          points: 1,
          options: [
            {
              option_text:
                "Aged leads need you to earn the right to their time; fresh leads are expecting your call",
              is_correct: true,
            },
            {
              option_text:
                "Fresh leads need more credibility; aged leads already trust you",
              is_correct: false,
            },
            {
              option_text: "There is no difference — use the same script",
              is_correct: false,
            },
            {
              option_text:
                "Aged leads should be skipped — they're not interested",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "For aged leads, you should skip the credibility section since they've been contacted before.",
          explanation:
            "Never skip credibility. Aged leads are MORE skeptical because time has passed and they've likely been contacted by other agents. The license verification is even more important.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When asking about mortgage details, calculating equity is important because:",
          explanation:
            "Equity is THEIR money. If the bank forecloses, they lose it all. At minimum, you should protect the equity — it's the most compelling number in the conversation.",
          points: 1,
          options: [
            {
              option_text:
                "It determines the minimum coverage to recommend — equity is their money to protect",
              is_correct: true,
            },
            {
              option_text: "It helps you calculate your commission",
              is_correct: false,
            },
            {
              option_text:
                "Insurance companies require it for underwriting",
              is_correct: false,
            },
            {
              option_text: "It's just small talk to build rapport",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "You should ask the prospect WHY they got each existing insurance policy.",
          explanation:
            "Knowing WHY they got each policy lets you position your product as additive: 'You said that policy was for burial. This is different — this is mortgage protection.'",
          points: 1,
          options: [
            { option_text: "True", is_correct: true },
            { option_text: "False", is_correct: false },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The 'attorney, not judge' analogy should be used:",
          explanation:
            "This analogy is used before health questions to build trust and encourage honesty — the more they share, the better you can help.",
          points: 1,
          options: [
            {
              option_text:
                "Before health questions to encourage honesty and build trust",
              is_correct: true,
            },
            {
              option_text: "During the close to build urgency",
              is_correct: false,
            },
            {
              option_text: "When handling objections",
              is_correct: false,
            },
            {
              option_text: "Only if the prospect is a veteran",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The main purpose of asking 'Would they keep the home or sell it?' is:",
          explanation:
            "This question reveals whether the beneficiary needs full mortgage payoff or just enough time to sell on their terms — it directly impacts the coverage type you recommend.",
          points: 1,
          options: [
            {
              option_text:
                "To understand the beneficiary's actual needs and tailor coverage accordingly",
              is_correct: true,
            },
            {
              option_text: "To determine if the prospect is wealthy",
              is_correct: false,
            },
            {
              option_text:
                "To make small talk and build rapport",
              is_correct: false,
            },
            {
              option_text: "It's required by the insurance carrier",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "You should recommend paying off 100% of the mortgage as the default option.",
          explanation:
            "100% mortgage payoff is the most expensive and hardest to qualify for. For most prospects over 55-60, equity protection is the better recommendation — more affordable, easier to qualify for, and permanent.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When a prospect says coverage is a 'luxury,' the best approach is:",
          explanation:
            "Redirect to the beneficiary — 'Can [name] pick up that mortgage payment right away?' Make it about the people they're protecting, not abstract insurance.",
          points: 1,
          options: [
            {
              option_text:
                "Redirect to the beneficiary's situation — who pays the mortgage if they're gone?",
              is_correct: true,
            },
            {
              option_text: "Agree with them and end the call",
              is_correct: false,
            },
            {
              option_text: "Argue that it's definitely a necessity",
              is_correct: false,
            },
            {
              option_text: "Offer a discount to change their mind",
              is_correct: false,
            },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 7: Product Education — Term, Whole Life & IUL (content)
  // =========================================================================
  {
    title: "Product Education — Term, Whole Life & IUL",
    lesson_type: "content",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Educate prospects on the three main product types using two different presentation approaches — conversational and direct.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Two Presentation Styles",
        rich_text_content: `<h2>Two Presentation Styles</h2>
<p>You have <strong>two approaches</strong> for explaining Term vs Whole Life vs IUL. Choose based on the prospect's personality:</p>
<ul>
<li><strong>Conversational approach</strong> — Uses analogies ("renting vs owning"). Better for prospects who want to understand the concepts.</li>
<li><strong>Direct approach</strong> — Focuses on specifics (face values, convertibility). Better for analytical prospects who want facts.</li>
</ul>
<p><strong>Important:</strong> Only bring up IUL if the prospect is healthy and typically <strong>under age 65-75</strong> (varies by carrier).</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Conversational Approach — Term vs Whole Life",
        script_prompt_text: `So, just to make sure we're on the same page, do you know the difference between whole life and term life insurance?

[Client: "Uh, I think so? One's for life and one's for a set time?"]

You're about 90% there. Do you mind if I fill in the gaps?

So, term life insurance is like renting coverage. You pay your premiums for a specific amount of time, say 10 to 15 years, and {{ BENEFICIARY NAME }} will receive a payout as long as you pass within the term. If you pass away after the term expires, well there's no payout, so we won't be looking at this option, because you'll just spend thousands and thousands of dollars which doesn't do anybody any good.

Now, whole life insurance is like owning coverage. It's designed to last your entire life, as long as you keep paying the premiums. It also builds cash value over time, which you can borrow against or withdraw in certain situations. Payments will also never increase and the face value will never increase or decrease.`,
        script_prompt_instructions:
          "Use the 'renting vs owning' analogy — it clicks instantly. Start by asking what they know, then fill gaps. This makes them feel smart rather than talked down to.",
      },
      {
        content_type: "script_prompt",
        title: "Direct Approach — Term vs Whole Life",
        script_prompt_text: `So, just to make sure we're on the same page, do you know the difference between whole life and term life insurance?

[Client: "Uh, I think so? One's for life and one's for a set time?"]

You're about 90% there. Do you mind if I fill in the gaps?

Okay, great. So, term life insurance is the type of coverage where you can request larger face values, in the hundreds of thousands. They typically come in terms of 10-20 years. Some are convertible, meaning you have the option to convert the policy to something permanent before it expires without having your health evaluated again, and some are not. Some will include living benefits and others will not, so we'll likely take a look at this as an option!

Now, whole life insurance are your smaller policies, typically $20 or $30 thousand. They do last your entire life and usually build cash value that you can borrow against over time. This could work but you'd have to stack several policies from different companies to reach your desired amount of coverage, so this likely isn't an option for now.`,
        script_prompt_instructions:
          "More factual and specific. Use this with analytical prospects who want details. The key distinction: term = larger face values but temporary, whole life = smaller but permanent. Be honest about limitations of each.",
      },
      {
        content_type: "script_prompt",
        title: "Introducing IUL",
        script_prompt_text: `Now, there's also another option called Indexed Universal Life, or IUL. It's a bit more complex, but essentially, it's a type of permanent life insurance that also builds cash value, and that cash value growth is tied to the performance of a market index, like the S&P 500.

[Client: "Sounds interesting. So, which one is best?"]

That really depends on your specific needs and goals. Term life is often more affordable and great for covering specific periods, like mortgage payments or raising children. Whole life provides lifelong coverage and cash value growth. And IUL can offer potential for higher returns on cash value, but with some market risk involved. We can discuss what would best fit your situation.`,
        script_prompt_instructions:
          "ONLY bring up IUL if the prospect is healthy and typically under age 65-75. Present it as a premium option, not the default. Let them choose — don't push any single product.",
      },
      {
        content_type: "rich_text",
        title: "When to Use Each Product",
        rich_text_content: `<h2>When to Use Each Product</h2>
<table>
<thead><tr><th>Prospect Profile</th><th>Product</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Needs high coverage, budget-conscious</td><td><strong>Term Life</strong></td><td>Larger face values, affordable, covers mortgage period</td></tr>
<tr><td>Wants permanent, smaller amounts</td><td><strong>Whole Life</strong></td><td>Lifelong coverage, cash value, level premiums</td></tr>
<tr><td>Healthy, under 65-75, wants growth</td><td><strong>IUL</strong></td><td>Market-linked cash value, permanent, living benefits</td></tr>
<tr><td>Health challenges, older</td><td><strong>Guaranteed Issue / Graded</strong></td><td>No medical underwriting, 2-year waiting period</td></tr>
</tbody>
</table>
<blockquote><strong>Pause here</strong> to figure out the carrier/product with the toolkit before presenting specific numbers.</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 8: Equity Protection vs Mortgage Protection (content)
  // =========================================================================
  {
    title: "Equity Protection vs Mortgage Protection",
    lesson_type: "content",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Understand when to pitch equity protection vs full mortgage payoff, and how to explain the foreclosure risk.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Two Coverage Strategies",
        rich_text_content: `<h2>Two Coverage Strategies</h2>
<p>Not every prospect needs (or can afford) full mortgage payoff. You have two approaches:</p>
<ul>
<li><strong>Mortgage Protection (100%)</strong> — Covers the entire remaining mortgage balance. Most expensive, requires excellent health.</li>
<li><strong>Equity Protection</strong> — Covers the equity in the home. More affordable, easier to qualify for, permanent. <strong>Recommended for most prospects over 55-60.</strong></li>
</ul>`,
      },
      {
        content_type: "script_prompt",
        title: "Presenting Equity Protection",
        script_prompt_text: `So we have a couple options here. We can look at mortgage protection and cover your mortgage in full, which will be the most expensive option and not at all what I recommend. Premiums are going to be extremely high, and you have to be in almost perfect health to qualify. And the insurance companies are only going to insure you until the age of 80. After that, you'll find yourself in a position looking for insurance again and essentially waste thousands of dollars which doesn't do anybody any good.

What I'm going to recommend to you today and what most people over the age of 55-60 go with, is to look at equity protection. This will be a much more affordable option, it's much easier to qualify for and it's permanent protection that you cannot outlive.

Does that make sense?`,
        script_prompt_instructions:
          "Position full mortgage payoff as expensive and unrealistic, then present equity protection as the smart alternative. The 'most people over 55-60' line uses social proof. 'Cannot outlive' is the key phrase.",
      },
      {
        content_type: "script_prompt",
        title: "Explaining How Equity Protection Works",
        script_prompt_text: `So when something happens, the bank doesn't need the full mortgage covered right away, they just need to make sure your payments are still being paid.

So this will give {{ BENEFICIARY }} the time they're going to need to sit back, grieve, and figure out their finances, stay on their feet, and either stay in the home or sell the home on their terms... Not the bank's.

This will keep the bank from taking the house and most importantly, the equity in the home.`,
        script_prompt_instructions:
          "Emphasize: 'on their terms, not the bank's.' This is about control and dignity during grief. The beneficiary gets time to make decisions without financial pressure.",
      },
      {
        content_type: "script_prompt",
        title: "The Foreclosure Reality Check",
        script_prompt_text: `Do you know how a foreclosure works?

The bank will give a 90-day grace period to make mortgage payments... But if that payment is late and 91 days roll around, they will foreclose the home. The bank would then take the home, resell it... and keep all of your equity.

That's why I always say bare minimum, let's protect your equity.`,
        script_prompt_instructions:
          "Only use this if they need the reality check. Keep it factual, not fear-mongering. The 90-day/91-day detail makes it concrete and real. 'Keep all of your equity' is the punch line.",
      },
      {
        content_type: "rich_text",
        title: "4 Reasons for Equity Protection",
        rich_text_content: `<h2>4 Reasons for Equity Protection</h2>
<p>Use these when positioning equity protection over full mortgage payoff:</p>
<ol>
<li><strong>Much easier to qualify for</strong> than full mortgage payoff</li>
<li><strong>Much more affordable</strong> — by a long shot, not even close</li>
<li><strong>4 out of 5 families want to leave the home</strong> once they lose a loved one</li>
<li><strong>Permanent protection you cannot outlive</strong> — your investment and family home are protected</li>
</ol>
<blockquote><strong>Paint the Picture (if needed):</strong> "How many square feet is the home? Do you have to go up and down stairs to do laundry? Do you have to mow the lawn? Do you see yourself/spouse at 80 or 90 doing all that?"</blockquote>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 9: Presenting the Company & Benefits (practice)
  // =========================================================================
  {
    title: "Presenting the Company & Benefits",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Present the recommended carrier with confidence and explain living benefits and cash value clearly.",
    is_required: true,
    content_blocks: [
      {
        content_type: "script_prompt",
        title: "Company Presentation",
        script_prompt_text: `So the system is recommending a company called {{ COMPANY }} if you want to write that down. Are you familiar with {{ COMPANY }}?

Now, this is an A+ rated company, they've been around for over 100 years... They're one of the best out there when it comes to life insurance and mortgage protection and without a doubt have the best benefits that come with their products.`,
        script_prompt_instructions:
          "Confident, authoritative. Have them write the company name down — it engages them. The A+ rating and '100 years' build credibility. Adjust the specifics based on the actual carrier you're recommending.",
      },
      {
        content_type: "script_prompt",
        title: "Living Benefits — FEX Products",
        script_prompt_text: `Go ahead and write down "Living Benefits" — are you familiar with that? This is supplemental to any health insurance that you may have…

So let's say down the road you get a serious illness and are given a year or less to live. This will pay up to 90% of the death benefit money in advance, so you can use that while you're still alive, to pay the mortgage, medical bills, or anything else you need to use it for.`,
        script_prompt_instructions:
          "Use this version for Final Expense (FEX) products where living benefits are typically terminal illness only. Make it real — 'pay the mortgage, medical bills, or anything else.' Having them write 'Living Benefits' makes it tangible.",
      },
      {
        content_type: "script_prompt",
        title: "Living Benefits — IUL & Term with Full LB",
        script_prompt_text: `So this will also include living benefits. Are you familiar with what living benefits are?

Living benefits are supplemental to any health insurance you may already have, so let's say down the road, you had a heart attack or were diagnosed with cancer, or even lost the ability to do 2 activities of daily living, such as dressing yourself or bathing yourself.

This will pay you out early up to 90% so you can use the money while you're still living to pay the mortgage, medical bills, or anything else you need to use it for.`,
        script_prompt_instructions:
          "Use this version for IUL and Term products with full living benefits (critical, chronic, AND terminal). The specific examples — heart attack, cancer, activities of daily living — make it concrete and relatable.",
      },
      {
        content_type: "rich_text",
        title: "Cash Value Explanation",
        rich_text_content: `<h2>Cash Value</h2>
<blockquote>"What stands out to me the most is that this will <strong>Build a Cash Value</strong> — So over time as you're paying your premiums, you'll build cash in a separate account, and as that cash builds over time you can use that money just like a checking or savings — this is also tax-free."</blockquote>
<p>Key points:</p>
<ul>
<li>Separate account that grows over time</li>
<li>Accessible like a checking/savings account</li>
<li><strong>Tax-free</strong> — this is the line that gets their attention</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 10: Quoting Options — Equity & Mortgage (practice)
  // =========================================================================
  {
    title: "Quoting Options — Equity & Mortgage",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Present tiered pricing for both equity protection and full mortgage protection scenarios.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Two Quoting Frameworks",
        rich_text_content: `<h2>Two Quoting Frameworks</h2>
<p>You'll use a different quoting framework depending on whether you're presenting <strong>equity protection</strong> or <strong>full mortgage protection</strong>:</p>
<ul>
<li><strong>Equity Protection</strong> — Quote by months of mortgage payments covered</li>
<li><strong>Mortgage Protection</strong> — Quote by percentage of mortgage covered (100% / 75% / 50%)</li>
</ul>
<p>Both use <strong>3 tiers</strong> (highest, middle, lowest) and always have the prospect write them down.</p>
<p><strong>Important:</strong> You should already be logged in with the eApp open and the carrier selected before quoting.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "Quoting Equity Protection",
        script_prompt_text: `So to the numbers here. I'm going to lay these numbers out and then I'll explain what these mean so bear with me.

So {{ CLIENT NAME }}, on that piece of paper, go ahead and write down {{ HIGHEST FACE VALUE }}. Right underneath that, go ahead and write down X months.

Right beside the {{ HIGHEST FACE VALUE }} if you can write down {{ 2ND HIGHEST FACE VALUE }}. Right underneath that, go ahead and write down X months.

And the last one here, {{ LOWEST FACE VALUE }}, underneath that if you could write down X months.

Now {{ CLIENT NAME }}, what those larger numbers represent are face values. So when a claim is filed for either that living benefit or a death claim, you or your spouse are going to get paid that money by the insurance company within 24-48 hours.

Now no, it doesn't pay off your mortgage completely, but what it does do is provide mortgage payments for a period of time. This way they don't have to worry about the mortgage payment so they can figure out what they need to do next and keeps the bank from taking the home — protecting your equity.

So, let's look at the biggest one for example. Take that amount and divide that by your monthly mortgage payment of {{ THEIR MTG PAYMENT }}. So, {{ HIGHEST FACE VALUE }} is enough cash, when a claim is filed, to make sure that the mortgage is paid for X full months. Does that make sense?

Okay, perfect. So, {{ NEXT FACE VALUE }} is enough cash to make sure the mortgage is paid for X months. And then {{ LOWEST FACE VALUE }} will pay the mortgage for full X months. This just allows the family to stay in that home, make sure the bank doesn't take the house, protect that equity, and provides a safety net and time to come up with a plan.

So, to the numbers here {{ CLIENT NAME }}:

For the {{ HIGHEST AMOUNT }}, the monthly payment will be X.

For the option in the middle, which is the option most of my clients go with, the monthly premium will be X.

And the last option, if you qualify, will be X.

Okay, do you need me to repeat any of this information? And do you want to see any other options, higher or lower?`,
        script_prompt_instructions:
          "Walk them through step by step. Having them write it down is critical — it makes the numbers real. The 'months of mortgage payments' framing is more relatable than raw dollar amounts. Highlight the middle option as 'most popular.'",
      },
      {
        content_type: "script_prompt",
        title: "Quoting Mortgage Protection (100/75/50%)",
        script_prompt_text: `Go ahead and write down {{ HIGHEST AMOUNT }}, then below that 100%.

Next to that, write down {{ MIDDLE AMOUNT }}, and below that, write down 75%.

And finally write down {{ LOWEST AMOUNT }}, and below that, write down 50%.

What those large numbers represent are your face values, so when a claim is filed for the death benefit, you or your family will be paid within 24-48 hours.

Now, if you go with the largest option, the monthly premium will be…

And the middle option would be…

And the lowest option would be…`,
        script_prompt_instructions:
          "Simpler quoting format for full mortgage protection. The percentages make it easy to understand: 100% pays it all off, 75% covers most, 50% covers half. Let them pick what fits their budget.",
      },
    ],
  },

  // =========================================================================
  // LESSON 11: Mid-Script Knowledge Check (quiz)
  // =========================================================================
  {
    title: "Mid-Script Knowledge Check",
    lesson_type: "quiz",
    estimated_duration_minutes: 5,
    xp_reward: 25,
    description:
      "Validate your understanding of product types, equity protection, and quoting strategies.",
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
          question_text:
            "When should you bring up IUL as an option?",
          explanation:
            "IUL requires good health and has age limits (typically under 65-75 depending on carrier). Don't present it to everyone.",
          points: 1,
          options: [
            {
              option_text:
                "When the prospect is healthy and typically under age 65-75",
              is_correct: true,
            },
            {
              option_text: "Always — it's the best product",
              is_correct: false,
            },
            {
              option_text: "Only for prospects over age 70",
              is_correct: false,
            },
            {
              option_text: "Never — it's too complex to explain",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "Term life insurance builds cash value over time.",
          explanation:
            "Term life is pure coverage for a set period — no cash value, no equity building. It's 'renting' coverage.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The main advantage of equity protection over full mortgage protection is:",
          explanation:
            "Equity protection is more affordable, easier to qualify for, and provides permanent coverage you can't outlive — making it the better recommendation for most prospects over 55-60.",
          points: 1,
          options: [
            {
              option_text:
                "More affordable, easier to qualify for, and permanent",
              is_correct: true,
            },
            {
              option_text: "It pays off the mortgage completely",
              is_correct: false,
            },
            {
              option_text: "It has no monthly premiums",
              is_correct: false,
            },
            {
              option_text: "It doesn't require an application",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When presenting the carrier, the key details to mention are:",
          explanation:
            "Rating, history, and product benefits are the three credibility anchors for any carrier presentation.",
          points: 1,
          options: [
            {
              option_text:
                "Company rating, years in business, and product benefits",
              is_correct: true,
            },
            {
              option_text: "Your personal commission rate",
              is_correct: false,
            },
            {
              option_text: "The company's stock price",
              is_correct: false,
            },
            {
              option_text: "How many agents they have",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "Living benefits allow the policyholder to:",
          explanation:
            "Living benefits provide early access to the death benefit (up to 90%) if the policyholder is critically, chronically, or terminally ill — depending on the product.",
          points: 1,
          options: [
            {
              option_text:
                "Access up to 90% of the death benefit early if critically, chronically, or terminally ill",
              is_correct: true,
            },
            {
              option_text: "Get free medical treatment",
              is_correct: false,
            },
            {
              option_text: "Cancel the policy at any time with a full refund",
              is_correct: false,
            },
            {
              option_text: "Transfer the policy to someone else",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "All life insurance products include the same living benefits.",
          explanation:
            "FEX (Final Expense) products typically only include terminal illness benefits. IUL and some term products include critical, chronic, AND terminal illness benefits. Always know what your product includes.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The '4 reasons' for recommending equity protection include all EXCEPT:",
          explanation:
            "The 4 reasons are: (1) easier to qualify, (2) much more affordable, (3) 4 out of 5 families want to leave the home, (4) permanent protection you can't outlive. 'Highest commission' is never a reason to present to a client.",
          points: 1,
          options: [
            {
              option_text: "It pays the highest commission to the agent",
              is_correct: true,
            },
            {
              option_text: "It's much easier to qualify for",
              is_correct: false,
            },
            {
              option_text: "It's much more affordable",
              is_correct: false,
            },
            {
              option_text: "It's permanent protection you cannot outlive",
              is_correct: false,
            },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LESSON 12: Closing the Sale (practice)
  // =========================================================================
  {
    title: "Closing the Sale",
    lesson_type: "practice",
    estimated_duration_minutes: 8,
    xp_reward: 25,
    description:
      "Close confidently by framing the application as the natural next step, not a pressure moment.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "The Close Is a Natural Transition",
        rich_text_content: `<h2>The Close Is a Natural Transition</h2>
<p>If you've done the discovery, needs analysis, and quoting well, the close should feel like the <strong>obvious next step</strong> — not a pressure moment.</p>
<p>Key principle: <strong>You're not asking them to buy today.</strong> You're asking which option they want to see if they can get approved for. The carrier makes the final decision.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "The Close",
        script_prompt_text: `Do you need me to repeat any of those numbers? Are you needing to see any other kind of numbers?

Now like I said, the biggest thing we're doing is making sure we can get you approved… Now granted we get an approval, {{ CARRIER }} is gonna mail out the policy to your home so you can sit down and review the policy details, just to make sure this is the best coverage for you.

Now, obviously, we cannot make a decision today anyway just because I still don't even know whether or not the insurance company would even approve you but if they were to approve you, which of these 3 options do you want to see if you could get approved for?`,
        script_prompt_instructions:
          "Calm, matter-of-fact. The framing is critical: 'we can't make a decision today' removes pressure. 'Which option do you want to see if you could get approved for?' is the close — they're choosing, not committing. PAUSE after asking. Let them answer.",
      },
      {
        content_type: "script_prompt",
        title: "Confirming & Transitioning to Application",
        script_prompt_text: `Perfect. So, we'll now submit a little information to the carrier, and they'll get back to me within 24-48 hours with a decision. I'll follow up and let you know if you're approved, and we'll go from there. Fair enough?

Perfect, so what we'll do now is submit a quick app that should only take a few minutes.

Verify DOB, start by asking what their street address is.`,
        script_prompt_instructions:
          "Smooth transition — no gap between 'they chose an option' and 'let's start the app.' The faster you move into the application, the less time they have to second-guess. 'Quick app' and 'just a few minutes' keep it low-friction.",
      },
    ],
  },

  // =========================================================================
  // LESSON 13: Objection Handling (practice)
  // =========================================================================
  {
    title: "Objection Handling",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Handle the two most common objections: 'I need to talk to my spouse' and 'I need to think about it.'",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Objections = Opportunities",
        rich_text_content: `<h2>Objections = Opportunities</h2>
<p>The two most common objections in mortgage protection:</p>
<ol>
<li><strong>"I need to talk to my spouse"</strong> — Usually means they want permission, not information</li>
<li><strong>"I need to think about it"</strong> — Usually means they're unsure about the commitment, not the product</li>
</ol>
<p>Rule: <strong>Acknowledge, then redirect.</strong> Never argue or dismiss.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "I Need to Talk to My Spouse — Deep Approach",
        script_prompt_text: `Ok, not a problem, we can go ahead and book that call here in a second and you can go talk with her. Now before you go, really the most important part to us is that you feel like what we do is important for your family. Do you genuinely believe that?

[Client: "Yes"]

So when you go to her, how would she feel about you wanting to make sure the family is protected?

[Client: "I'm not sure, but I'd assume she would be happy about that."]

Ok, so is it more so about the money more so than talking to her?

[Client: "No, it's just that I've gotta run it by her still."]

I understand. Now who's responsible for showing up every day, paying all the bills, expenses, making sure the family has got everything they need? Who holds the family together?

[Client: "Me of course"]

And does she know how you feel on the day to day… about all of this?

[Pause for response]

Yes, and I respect that. I appreciate you being honest with me. Now, your wife is the reason you want to do this, right? So she can't be the reason you don't do this, because if you don't take care of this before it's too late, you're not gonna be able to ask her when you're gone, so you gotta make the choice, right... because you're the one responsible for taking care of your family.

I don't want you to put this big of a decision on her shoulders because at the end of the day, between you and me, whose responsibility is it to take care of the family?

[Client: "Mine"]

That's right, because you're the man that's gonna make sure that when you're gone, you're leaving your family in a good place. So the guy you want to be, the provider for the family, the guy who can give his family everything they deserve. What's the decision he makes and how does he take responsibility in this moment so that he can take care of his family?

[Client responds]

So what we gotta realize is that you're only a step away from becoming that guy. Because our actions directly translate into our life, so if you tell me you wanna make sure your family is protected when you're gone, all you gotta do is take action, so what are you gonna do?`,
        script_prompt_instructions:
          "This is an advanced, emotional close. It follows a specific progression: (1) validate their feelings, (2) establish they believe in the product, (3) identify them as the provider, (4) reframe: spouse is the reason TO do it, not the reason NOT to. Only use this full version if you've built strong rapport. Read the room — don't push if they're shutting down.",
      },
      {
        content_type: "script_prompt",
        title: "I Need to Think About It",
        script_prompt_text: `I understand. So {{ LEAD NAME }}, these are policies you cannot buy. You have to qualify for them. So that's what my job is as a medical underwriter, is to run that search, find the lowest cost carrier, find the right plan, and help submit a policy to the carrier, and we'll get an answer in about 7 days.

It takes about that time to find out if you're approved or declined. If you get approved, you'll have a full month to make any changes to your coverage. Does that make sense?

[Client: "Yes"]

Now, once we submit that, if we don't get approved, we'll get on another call and go with the next best option. Obviously our goal is to get you the best plan with the lowest cost and make sure we get you protected, ok?

[Client: "Ok"]

If we don't find any options, we'll close your account.`,
        script_prompt_instructions:
          "Key reframe: 'You have to qualify' shifts from 'buying' to 'qualifying.' The 30-day review period removes finality. 'Close your account' at the end creates gentle urgency without being pushy. This is about removing risk from their decision.",
      },
      {
        content_type: "rich_text",
        title: "Objection Handling Principles",
        rich_text_content: `<h2>Objection Handling Principles</h2>
<ul>
<li><strong>Never argue</strong> — validate first, redirect second</li>
<li><strong>The spouse objection</strong> is really about permission. Reframe: they're the provider, this is their responsibility</li>
<li><strong>The think-about-it objection</strong> is really about risk. Reframe: applying ≠ buying, and they have 30 days to review</li>
<li><strong>Read the room</strong> — if they're shutting down, don't push harder. Offer to schedule a follow-up instead</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 14: The Application Process (practice)
  // =========================================================================
  {
    title: "The Application Process",
    lesson_type: "practice",
    estimated_duration_minutes: 12,
    xp_reward: 30,
    description:
      "Navigate the application smoothly — SSN, banking, and handling pushback on sensitive information.",
    is_required: true,
    content_blocks: [
      {
        content_type: "rich_text",
        title: "Three Sensitive Asks",
        rich_text_content: `<h2>Three Sensitive Asks</h2>
<p>The application has three friction points:</p>
<ol>
<li><strong>Driver's License</strong> — Background and driving record check (usually easy)</li>
<li><strong>Social Security Number</strong> — Medical/prescription history verification (the #1 sticking point)</li>
<li><strong>Banking Information</strong> — Identity verification and payment setup</li>
</ol>
<p>Each one needs a <strong>clear reason WHY</strong> before you ask. Never lead with the ask — lead with the purpose.</p>`,
      },
      {
        content_type: "script_prompt",
        title: "The SSN Conversation",
        script_prompt_text: `Okay {{ NAME }}, so this next part is very important.. Since they're not going to be sending a nurse to your home to draw blood or take urine like they used to do, underwriting is going to take your social and run it through the medical information bureau just to double check your prescription and medical history, just to make sure you're healthy enough to qualify for the coverage...

With that said, what's a good social for you?`,
        script_prompt_instructions:
          "Lead with WHY (prescription check through MIB), not the ask. The 'no nurse, no blood, no urine' framing makes the SSN feel like the easy alternative. Ask for the SSN LAST during that application page — build compliance first with easier questions. Keep your tone casual and confident.",
      },
      {
        content_type: "script_prompt",
        title: "SSN Pushback — Rebuttal 1",
        script_prompt_text: `No worries, I totally understand that {{ NAME }}… So since no one is coming out to your house sticking you with any needles or making you pee in any cups, that information goes directly to the MIB — the Medical Information Bureau. From there, that's how they pull your medical information to make sure you're going to be healthy enough for that coverage.

So all this does is run your social through the MIB to check your prescription and medical history to see if you're healthy enough to qualify for coverage.

Does that make sense?`,
        script_prompt_instructions:
          "Calm, patient repetition. Same information, slightly different framing. The MIB explanation adds legitimacy. Don't get frustrated — this is normal resistance.",
      },
      {
        content_type: "script_prompt",
        title: "SSN Pushback — Rebuttal 2 (Firm)",
        script_prompt_text: `Oh, then there's no way that you can apply for insurance. I understand why you're uncomfortable because we just met, but that is why I have to give you my license because we are vetted by the federal government and you're able to actually check my background check.

But yeah, there's no way that you can submit an application without those three things. They have to verify you, and use your social for your medical records. That is part of the risk level.`,
        script_prompt_instructions:
          "Use this only after the first rebuttal fails. It's direct and honest — 'no way to apply without it.' Not threatening, just factual. Redirect to the license verification as proof of legitimacy.",
      },
      {
        content_type: "script_prompt",
        title: "Banking — EFT Setup",
        script_prompt_text: `So, with {{ CARRIER NAME }}, a decision may take anywhere from today to 7 days to know if you've been approved or not. If they approve you, they will draft your first month immediately, then after that your recurring payments will be on the same day that you choose each month. It can be any day you want.

What day works best for you?

Okay, so I just want to make sure we are partnered with your bank, this would be the same bank you use every month for bill pay.. So who are you banking with?

[Get bank name, then verify routing number by Googling: "Bank Name + City + Routing Number"]

Okay so we are partnered with {{ BANK }}, I just want to verify that we have the correct routing number on file and that it matches up with yours — Do you have a way to verify this information with me?

[Read routing number to verify, then ask for account number]

Okay perfect, that matches up with what we have on file here — and what is the account number you'll be using?`,
        script_prompt_instructions:
          "Frame banking as partnership verification, not payment collection. Google the routing number yourself first, then 'verify' it with them — this feels collaborative, not extractive. Ask for the account number last after routing is confirmed.",
      },
      {
        content_type: "script_prompt",
        title: "Banking Pushback — Rebuttal",
        script_prompt_text: `Okay so this is the final step to submit to underwriting. All insurance companies do require a complete application for underwriting to review before we can get a final decision...

So this is the 2nd part of a 3-step verification process.

The first part of the application they verify your identity and health with your social.

The second part here, they need to verify your banking to make sure:

One — that there is no fraud associated with your bank account. This is a check insurance companies do to protect against insurance fraud.

Two — that this bank account is in your name and not somebody else's and that this matches with your social.

This is the final step needed to submit a full application to underwriting so we can get a decision from them and then that way if you are approved, they can mail your policy paperwork out to review.

And again, no payments are due today — this just allows us to get that yes or no from the insurance company.`,
        script_prompt_instructions:
          "Position it as anti-fraud protection FOR THEM. The '3-step verification' framework makes it sound structured and legitimate. 'No payments due today' is the key reassurance. If they still resist, ask if they have a credit card as an alternative (Prosperity, AIG, TransAmerica accept cards).",
      },
      {
        content_type: "rich_text",
        title: "Banking Pushback — The Check Analogy",
        rich_text_content: `<h2>Additional Banking Rebuttals</h2>
<blockquote>"Let me ask you this.. Have you ever handed a check to anyone to pay for anything before? Ok, perfect.. so your routing and account info are at the bottom of a check. That info is meant to be shared... Nobody can misuse your account just by having that information… It doesn't work like a credit card because it requires your signature and bank authorization. Does that make sense?"</blockquote>
<p><strong>Alternative carrier payment options:</strong></p>
<ul>
<li><strong>Cash App</strong> — AmAm & John Hancock</li>
<li><strong>Chime Bank</strong> — AIG, AmAm, Aetna, Prosperity, MOO</li>
<li><strong>Green Dot</strong> — Aetna, Prosperity</li>
<li><strong>Credit Card / Direct Express</strong> — Prosperity, AIG, TransAmerica</li>
</ul>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 15: Cementing the Sale & Follow-Up (practice)
  // =========================================================================
  {
    title: "Cementing the Sale & Follow-Up",
    lesson_type: "practice",
    estimated_duration_minutes: 10,
    xp_reward: 30,
    description:
      "Set expectations after submission, handle the approval call, upsell accidental coverage, and ask for referrals.",
    is_required: true,
    content_blocks: [
      {
        content_type: "script_prompt",
        title: "Post-Submission — Setting Expectations",
        script_prompt_text: `Alright {{ CLIENT NAME }}, everything has been submitted to {{ CARRIER NAME }}, I will hear back from underwriting within 2 to 3 days.

Once I hear back from the carrier, a few things will happen:

1) They'll approve the application, and your policy will be placed in force as long as the first premium payment goes through.

2) They'll deny you. If that's the case, they will send you a declination letter indicating the reasons why, similar to getting denied for any credit or loan application.

3) Additional underwriting may be required and/or additional documentation may be required which means I'd need a signature or two on anything additional.

And after that, if approved, I will make sure you get a digital copy of the policy packet first, because the physical hard copies take a couple weeks to receive, since they're not overnighting those packets. And from there, we'll hop on another call and I will help create your account online so you can access everything that way, and if there is a mobile app, I will help you with that as well.`,
        script_prompt_instructions:
          "Clear, organized, professional. Three possible outcomes gives them a complete picture. The offer to help set up their online account and app shows long-term commitment — you're not disappearing after the sale.",
      },
      {
        content_type: "script_prompt",
        title: "Recap — Let Them Resell It to You",
        script_prompt_text: `Now, before we get off the phone I just want to make sure you're fully aware of what this coverage is and how it works…

So with that said, to the best of your ability can you explain to me what we set up today for you and your family?

[Let them explain — correct anything wrong, fill in anything they missed, especially benefits they left out]

Sounds good, it sounds like you could do my job!`,
        script_prompt_instructions:
          "This is a powerful cementing technique. When THEY explain the coverage back to you, they internalize it and take ownership. It also reveals any misunderstandings you can correct. The 'you could do my job' line makes them feel good.",
      },
      {
        content_type: "script_prompt",
        title: "Call List Removal & Contact Save",
        script_prompt_text: `As of right now I have taken you off the call list here and resolved your file. Now if anyone else reaches out to you let them know you've worked with an agent and have a policy in place and that should get you off their call list.

Now if they keep bothering you or even if it's spam, send that number over to me and I'll get your number off that call list because as of right now I'll be your agent moving forward and I directly represent you and your family.

I will be calling you as soon as I hear back from underwriting to let you know what they decide and if approved or denied, I will need to get in touch with you, so please make sure you save my contact information in your phone.`,
        script_prompt_instructions:
          "This cements the relationship — you're their agent, their advocate. 'Send me the number and I'll take care of them' positions you as their protector even from annoying callers. Having them save your number ensures future contact.",
      },
      {
        content_type: "script_prompt",
        title: "Approval Follow-Up Call",
        script_prompt_text: `So do you want the good news or the really good news!?

So the good news is you were approved for coverage..

The REALLY good news is I'll be your agent moving forward — I come with the policy.

"I work more days a week and longer hours than the insurance company. I'm the person that is going to deal with them for you so you don't have to."

That means I directly represent you so I'm always just a phone call away if you ever need anything or have any questions.

[Let them know they will receive their paperwork in about 10 business days and to look out for it.]`,
        script_prompt_instructions:
          "Energetic, positive. The 'good news or really good news' opening sets the tone. 'I come with the policy' is a great line — they didn't just get insurance, they got YOU as their advocate. Remind them to watch for paperwork in 10 business days.",
      },
      {
        content_type: "script_prompt",
        title: "Accidental Policy Upsell",
        script_prompt_text: `One last thing we didn't cover... Most families I work with add an accidental policy for a more comprehensive plan that way you're completely covered…

Something like that you'd be at X dollars for X amount of coverage.

Did you want to go ahead and add that?`,
        script_prompt_instructions:
          "Quick, low-pressure upsell. 'Most families add this' uses social proof. Frame it as 'completely covered' — filling the last gap. Don't push hard — if they say no, move to the referral.",
      },
      {
        content_type: "script_prompt",
        title: "Asking for Referrals",
        script_prompt_text: `And the final thing here — So you have coverage now which is great, but we're not really done until everybody around you has that safety net as well, that way you're protected when something happens to them.

Who comes to mind that would benefit from a quick needs analysis like we did — just to make sure they have the recommended amount of protection in place for their family as well?`,
        script_prompt_instructions:
          "Reframe referrals as protecting THEM — if someone in their circle is unprotected, it could affect the prospect too. 'Quick needs analysis like we did' normalizes it. Don't ask 'Do you know anyone?' — ask 'Who comes to mind?' — it assumes the answer.",
      },
      {
        content_type: "rich_text",
        title: "The Complete Call Flow — Summary",
        rich_text_content: `<h2>The Complete Mortgage Protection Call Flow</h2>
<ol>
<li><strong>Opening</strong> — Fresh or aged lead intro</li>
<li><strong>Credibility</strong> — License verification</li>
<li><strong>Discovery</strong> — Why they need coverage, family, beneficiary</li>
<li><strong>Role Framing</strong> — Medical field underwriter, 35 companies, attorney analogy</li>
<li><strong>Needs Analysis</strong> — Mortgage balance, years left, equity calculation</li>
<li><strong>Health & Financial Qualification</strong> — Full health checklist, income</li>
<li><strong>Existing Insurance</strong> — What they have, why they got it</li>
<li><strong>Final Questions</strong> — Keep or sell, luxury or necessity</li>
<li><strong>Product Education</strong> — Term vs Whole Life vs IUL</li>
<li><strong>Equity vs Mortgage Protection</strong> — Positioning the right approach</li>
<li><strong>Company Presentation</strong> — Carrier + benefits + living benefits</li>
<li><strong>Quoting</strong> — 3 tiered options (equity or mortgage framework)</li>
<li><strong>Close</strong> — "Which option do you want to see if you can get approved for?"</li>
<li><strong>Objection Handling</strong> — Spouse / think about it</li>
<li><strong>Application</strong> — DL → SSN → Banking</li>
<li><strong>Cementing</strong> — Expectations, recap, call list, save contact</li>
<li><strong>Follow-Up</strong> — Approval call, upsell, referral</li>
</ol>`,
      },
    ],
  },

  // =========================================================================
  // LESSON 16: Final Assessment — Complete Script Mastery (quiz)
  // =========================================================================
  {
    title: "Final Assessment — Complete Script Mastery",
    lesson_type: "quiz",
    estimated_duration_minutes: 8,
    xp_reward: 30,
    description:
      "Comprehensive assessment covering the entire mortgage protection sales call flow.",
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
            "The correct order for the mortgage protection call is:",
          explanation:
            "Following the flow builds trust, uncovers needs, and creates natural momentum toward the close.",
          points: 1,
          options: [
            {
              option_text:
                "Opening → Credibility → Discovery → Role Framing → Needs Analysis → Health → Product Education → Quote → Close → Application → Cement",
              is_correct: true,
            },
            {
              option_text:
                "Opening → Quote → Close → Discovery → Application",
              is_correct: false,
            },
            {
              option_text:
                "Health → Opening → Quote → Discovery → Application",
              is_correct: false,
            },
            {
              option_text:
                "Opening → Product Education → Quote → Close → Discovery",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When quoting equity protection, the face values represent:",
          explanation:
            "Equity protection quotes are framed as months of mortgage payments — making the coverage tangible and relatable to their actual monthly obligation.",
          points: 1,
          options: [
            {
              option_text:
                "Months of mortgage payments covered for the beneficiary",
              is_correct: true,
            },
            {
              option_text: "The total mortgage balance",
              is_correct: false,
            },
            {
              option_text: "Your commission amount",
              is_correct: false,
            },
            {
              option_text: "The home's appraised value",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "You should ask for the SSN first during the application to get it out of the way.",
          explanation:
            "Ask for the SSN LAST on that application page. Build compliance first with easier questions (name, DOB, address) to create momentum before the sensitive ask.",
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
            "Leading with the purpose (MIB medical/prescription check) makes the SSN feel like a medical necessity, not a financial intrusion.",
          points: 1,
          options: [
            {
              option_text:
                "A medical and prescription history verification through the MIB",
              is_correct: true,
            },
            {
              option_text: "A credit check for premium pricing",
              is_correct: false,
            },
            {
              option_text: "A background check by the government",
              is_correct: false,
            },
            {
              option_text: "Something you need for your personal records",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When a prospect says 'I need to talk to my spouse,' the core strategy is:",
          explanation:
            "The spouse objection is redirected by establishing that the prospect is the provider and decision-maker — the spouse is the reason TO do it, not the reason not to.",
          points: 1,
          options: [
            {
              option_text:
                "Redirect to their role as provider — spouse is the reason TO do it, not to avoid it",
              is_correct: true,
            },
            {
              option_text: "Insist they sign now without consulting anyone",
              is_correct: false,
            },
            {
              option_text: "End the call and wait for them to call back",
              is_correct: false,
            },
            {
              option_text: "Offer to call the spouse directly",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The banking request should be framed as:",
          explanation:
            "Banking information is positioned as anti-fraud protection and identity verification — protecting the prospect, not extracting payment.",
          points: 1,
          options: [
            {
              option_text:
                "Fraud prevention and identity verification — protecting the prospect",
              is_correct: true,
            },
            {
              option_text: "A payment that will be charged immediately",
              is_correct: false,
            },
            {
              option_text: "A deposit to hold their spot",
              is_correct: false,
            },
            {
              option_text: "Standard procedure that doesn't need explanation",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "true_false",
          question_text:
            "If the prospect is declined by the first carrier, you should close their case.",
          explanation:
            "With ~35 contracted carriers, there's almost always a next-best option. Circle to the next carrier. Only close the case if no carriers can offer coverage.",
          points: 1,
          options: [
            { option_text: "True", is_correct: false },
            { option_text: "False", is_correct: true },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The 'cementing' technique of having the prospect explain the coverage back to you works because:",
          explanation:
            "When prospects explain the coverage in their own words, they internalize the value, take psychological ownership, and are far less likely to cancel.",
          points: 1,
          options: [
            {
              option_text:
                "They internalize the value and take ownership of their decision",
              is_correct: true,
            },
            {
              option_text: "It fills time while the app processes",
              is_correct: false,
            },
            {
              option_text: "It's required by the insurance carrier",
              is_correct: false,
            },
            {
              option_text: "It proves they were paying attention",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "The accidental policy upsell is positioned as:",
          explanation:
            "The accidental policy is framed as making the plan 'comprehensive' — filling the last gap for complete coverage. Social proof ('most families add this') normalizes it.",
          points: 1,
          options: [
            {
              option_text:
                "Making the plan comprehensive for complete coverage — 'most families add this'",
              is_correct: true,
            },
            {
              option_text: "A separate product they need to think about",
              is_correct: false,
            },
            {
              option_text: "A requirement from the carrier",
              is_correct: false,
            },
            {
              option_text: "A way to increase your commission",
              is_correct: false,
            },
          ],
        },
        {
          question_type: "multiple_choice",
          question_text:
            "When asking for referrals, the best approach is:",
          explanation:
            "'Who comes to mind?' assumes the answer exists — it's much more effective than 'Do you know anyone?' which invites 'no.' Framing it as protecting them too creates a reason to share.",
          points: 1,
          options: [
            {
              option_text:
                "'Who comes to mind that would benefit from a needs analysis?' — assume the answer",
              is_correct: true,
            },
            {
              option_text: "Ask 'Do you know anyone who needs insurance?'",
              is_correct: false,
            },
            {
              option_text: "Skip referrals — it's too pushy",
              is_correct: false,
            },
            {
              option_text: "Send them a referral form via email",
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
  console.log("🚀 Starting Mortgage Protection Module seed...\n");

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
