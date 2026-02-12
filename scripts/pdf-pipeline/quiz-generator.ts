// scripts/pdf-pipeline/quiz-generator.ts
// Uses Claude API to generate quiz questions from extraction data

import Anthropic from "@anthropic-ai/sdk";
import type { KeyPoint, QuizSeed, QuizQuestionSeed } from "./types";

const QUIZ_DEFAULTS = {
  pass_threshold: 70,
  max_attempts: 3,
  shuffle_questions: true,
  show_correct_answers: true,
  shuffle_options: true,
  xp_bonus_perfect: 25,
};

interface QuizGeneratorInput {
  keyPoints: KeyPoint[];
  lessonSummaries: { title: string; description: string }[];
  moduleName: string;
}

interface GeneratedQuestion {
  question_type: "multiple_choice" | "true_false";
  question_text: string;
  explanation: string;
  correct_answer: string;
  wrong_answers: string[];
}

/**
 * Generate quiz lessons using Claude API.
 * Returns one QuizSeed per quiz lesson to be inserted.
 */
export async function generateQuizzes(
  input: QuizGeneratorInput,
): Promise<QuizSeed[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "  ⚠ ANTHROPIC_API_KEY not set — generating placeholder quizzes. Edit manually.",
    );
    return [createPlaceholderQuiz()];
  }

  const client = new Anthropic({ apiKey });

  // Sort key points by score, take top 30
  const topPoints = [...input.keyPoints]
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  // Build context for Claude
  const lessonsText = input.lessonSummaries
    .map((l) => `- ${l.title}: ${l.description}`)
    .join("\n");

  // Determine how many quizzes to generate (1 per 2-3 content lessons)
  const quizCount = Math.max(1, Math.ceil(input.lessonSummaries.length / 3));
  const pointsPerQuiz = Math.ceil(topPoints.length / quizCount);

  const quizzes: QuizSeed[] = [];

  for (let q = 0; q < quizCount; q++) {
    const quizPoints = topPoints.slice(
      q * pointsPerQuiz,
      (q + 1) * pointsPerQuiz,
    );
    if (quizPoints.length === 0) break;

    const quizPointsText = quizPoints
      .map(
        (kp, i) =>
          `${i + 1}. ${kp.text} (Source: ${kp.parent_context.section_header})`,
      )
      .join("\n");

    console.log(
      `  Generating quiz ${q + 1}/${quizCount} (${quizPoints.length} key points)...`,
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      temperature: 0.3,
      system: `You are an insurance training quiz generator. Generate quiz questions that test practical knowledge for insurance agents studying carrier underwriting guides. Questions should test understanding of specific thresholds, rules, and procedures — not trivia. Each question needs an explanation referencing the source content.

Output ONLY valid JSON matching this exact schema (no markdown, no commentary):
{
  "questions": [
    {
      "question_type": "multiple_choice" | "true_false",
      "question_text": "...",
      "explanation": "...",
      "correct_answer": "...",
      "wrong_answers": ["...", "...", "..."]
    }
  ]
}

For multiple_choice: provide exactly 3 wrong_answers (plausible distractors based on common misconceptions).
For true_false: correct_answer must be "True" or "False", wrong_answers must be the opposite.`,
      messages: [
        {
          role: "user",
          content: `Generate quiz questions for the "${input.moduleName}" training module.

Module lessons:
${lessonsText}

Key facts to test (from the carrier document):
${quizPointsText}

Generate:
- 8-10 multiple_choice questions testing specific facts, numbers, and procedures
- 2-3 true_false questions
- Each explanation should reference which section/topic the answer comes from
- Wrong answers should be plausible (e.g., off-by-one thresholds, similar product names)`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const parsed = JSON.parse(text) as { questions: GeneratedQuestion[] };
      const questions: QuizQuestionSeed[] = parsed.questions.map((gq) => ({
        question_type: gq.question_type,
        question_text: gq.question_text,
        explanation: gq.explanation,
        points: gq.question_type === "multiple_choice" ? 10 : 5,
        options: buildOptions(gq),
      }));

      quizzes.push({
        ...QUIZ_DEFAULTS,
        questions,
      });

      console.log(`    ✓ Generated ${questions.length} questions`);
    } catch (_err) {
      console.error(`    ✗ Failed to parse quiz response, using placeholder`);
      console.error(`    Raw response: ${text.substring(0, 200)}...`);
      quizzes.push(createPlaceholderQuiz());
    }
  }

  return quizzes;
}

function buildOptions(gq: GeneratedQuestion): QuizQuestionSeed["options"] {
  const options = [
    { option_text: gq.correct_answer, is_correct: true },
    ...gq.wrong_answers.map((wa) => ({ option_text: wa, is_correct: false })),
  ];
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function createPlaceholderQuiz(): QuizSeed {
  return {
    ...QUIZ_DEFAULTS,
    questions: [
      {
        question_type: "multiple_choice",
        question_text: "PLACEHOLDER: Replace with actual question",
        explanation: "PLACEHOLDER: Add explanation referencing source material",
        points: 10,
        options: [
          { option_text: "Correct answer", is_correct: true },
          { option_text: "Wrong answer A", is_correct: false },
          { option_text: "Wrong answer B", is_correct: false },
          { option_text: "Wrong answer C", is_correct: false },
        ],
      },
    ],
  };
}
