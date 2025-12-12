// src/features/email/services/htmlToTextService.ts

import {convert} from 'html-to-text'

/**
 * HTML to plain text conversion service
 * Generates email-friendly plain text from HTML for multipart emails
 */

/**
 * Convert HTML to plain text with email-friendly formatting
 * Used to generate body_text for emails (Gmail API expects both HTML and plain text)
 */
export function convertHtmlToText(html: string): string {
  if (!html || html.trim() === '') {
    return ''
  }

  return convert(html, {
    // Preserve paragraph breaks
    preserveNewlines: true,

    // Word wrapping at 80 characters (standard for plain text emails)
    wordwrap: 80,

    // Selectors for specific formatting
    selectors: [
      // Paragraphs: Add blank line after
      { selector: 'p', options: { leadingLineBreaks: 1, trailingLineBreaks: 2 } },

      // Headings: Add blank lines before/after and convert to uppercase
      {
        selector: 'h1',
        options: { leadingLineBreaks: 2, trailingLineBreaks: 2, uppercase: true },
      },
      {
        selector: 'h2',
        options: { leadingLineBreaks: 2, trailingLineBreaks: 2, uppercase: true },
      },
      {
        selector: 'h3',
        options: { leadingLineBreaks: 2, trailingLineBreaks: 2 },
      },

      // Links: Show as "text (URL)"
      { selector: 'a', options: { linkBrackets: ['(', ')'] } },

      // Lists: Proper bullet formatting
      {
        selector: 'ul',
        options: { itemPrefix: '  • ', leadingLineBreaks: 1, trailingLineBreaks: 2 },
      },
      {
        selector: 'ol',
        options: { leadingLineBreaks: 1, trailingLineBreaks: 2 },
      },

      // Blockquotes: Indent with >
      {
        selector: 'blockquote',
        options: {
          leadingLineBreaks: 2,
          trailingLineBreaks: 2,
          trimEmptyLines: true,
        },
      },

      // Images: Show alt text
      { selector: 'img', format: 'skip' },

      // Line breaks
      { selector: 'br', options: { leadingLineBreaks: 1, trailingLineBreaks: 0 } },

      // Ignore these tags completely
      { selector: 'style', format: 'skip' },
      { selector: 'script', format: 'skip' },
    ],
  })
}

/**
 * Generate preview text from HTML (first N characters)
 * Used for email previews in lists
 */
export function generatePreviewText(html: string, maxLength: number = 150): string {
  const plainText = convertHtmlToText(html)

  // Remove extra whitespace and newlines
  const cleaned = plainText
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n+/g, ' ') // Newlines to spaces
    .trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  // Truncate at last complete word before maxLength
  const truncated = cleaned.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    // If we're at least 80% of the way, use that space
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Count words in HTML content
 * Used for word count display in editor
 */
export function countWords(html: string): number {
  const plainText = convertHtmlToText(html)
  const words = plainText.trim().split(/\s+/)
  return words.filter((word) => word.length > 0).length
}

/**
 * Estimate reading time in minutes
 * Assumes 200 words per minute reading speed
 */
export function estimateReadingTime(html: string): number {
  const words = countWords(html)
  const minutes = Math.ceil(words / 200)
  return Math.max(1, minutes) // Minimum 1 minute
}
