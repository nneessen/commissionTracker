// src/features/email/services/sanitizationService.ts

import DOMPurify from 'dompurify'

/**
 * Sanitization service using DOMPurify to prevent XSS attacks
 * Provides different sanitization levels for different use cases
 */

/**
 * Standard HTML sanitization - allows most safe formatting
 * Use for template bodies, email content, user-generated HTML
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      'hr',
      'img',
      'span',
      'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
    // Prevent javascript: and data: URLs
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  })
}

/**
 * Strict email sanitization - more restrictive for email bodies
 * Use before sending emails via Gmail API
 * Removes potentially problematic tags that may not render well in email clients
 */
export function sanitizeForEmail(html: string): string {
  // Add hook to ensure links open in new tab and have noopener
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'blockquote',
      'img',
      'span',
      'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title', 'style'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'class'],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'h4',
      'h5',
      'h6',
      'code',
      'pre',
      'hr',
    ],
  })

  // Remove hook after sanitization to avoid affecting other calls
  DOMPurify.removeHook('afterSanitizeAttributes')

  return sanitized
}

/**
 * Strip all HTML tags - returns plain text only
 * Use for previews, character counting, or when HTML is not allowed
 */
export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Check if HTML contains potentially dangerous content
 * Returns true if sanitization removed anything
 */
export function containsDangerousContent(html: string): boolean {
  const sanitized = sanitizeHtml(html)
  return sanitized !== html
}
