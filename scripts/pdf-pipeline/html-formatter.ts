// scripts/pdf-pipeline/html-formatter.ts
// Converts extraction text/tables → HTML content blocks

import type { Section, ExtractionTable, KeyPoint } from "./types";

/**
 * Detect garbled text: >50% single-word tokens with no sentence structure.
 */
export function detectGarbled(text: string): boolean {
  if (!text || text.trim().length === 0) return true;

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return true;

  // Check for sentence-like structure: lines with 5+ words and ending punctuation
  let sentenceLines = 0;
  let totalLines = 0;

  for (const line of lines) {
    const words = line.trim().split(/\s+/);
    totalLines++;
    if (words.length >= 4 && /[.!?:;]$/.test(line.trim())) {
      sentenceLines++;
    }
  }

  // If fewer than 20% of lines look like sentences, it's probably garbled
  if (totalLines > 3 && sentenceLines / totalLines < 0.2) {
    // Double-check: look for excessive single-char or nonsense tokens
    const allWords = text.split(/\s+/);
    const shortTokens = allWords.filter((w) => w.length <= 2).length;
    if (shortTokens / allWords.length > 0.5) return true;
  }

  return false;
}

/**
 * Convert a section's full_text to HTML paragraphs with structure detection.
 */
export function formatSectionToHtml(section: Section): string {
  const text = section.full_text;
  if (!text || text.trim().length === 0) return "";

  const lines = text.split("\n");
  const htmlParts: string[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      htmlParts.push(
        "<ul>" +
          currentList.map((item) => `<li>${escapeHtml(item)}</li>`).join("") +
          "</ul>",
      );
      currentList = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flushList();
      continue;
    }

    // Detect bullet list items
    if (/^[•\-*\u2022\u25CF]\s+/.test(line)) {
      const itemText = line.replace(/^[•\-*\u2022\u25CF]\s+/, "");
      currentList.push(itemText);
      continue;
    }

    // Numbered list items
    if (/^\d+[.)]\s+/.test(line)) {
      const itemText = line.replace(/^\d+[.)]\s+/, "");
      currentList.push(itemText);
      continue;
    }

    flushList();

    // Detect headers: short lines (< 80 chars), no ending punctuation, looks like a title
    if (line.length < 80 && !/[.!?]$/.test(line) && /^[A-Z]/.test(line)) {
      // Check if it's ALL CAPS or Title Case
      const isAllCaps = line === line.toUpperCase() && line.length > 3;
      const isTitleCase =
        /^[A-Z][a-z]/.test(line) && line.split(/\s+/).length <= 8;

      if (isAllCaps) {
        htmlParts.push(`<h2>${escapeHtml(line)}</h2>`);
        continue;
      }
      if (isTitleCase && line.length < 60 && !/[,;]/.test(line)) {
        htmlParts.push(`<h3>${escapeHtml(line)}</h3>`);
        continue;
      }
    }

    // Regular paragraph — bold key terms
    htmlParts.push(`<p>${boldKeyTerms(escapeHtml(line))}</p>`);
  }

  flushList();
  return htmlParts.join("\n");
}

/**
 * Convert an ExtractionTable to an HTML table element.
 * If the table already has pre-rendered HTML, returns it directly.
 */
export function formatTableToHtml(table: ExtractionTable): string {
  // Use pre-rendered HTML if available
  if (table.html && table.html.trim().length > 0) {
    return table.html;
  }

  if (!table.headers.length && !table.rows.length) return "";

  const parts: string[] = [];

  if (table.section_header) {
    parts.push(`<h3>${escapeHtml(table.section_header)}</h3>`);
  }

  parts.push('<table class="w-full border-collapse text-sm">');

  // Headers
  if (table.headers.length > 0) {
    parts.push("  <thead>");
    parts.push("    <tr>");
    for (const header of table.headers) {
      parts.push(
        `      <th class="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold">${escapeHtml(header)}</th>`,
      );
    }
    parts.push("    </tr>");
    parts.push("  </thead>");
  }

  // Rows — each row is Record<string, string>, use headers as keys
  if (table.rows.length > 0) {
    parts.push("  <tbody>");
    for (const row of table.rows) {
      parts.push("    <tr>");
      for (const header of table.headers) {
        const cellValue = row[header] || "";
        parts.push(
          `      <td class="border border-gray-300 px-3 py-1.5">${escapeHtml(cellValue)}</td>`,
        );
      }
      parts.push("    </tr>");
    }
    parts.push("  </tbody>");
  }

  parts.push("</table>");
  return parts.join("\n");
}

/**
 * Inject high-scoring key points as blockquotes into HTML content.
 */
export function injectKeyPoints(
  html: string,
  keyPoints: KeyPoint[],
  minScore = 0.7,
): string {
  const relevantPoints = keyPoints
    .filter((kp) => kp.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Max 5 key points per section

  if (relevantPoints.length === 0) return html;

  const blockquotes = relevantPoints
    .map(
      (kp) =>
        `<blockquote class="border-l-4 border-blue-500 pl-4 my-3 text-sm italic"><strong>Key detail:</strong> ${escapeHtml(kp.text)}</blockquote>`,
    )
    .join("\n");

  // Insert after the first paragraph or header
  const insertPoint = html.search(/<\/(p|h[23])>/);
  if (insertPoint !== -1) {
    const tagEnd = html.indexOf(">", insertPoint) + 1;
    return (
      html.slice(0, tagEnd) + "\n" + blockquotes + "\n" + html.slice(tagEnd)
    );
  }

  // Fallback: prepend
  return blockquotes + "\n" + html;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Bold common insurance key terms within text.
 */
function boldKeyTerms(text: string): string {
  const terms = [
    /\b(face amount|death benefit|cash value|premium|underwriting)\b/gi,
    /\b(rider|beneficiary|exclusion|elimination period)\b/gi,
    /\b(guaranteed|non-guaranteed|level term|whole life|universal life|IUL)\b/gi,
    /\b(decline|approve|refer|postpone)\b/gi,
    /\$[\d,]+(?:\.\d{2})?/g, // Dollar amounts
    /\b\d+%\b/g, // Percentages
  ];

  let result = text;
  for (const pattern of terms) {
    result = result.replace(pattern, "<strong>$&</strong>");
  }
  return result;
}
