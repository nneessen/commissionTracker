// src/features/email/services/sanitizationService.ts

import DOMPurify from "dompurify";

/**
 * Sanitization service using DOMPurify to prevent XSS attacks
 * Provides different sanitization levels for different use cases
 *
 * SECURITY: This service is critical for preventing XSS and script injection.
 * All user-generated HTML content MUST pass through these sanitizers before:
 * - Being stored in the database
 * - Being sent in emails
 * - Being rendered in the UI
 */

// =============================================================================
// URL PROTOCOL ALLOWLIST
// =============================================================================
// SECURITY: Strict allowlist approach - only these protocols are permitted.
// This blocks javascript:, data:, vbscript:, and any obfuscated variants.
// Relative URLs starting with / or # are allowed for internal links.
const SAFE_URL_PATTERN = /^(?:https?:|mailto:|tel:|#|\/(?!\/)|$)/i;

// =============================================================================
// DANGEROUS ATTRIBUTES
// =============================================================================
// Comprehensive list of event handler attributes that could execute scripts
const DANGEROUS_EVENT_HANDLERS = [
  // Mouse events
  "onclick",
  "ondblclick",
  "onmousedown",
  "onmouseup",
  "onmouseover",
  "onmousemove",
  "onmouseout",
  "onmouseenter",
  "onmouseleave",
  "oncontextmenu",
  // Keyboard events
  "onkeydown",
  "onkeypress",
  "onkeyup",
  // Focus events
  "onfocus",
  "onblur",
  "onfocusin",
  "onfocusout",
  // Form events
  "onchange",
  "onsubmit",
  "onreset",
  "onselect",
  "oninput",
  "oninvalid",
  // Drag events
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  // Clipboard events
  "oncopy",
  "oncut",
  "onpaste",
  // Media events
  "onplay",
  "onpause",
  "onended",
  "onvolumechange",
  "onseeking",
  "onseeked",
  "ontimeupdate",
  "onloadeddata",
  "onloadedmetadata",
  "oncanplay",
  "oncanplaythrough",
  // Load/error events
  "onload",
  "onerror",
  "onabort",
  "onloadstart",
  "onprogress",
  // Scroll/resize events
  "onscroll",
  "onresize",
  // Touch events
  "ontouchstart",
  "ontouchmove",
  "ontouchend",
  "ontouchcancel",
  // Pointer events
  "onpointerdown",
  "onpointerup",
  "onpointermove",
  "onpointerenter",
  "onpointerleave",
  "onpointerover",
  "onpointerout",
  "onpointercancel",
  // Animation/transition events
  "onanimationstart",
  "onanimationend",
  "onanimationiteration",
  "ontransitionend",
  // Window/document events
  "onbeforeunload",
  "onunload",
  "onhashchange",
  "onpopstate",
  "onstorage",
  "onmessage",
  // Misc
  "onwheel",
  "onshow",
  "ontoggle",
] as const;

// URL-bearing attributes that could load external resources or execute code
const DANGEROUS_URL_ATTRIBUTES = [
  "formaction", // Form submission URL (can be javascript:)
  "xlink:href", // SVG links (can be javascript:)
  "action", // Form action URL
  "background", // Legacy background image URL
  "dynsrc", // Legacy IE video source
  "lowsrc", // Legacy low-res image source
  "poster", // Video poster (less dangerous but unnecessary)
] as const;

// Combined list for FORBID_ATTR
const ALL_DANGEROUS_ATTRIBUTES = [
  ...DANGEROUS_EVENT_HANDLERS,
  ...DANGEROUS_URL_ATTRIBUTES,
];

// =============================================================================
// DANGEROUS TAGS
// =============================================================================
const DANGEROUS_TAGS_STANDARD = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "base",
  "meta",
  "link",
  "template",
  "math",
  "svg",
] as const;

const DANGEROUS_TAGS_EMAIL = [
  ...DANGEROUS_TAGS_STANDARD,
  "button",
  "textarea",
  "select",
  "option",
  "h4",
  "h5",
  "h6",
  "code",
  "pre",
  "hr",
  "noscript",
  "audio",
  "video",
  "source",
  "track",
  "canvas",
] as const;

// =============================================================================
// DANGEROUS URL PATTERN FOR STYLE ATTRIBUTES
// =============================================================================
// Matches javascript:, vbscript:, data: in CSS url() values
const DANGEROUS_STYLE_PATTERN =
  /url\s*\(\s*["']?\s*(javascript|vbscript|data):/gi;

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Standard HTML sanitization - allows most safe formatting
 * Use for template bodies, email content, user-generated HTML in the UI
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
      "hr",
      "img",
      "span",
      "div",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "title",
      "class",
      "style",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: SAFE_URL_PATTERN,
    FORBID_ATTR: [...ALL_DANGEROUS_ATTRIBUTES],
    FORBID_TAGS: [...DANGEROUS_TAGS_STANDARD],
  });
}

/**
 * Sanitize style attribute values to remove dangerous URL patterns
 * SECURITY: Blocks javascript:, vbscript:, data: in CSS url() values
 */
function sanitizeStyleAttribute(style: string): string {
  return style.replace(DANGEROUS_STYLE_PATTERN, "url(about:blank");
}

/**
 * Post-process sanitized HTML to add email-specific attributes
 * and apply additional security transformations
 */
function postProcessForEmail(html: string): string {
  // Handle empty input
  if (!html || html.trim() === "") {
    return "";
  }

  // Use DOMParser to safely process the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = doc.body.firstChild as Element;

  if (!container) {
    return html;
  }

  // Process all anchor tags
  const links = container.querySelectorAll("a");
  links.forEach((link) => {
    // Add target and rel attributes
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");

    // Double-check href for dangerous protocols (catches obfuscation)
    const href = (link.getAttribute("href") || "").trim();
    // eslint-disable-next-line no-control-regex
    const normalizedHref = href.toLowerCase().replace(/[\x00-\x20]+/g, "");
    const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];

    if (dangerousProtocols.some((p) => normalizedHref.startsWith(p))) {
      link.removeAttribute("href");
    }
  });

  // Process all elements for remaining event handlers and dangerous styles
  const allElements = container.querySelectorAll("*");
  allElements.forEach((el) => {
    // Remove any remaining on* event handlers
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      const attrName = attr.name.toLowerCase();

      // Remove event handlers
      if (attrName.startsWith("on")) {
        el.removeAttribute(attr.name);
      }

      // Sanitize style attributes containing javascript: URLs
      if (attrName === "style" && attr.value) {
        const sanitizedStyle = sanitizeStyleAttribute(attr.value);
        if (sanitizedStyle !== attr.value) {
          el.setAttribute("style", sanitizedStyle);
        }
      }

      // Remove any attribute value containing javascript:
      if (attr.value && attr.value.toLowerCase().includes("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return container.innerHTML;
}

/**
 * Strict email sanitization - more restrictive for email bodies
 * Use before sending emails via Gmail API or Mailgun
 * Removes potentially problematic tags that may not render well in email clients
 *
 * SECURITY: This is the final sanitization before emails are sent.
 * It must be maximally restrictive to prevent any XSS or script injection.
 */
export function sanitizeForEmail(html: string): string {
  // Handle empty input
  if (!html || html.trim() === "") {
    return "";
  }

  // First pass: DOMPurify sanitization
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "blockquote",
      "img",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "style"],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: SAFE_URL_PATTERN,
    FORBID_ATTR: [...ALL_DANGEROUS_ATTRIBUTES, "class", "id", "name"],
    FORBID_TAGS: [...DANGEROUS_TAGS_EMAIL],
  });

  // Second pass: Post-processing for email-specific transformations
  return postProcessForEmail(sanitized);
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
  });
}

/**
 * Check if HTML contains potentially dangerous content
 * Returns true if sanitization removed anything
 */
export function containsDangerousContent(html: string): boolean {
  const sanitized = sanitizeHtml(html);
  return sanitized !== html;
}
