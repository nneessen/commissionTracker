// scripts/pdf-pipeline/transform.ts
// Core transformation: PDF extraction JSON → seed script
// Uses extractor's pre-grouped lessons directly (no auto-grouping)

import * as fs from "fs";
import * as path from "path";
import type {
  PdfExtraction,
  ExtractionContentBlock,
  ExtractionQuiz,
  LessonSeed,
  ContentBlockSeed,
  QuizSeed,
  QuizQuestionSeed,
  ModuleSeed,
} from "./types";
import { generateQuizzes } from "./quiz-generator";

// ─────────────────────────────────────────────────────────────────────────────
// Main transform pipeline
// ─────────────────────────────────────────────────────────────────────────────

export interface TransformOptions {
  inputPath: string;
  outputPath: string;
}

export async function transform(options: TransformOptions): Promise<void> {
  const { inputPath, outputPath } = options;

  // ── Step 1: Parse & Validate ──────────────────────────────────────────────
  console.log("Step 1: Loading extraction JSON...");
  const raw = fs.readFileSync(inputPath, "utf-8");
  const extraction: PdfExtraction = JSON.parse(raw);

  validateExtraction(extraction);

  const meta = extraction.document_metadata;
  console.log('  \u2713 Loaded: "' + meta.title + '"');

  // Use extractor's pre-grouped lessons
  const extractorLessons =
    extraction.lessons.length > 0
      ? extraction.lessons
      : extraction.module_seed?.lessons || [];

  console.log(
    "    " +
      extractorLessons.length +
      " lessons, " +
      extraction.key_points.length +
      " key points",
  );

  if (extractorLessons.length === 0) {
    console.error("  \u2717 No lessons found in extraction JSON.");
    console.error(
      "    The extractor must provide pre-grouped lessons[] or module_seed.lessons[].",
    );
    process.exit(1);
  }

  // ── Step 2: Map extractor lessons → seed format ───────────────────────────
  console.log("\nStep 2: Mapping lessons to seed format...");
  const contentLessons: LessonSeed[] = [];

  for (const lesson of extractorLessons) {
    const blocks = mapContentBlocks(lesson.content_blocks);

    if (blocks.length > 0) {
      // Estimate reading time: ~200 words per minute
      const totalWords = blocks.reduce((sum, b) => {
        const text = (b.rich_text_content || "").replace(/<[^>]+>/g, "");
        return sum + text.split(/\s+/).length;
      }, 0);
      const readingMinutes = Math.max(5, Math.ceil(totalWords / 200));

      contentLessons.push({
        title: lesson.title,
        lesson_type: "content",
        estimated_duration_minutes: readingMinutes,
        xp_reward: 25,
        description:
          lesson.learning_objective ||
          "Learn about " + lesson.title.toLowerCase() + ".",
        is_required: true,
        content_blocks: blocks,
      });
    }
  }

  console.log("  \u2713 " + contentLessons.length + " content lessons mapped");

  // ── Step 3: Generate quizzes ──────────────────────────────────────────────
  console.log("\nStep 3: Generating quizzes...");

  // Collect extractor's basic quizzes as fallback
  const extractorQuizzes = extractorLessons.flatMap((l) => l.quizzes || []);

  let quizSeeds: QuizSeed[];

  if (process.env.ANTHROPIC_API_KEY) {
    // Enhanced quizzes via Claude API
    quizSeeds = await generateQuizzes({
      keyPoints: extraction.key_points,
      lessonSummaries: contentLessons.map((l) => ({
        title: l.title,
        description: l.description,
      })),
      moduleName: meta.title,
    });
  } else if (extractorQuizzes.length > 0) {
    // Use extractor's quizzes as fallback
    console.warn(
      "  \u26a0 ANTHROPIC_API_KEY not set \u2014 using extractor quizzes.",
    );
    quizSeeds = [mapExtractorQuizzes(extractorQuizzes)];
  } else {
    console.warn(
      "  \u26a0 No quizzes available (no API key and no extractor quizzes).",
    );
    quizSeeds = [];
  }

  console.log("  \u2713 " + quizSeeds.length + " quiz(zes) generated");

  // ── Step 4: Interleave content + quiz lessons ─────────────────────────────
  const allLessons = interleave(contentLessons, quizSeeds);

  // ── Step 5: Build module seed & generate script ───────────────────────────
  console.log("\nStep 4: Writing seed script...");

  const moduleSeed: ModuleSeed = {
    title:
      extraction.module_seed?.title ||
      meta.carrier + " " + meta.product + " Training",
    description:
      extraction.module_seed?.description ||
      "Comprehensive training module for " +
        meta.carrier +
        " " +
        meta.product +
        ".",
    category: "product_training",
    difficulty: "intermediate",
    duration: allLessons.reduce(
      (sum, l) => sum + l.estimated_duration_minutes,
      0,
    ),
    xp: allLessons.reduce((sum, l) => sum + l.xp_reward, 0),
    tags: extraction.module_seed?.tags || [
      meta.carrier.toLowerCase(),
      meta.product.toLowerCase(),
      "training",
    ],
    lessons: allLessons,
  };

  const seedScript = generateSeedScript(moduleSeed, outputPath);
  fs.writeFileSync(outputPath, seedScript, "utf-8");

  // ── Summary ─────────────────────────────────────────────────────────────
  const totalBlocks = allLessons.reduce(
    (s, l) => s + (l.content_blocks?.length || 0),
    0,
  );
  const totalQuestions = allLessons.reduce(
    (s, l) => s + (l.quiz?.questions.length || 0),
    0,
  );

  console.log("\n\u2705 Seed script written to: " + outputPath);
  console.log('   Module: "' + moduleSeed.title + '"');
  console.log(
    "   Lessons: " +
      allLessons.length +
      " (" +
      contentLessons.length +
      " content + " +
      quizSeeds.length +
      " quiz)",
  );
  console.log("   Content blocks: " + totalBlocks);
  console.log("   Quiz questions: " + totalQuestions);
  console.log("   Estimated duration: " + moduleSeed.duration + " minutes");
  console.log("   Total XP: " + moduleSeed.xp);
  console.log("\nNext: Review the output, then run:");
  console.log("   USER_ID=<uuid> IMO_ID=<uuid> npx tsx " + outputPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapContentBlocks(
  blocks: ExtractionContentBlock[],
): ContentBlockSeed[] {
  return blocks
    .filter((b) => b.html && b.html.trim().length > 0)
    .map((b) => ({
      content_type: "rich_text",
      title: b.title || "Content",
      rich_text_content: b.html,
    }));
}

function mapExtractorQuizzes(quizzes: ExtractionQuiz[]): QuizSeed {
  const questions: QuizQuestionSeed[] = quizzes.map((q) => ({
    question_type: "multiple_choice",
    question_text: q.question_text,
    explanation: q.explanation || "",
    points: 10,
    options: q.options.map((o) => ({
      option_text: o.text,
      is_correct: o.is_correct,
    })),
  }));

  return {
    pass_threshold: 70,
    max_attempts: 3,
    shuffle_questions: true,
    show_correct_answers: true,
    shuffle_options: true,
    xp_bonus_perfect: 25,
    questions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Interleave content lessons with quiz lessons
// ─────────────────────────────────────────────────────────────────────────────

function interleave(
  contentLessons: LessonSeed[],
  quizSeeds: QuizSeed[],
): LessonSeed[] {
  if (quizSeeds.length === 0) return contentLessons;

  const allLessons: LessonSeed[] = [];
  let quizIdx = 0;
  const contentPerQuiz = Math.ceil(
    contentLessons.length / Math.max(1, quizSeeds.length),
  );

  for (let i = 0; i < contentLessons.length; i++) {
    allLessons.push(contentLessons[i]);

    if ((i + 1) % contentPerQuiz === 0 && quizIdx < quizSeeds.length) {
      const quizNumber = quizIdx + 1;
      allLessons.push({
        title: "Knowledge Check " + quizNumber,
        lesson_type: "quiz",
        estimated_duration_minutes: 10,
        xp_reward: 50,
        description: "Test your understanding of the material covered so far.",
        is_required: true,
        quiz: quizSeeds[quizIdx],
      });
      quizIdx++;
    }
  }

  // Append remaining quizzes
  while (quizIdx < quizSeeds.length) {
    allLessons.push({
      title: "Final Knowledge Check",
      lesson_type: "quiz",
      estimated_duration_minutes: 10,
      xp_reward: 50,
      description: "Final assessment covering all module content.",
      is_required: true,
      quiz: quizSeeds[quizIdx],
    });
    quizIdx++;
  }

  return allLessons;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed script code generation (string concatenation — no nested template literals)
// ─────────────────────────────────────────────────────────────────────────────

function generateSeedScript(module: ModuleSeed, outputPath: string): string {
  const scriptName = path.basename(outputPath);
  const lessonsJson = JSON.stringify(module.lessons, null, 2);
  const bt = "`"; // backtick character for template literals in generated code

  const p: string[] = [];

  // ── File header ─────────────────────────────────────────────────────────
  p.push("// " + scriptName);
  p.push("// Auto-generated seed script: " + module.title);
  p.push("// Generated by: scripts/transform-pdf-to-seed.ts");
  p.push("// Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx " + outputPath);
  p.push("");
  p.push('import { createClient } from "@supabase/supabase-js";');
  p.push("");
  p.push('const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";');
  p.push("const supabaseKey =");
  p.push(
    '  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";',
  );
  p.push("");
  p.push("const supabase = createClient(supabaseUrl, supabaseKey);");
  p.push("");
  p.push("const USER_ID = process.env.USER_ID;");
  p.push("const IMO_ID = process.env.IMO_ID;");
  p.push("");
  p.push("if (!USER_ID || !IMO_ID) {");
  p.push(
    '  console.error("ERROR: USER_ID and IMO_ID env vars are required.");',
  );
  p.push("  console.error(");
  p.push(
    '    "Usage: USER_ID=<uuid> IMO_ID=<uuid> npx tsx ' + outputPath + '",',
  );
  p.push("  );");
  p.push("  process.exit(1);");
  p.push("}");
  p.push("");

  // ── Type definitions ────────────────────────────────────────────────────
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("// Types for seed data");
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("interface ContentBlockSeed {");
  p.push("  content_type: string;");
  p.push("  title: string;");
  p.push("  rich_text_content?: string;");
  p.push("  script_prompt_text?: string;");
  p.push("  script_prompt_instructions?: string;");
  p.push("  external_url?: string;");
  p.push("  external_url_label?: string;");
  p.push("}");
  p.push("");
  p.push("interface QuizOptionSeed {");
  p.push("  option_text: string;");
  p.push("  is_correct: boolean;");
  p.push("}");
  p.push("");
  p.push("interface QuizQuestionSeed {");
  p.push("  question_type: string;");
  p.push("  question_text: string;");
  p.push("  explanation: string;");
  p.push("  points: number;");
  p.push("  options: QuizOptionSeed[];");
  p.push("}");
  p.push("");
  p.push("interface QuizSeed {");
  p.push("  pass_threshold: number;");
  p.push("  max_attempts: number;");
  p.push("  shuffle_questions: boolean;");
  p.push("  show_correct_answers: boolean;");
  p.push("  shuffle_options: boolean;");
  p.push("  xp_bonus_perfect: number;");
  p.push("  time_limit_minutes?: number;");
  p.push("  questions: QuizQuestionSeed[];");
  p.push("}");
  p.push("");
  p.push("interface LessonSeed {");
  p.push("  title: string;");
  p.push("  lesson_type: string;");
  p.push("  estimated_duration_minutes: number;");
  p.push("  xp_reward: number;");
  p.push("  description: string;");
  p.push("  is_required: boolean;");
  p.push("  content_blocks?: ContentBlockSeed[];");
  p.push("  quiz?: QuizSeed;");
  p.push("}");
  p.push("");

  // ── Module metadata ─────────────────────────────────────────────────────
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("// Module metadata");
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("const MODULE_TITLE = " + JSON.stringify(module.title) + ";");
  p.push(
    "const MODULE_DESCRIPTION = " + JSON.stringify(module.description) + ";",
  );
  p.push("const MODULE_CATEGORY = " + JSON.stringify(module.category) + ";");
  p.push(
    "const MODULE_DIFFICULTY = " + JSON.stringify(module.difficulty) + ";",
  );
  p.push("const MODULE_DURATION = " + module.duration + ";");
  p.push("const MODULE_XP = " + module.xp + ";");
  p.push("const MODULE_TAGS = " + JSON.stringify(module.tags) + ";");
  p.push("");

  // ── Lesson data ─────────────────────────────────────────────────────────
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("// Lesson data");
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("const LESSONS: LessonSeed[] = " + lessonsJson + ";");
  p.push("");

  // ── Seed execution function ─────────────────────────────────────────────
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("// Seed execution");
  p.push(
    "// ---------------------------------------------------------------------------",
  );
  p.push("async function seed() {");
  p.push(
    "  console.log(" +
      bt +
      '\\uD83D\\uDE80 Starting "${MODULE_TITLE}" seed...\\n' +
      bt +
      ");",
  );
  p.push("");
  p.push("  // Idempotency check");
  p.push("  const { data: existing } = await supabase");
  p.push('    .from("training_modules")');
  p.push('    .select("id")');
  p.push('    .eq("title", MODULE_TITLE)');
  p.push('    .eq("imo_id", IMO_ID!)');
  p.push("    .maybeSingle();");
  p.push("");
  p.push("  if (existing) {");
  p.push(
    "    console.log(" +
      bt +
      'Module "${MODULE_TITLE}" already exists (id: ${existing.id}). Skipping.' +
      bt +
      ");",
  );
  p.push("    process.exit(0);");
  p.push("  }");
  p.push("");
  p.push("  // Create module");
  p.push('  console.log("Creating module...");');
  p.push("  const { data: mod, error: modErr } = await supabase");
  p.push('    .from("training_modules")');
  p.push("    .insert({");
  p.push("      title: MODULE_TITLE,");
  p.push("      description: MODULE_DESCRIPTION,");
  p.push("      category: MODULE_CATEGORY,");
  p.push("      difficulty_level: MODULE_DIFFICULTY,");
  p.push("      estimated_duration_minutes: MODULE_DURATION,");
  p.push("      xp_reward: MODULE_XP,");
  p.push("      tags: MODULE_TAGS,");
  p.push("      imo_id: IMO_ID,");
  p.push("      created_by: USER_ID,");
  p.push("      metadata: {},");
  p.push("    })");
  p.push("    .select()");
  p.push("    .single();");
  p.push("");
  p.push("  if (modErr) {");
  p.push('    console.error("Failed to create module:", modErr);');
  p.push("    process.exit(1);");
  p.push("  }");
  p.push(
    "  console.log(" +
      bt +
      "  \\u2713 Module created: ${mod.id}\\n" +
      bt +
      ");",
  );
  p.push("");
  p.push("  // Create lessons");
  p.push("  for (let i = 0; i < LESSONS.length; i++) {");
  p.push("    const lesson = LESSONS[i];");
  p.push(
    "    console.log(" +
      bt +
      'Creating lesson ${i + 1}/${LESSONS.length}: "${lesson.title}"...' +
      bt +
      ");",
  );
  p.push("");
  p.push("    const { data: les, error: lesErr } = await supabase");
  p.push('      .from("training_lessons")');
  p.push("      .insert({");
  p.push("        module_id: mod.id,");
  p.push("        title: lesson.title,");
  p.push("        lesson_type: lesson.lesson_type,");
  p.push(
    "        estimated_duration_minutes: lesson.estimated_duration_minutes,",
  );
  p.push("        xp_reward: lesson.xp_reward,");
  p.push("        description: lesson.description,");
  p.push("        is_required: lesson.is_required,");
  p.push("        sort_order: i,");
  p.push("        imo_id: IMO_ID,");
  p.push("      })");
  p.push("      .select()");
  p.push("      .single();");
  p.push("");
  p.push("    if (lesErr) {");
  p.push(
    "      console.error(" +
      bt +
      "  \\u2717 Failed to create lesson:" +
      bt +
      ", lesErr);",
  );
  p.push("      process.exit(1);");
  p.push("    }");
  p.push(
    "    console.log(" + bt + "  \\u2713 Lesson created: ${les.id}" + bt + ");",
  );
  p.push("");
  p.push("    // Content blocks");
  p.push("    if (lesson.content_blocks) {");
  p.push("      for (let j = 0; j < lesson.content_blocks.length; j++) {");
  p.push("        const block = lesson.content_blocks[j];");
  p.push("        const insertData: Record<string, unknown> = {");
  p.push("          lesson_id: les.id,");
  p.push("          content_type: block.content_type,");
  p.push("          title: block.title,");
  p.push("          sort_order: j,");
  p.push("          imo_id: IMO_ID,");
  p.push("        };");
  p.push("");
  p.push(
    "        if (block.rich_text_content) insertData.rich_text_content = block.rich_text_content;",
  );
  p.push(
    "        if (block.script_prompt_text) insertData.script_prompt_text = block.script_prompt_text;",
  );
  p.push(
    "        if (block.script_prompt_instructions) insertData.script_prompt_instructions = block.script_prompt_instructions;",
  );
  p.push(
    "        if (block.external_url) insertData.external_url = block.external_url;",
  );
  p.push(
    "        if (block.external_url_label) insertData.external_url_label = block.external_url_label;",
  );
  p.push("");
  p.push("        const { error: blockErr } = await supabase");
  p.push('          .from("training_lesson_content")');
  p.push("          .insert(insertData);");
  p.push("");
  p.push("        if (blockErr) {");
  p.push(
    "          console.error(" +
      bt +
      '  \\u2717 Failed to create block "${block.title}":' +
      bt +
      ", blockErr);",
  );
  p.push("          process.exit(1);");
  p.push("        }");
  p.push(
    "        console.log(" +
      bt +
      '    \\u2713 Block ${j}: "${block.title}" (${block.content_type})' +
      bt +
      ");",
  );
  p.push("      }");
  p.push("    }");
  p.push("");
  p.push("    // Quiz");
  p.push("    if (lesson.quiz) {");
  p.push("      const quiz = lesson.quiz;");
  p.push("      const { data: q, error: qErr } = await supabase");
  p.push('        .from("training_quizzes")');
  p.push("        .insert({");
  p.push("          lesson_id: les.id,");
  p.push("          pass_threshold: quiz.pass_threshold,");
  p.push("          max_attempts: quiz.max_attempts,");
  p.push("          shuffle_questions: quiz.shuffle_questions,");
  p.push("          show_correct_answers: quiz.show_correct_answers,");
  p.push("          shuffle_options: quiz.shuffle_options,");
  p.push("          xp_bonus_perfect: quiz.xp_bonus_perfect,");
  p.push("          time_limit_minutes: quiz.time_limit_minutes || null,");
  p.push("          imo_id: IMO_ID,");
  p.push("        })");
  p.push("        .select()");
  p.push("        .single();");
  p.push("");
  p.push("      if (qErr) {");
  p.push(
    "        console.error(" +
      bt +
      "  \\u2717 Failed to create quiz:" +
      bt +
      ", qErr);",
  );
  p.push("        process.exit(1);");
  p.push("      }");
  p.push(
    "      console.log(" + bt + "    \\u2713 Quiz created: ${q.id}" + bt + ");",
  );
  p.push("");
  p.push("      for (let k = 0; k < quiz.questions.length; k++) {");
  p.push("        const question = quiz.questions[k];");
  p.push("        const { data: qn, error: qnErr } = await supabase");
  p.push('          .from("training_quiz_questions")');
  p.push("          .insert({");
  p.push("            quiz_id: q.id,");
  p.push("            question_type: question.question_type,");
  p.push("            question_text: question.question_text,");
  p.push("            explanation: question.explanation,");
  p.push("            points: question.points,");
  p.push("            sort_order: k,");
  p.push("            imo_id: IMO_ID,");
  p.push("          })");
  p.push("          .select()");
  p.push("          .single();");
  p.push("");
  p.push("        if (qnErr) {");
  p.push(
    "          console.error(" +
      bt +
      "  \\u2717 Failed to create question:" +
      bt +
      ", qnErr);",
  );
  p.push("          process.exit(1);");
  p.push("        }");
  p.push("");
  p.push("        for (let m = 0; m < question.options.length; m++) {");
  p.push("          const opt = question.options[m];");
  p.push("          const { error: optErr } = await supabase");
  p.push('            .from("training_quiz_options")');
  p.push("            .insert({");
  p.push("              question_id: qn.id,");
  p.push("              option_text: opt.option_text,");
  p.push("              is_correct: opt.is_correct,");
  p.push("              sort_order: m,");
  p.push("            });");
  p.push("");
  p.push("          if (optErr) {");
  p.push(
    "            console.error(" +
      bt +
      "  \\u2717 Failed to create option:" +
      bt +
      ", optErr);",
  );
  p.push("            process.exit(1);");
  p.push("          }");
  p.push("        }");
  p.push(
    "        console.log(" +
      bt +
      '      \\u2713 Question ${k}: "${question.question_text.substring(0, 50)}..." (${question.options.length} options)' +
      bt +
      ");",
  );
  p.push("      }");
  p.push("    }");
  p.push("  }");
  p.push("");
  p.push("  console.log(" + bt + "\\n\\u2705 Seed complete!" + bt + ");");
  p.push("  console.log(" + bt + 'Module: "${MODULE_TITLE}"' + bt + ");");
  p.push("  console.log(" + bt + "Module ID: ${mod.id}" + bt + ");");
  p.push("  console.log(" + bt + "Lessons: ${LESSONS.length}" + bt + ");");
  p.push(
    "  console.log(" +
      bt +
      "Content blocks: ${LESSONS.reduce((sum: number, l: LessonSeed) => sum + (l.content_blocks?.length || 0), 0)}" +
      bt +
      ");",
  );
  p.push(
    "  console.log(" +
      bt +
      "Quiz questions: ${LESSONS.reduce((sum: number, l: LessonSeed) => sum + (l.quiz?.questions.length || 0), 0)}" +
      bt +
      ");",
  );
  p.push(
    "  console.log(" +
      bt +
      "\\nNote: Module is NOT published. Publish via the admin UI when ready." +
      bt +
      ");",
  );
  p.push("}");
  p.push("");
  p.push("seed().catch((err) => {");
  p.push('  console.error("Seed failed:", err);');
  p.push("  process.exit(1);");
  p.push("});");

  return p.join("\n") + "\n";
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateExtraction(extraction: PdfExtraction): void {
  const errors: string[] = [];

  if (!extraction.document_metadata) {
    errors.push("Missing document_metadata");
  } else {
    if (!extraction.document_metadata.title)
      errors.push("Missing document_metadata.title");
    if (!extraction.document_metadata.carrier)
      errors.push("Missing document_metadata.carrier");
    if (!extraction.document_metadata.product)
      errors.push("Missing document_metadata.product");
  }

  if (!extraction.sections || extraction.sections.length === 0) {
    errors.push("Missing or empty sections[]");
  }

  if (!extraction.key_points || extraction.key_points.length === 0) {
    console.warn(
      "  \u26a0 No key_points found \u2014 quiz generation may produce poor results",
    );
  }

  if (errors.length > 0) {
    console.error("Validation errors in extraction JSON:");
    for (const e of errors) {
      console.error("  \u2717 " + e);
    }
    process.exit(1);
  }
}
