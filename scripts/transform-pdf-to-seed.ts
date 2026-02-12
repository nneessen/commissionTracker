// scripts/transform-pdf-to-seed.ts
// CLI entry point: transforms PDF extraction JSON → training module seed script
//
// Usage:
//   npx tsx scripts/transform-pdf-to-seed.ts --input extraction.json --output scripts/seed-my-module.ts
//
// Options:
//   --input   Path to the PDF extraction JSON file (required)
//   --output  Path for the generated seed script (required)

import { transform } from "./pdf-pipeline/transform";

function parseArgs(): { input: string; output: string } {
  const args = process.argv.slice(2);
  let input = "";
  let output = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      input = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      output = args[++i];
    }
  }

  if (!input || !output) {
    console.error(
      "Usage: npx tsx scripts/transform-pdf-to-seed.ts --input <extraction.json> --output <seed-script.ts>",
    );
    console.error("");
    console.error("Options:");
    console.error(
      "  --input   Path to the PDF extraction JSON file (required)",
    );
    console.error("  --output  Path for the generated seed script (required)");
    console.error("");
    console.error("Environment variables:");
    console.error(
      "  ANTHROPIC_API_KEY  Optional. If set, uses Claude API for enhanced quiz generation.",
    );
    console.error(
      "                     If not set, falls back to the extractor's basic quizzes.",
    );
    process.exit(1);
  }

  return { input, output };
}

async function main() {
  const { input, output } = parseArgs();

  console.log("=== PDF Extraction → Training Module Seed Pipeline ===\n");

  await transform({
    inputPath: input,
    outputPath: output,
  });
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
