// src/features/email/services/__tests__/sanitizationService.test.ts

import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeForEmail,
  stripHtml,
  containsDangerousContent,
} from '../sanitizationService'

describe('sanitizationService', () => {
  // ==========================================================================
  // Basic Functionality Tests
  // ==========================================================================
  describe('sanitizeHtml', () => {
    it('preserves safe HTML formatting', () => {
      const input = '<p>Hello <strong>world</strong></p>'
      const result = sanitizeHtml(input)
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
    })

    it('preserves links with safe href', () => {
      const input = '<a href="https://example.com">Link</a>'
      const result = sanitizeHtml(input)
      expect(result).toContain('href="https://example.com"')
    })

    it('preserves images with src', () => {
      const input = '<img src="https://example.com/image.jpg" alt="Test">'
      const result = sanitizeHtml(input)
      expect(result).toContain('src="https://example.com/image.jpg"')
      expect(result).toContain('alt="Test"')
    })
  })

  describe('sanitizeForEmail', () => {
    it('adds target and rel attributes to links', () => {
      const input = '<a href="https://example.com">Link</a>'
      const result = sanitizeForEmail(input)
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })

    it('preserves apostrophes in content', () => {
      const input = "<p>Don't worry, it's fine</p>"
      const result = sanitizeForEmail(input)
      expect(result).toContain("Don't")
      expect(result).toContain("it's")
    })
  })

  describe('stripHtml', () => {
    it('removes all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>'
      const result = stripHtml(input)
      expect(result).toBe('Hello world')
    })

    it('preserves text content', () => {
      const input = '<div><p>First</p><p>Second</p></div>'
      const result = stripHtml(input)
      expect(result).toContain('First')
      expect(result).toContain('Second')
    })
  })

  describe('containsDangerousContent', () => {
    it('returns true for script tags', () => {
      expect(containsDangerousContent('<script>alert(1)</script>')).toBe(true)
    })

    it('returns false for safe HTML', () => {
      expect(containsDangerousContent('<p>Safe content</p>')).toBe(false)
    })
  })

  // ==========================================================================
  // XSS Prevention Tests - Script Tags
  // ==========================================================================
  describe('XSS Prevention - Script Tags', () => {
    it('removes script tags', () => {
      const result = sanitizeForEmail('<script>alert("XSS")</script>')
      expect(result).not.toContain('<script')
      expect(result).not.toContain('alert')
    })

    it('removes script tags with attributes', () => {
      const result = sanitizeForEmail('<script src="evil.js"></script>')
      expect(result).not.toContain('<script')
      expect(result).not.toContain('evil.js')
    })

    it('removes nested script tags', () => {
      const result = sanitizeForEmail('<div><script>alert(1)</script></div>')
      expect(result).not.toContain('<script')
    })
  })

  // ==========================================================================
  // XSS Prevention Tests - Event Handlers
  // ==========================================================================
  describe('XSS Prevention - Event Handlers', () => {
    const eventHandlers = [
      'onclick',
      'onerror',
      'onload',
      'onmouseover',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'ondrag',
      'ondrop',
      'onkeydown',
      'onkeyup',
      'ontouchstart',
      'onpointerdown',
    ]

    eventHandlers.forEach((handler) => {
      it(`removes ${handler} event handler`, () => {
        const input = `<div ${handler}="alert('XSS')">Test</div>`
        const result = sanitizeForEmail(input)
        expect(result.toLowerCase()).not.toContain(handler)
      })
    })

    it('removes multiple event handlers on same element', () => {
      const input = '<img src="x" onerror="alert(1)" onload="alert(2)">'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('onerror')
      expect(result).not.toContain('onload')
    })

    it('handles case variations in event handlers', () => {
      const input = '<div ONCLICK="alert(1)" OnMouseOver="alert(2)">Test</div>'
      const result = sanitizeForEmail(input)
      expect(result.toLowerCase()).not.toContain('onclick')
      expect(result.toLowerCase()).not.toContain('onmouseover')
    })
  })

  // ==========================================================================
  // XSS Prevention Tests - JavaScript URLs
  // ==========================================================================
  describe('XSS Prevention - JavaScript URLs', () => {
    it('removes javascript: protocol from href', () => {
      const input = '<a href="javascript:alert(1)">Click me</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('javascript:')
    })

    it('removes javascript: with whitespace obfuscation', () => {
      const input = '<a href="java script:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('javascript')
    })

    it('removes javascript: with tab obfuscation', () => {
      const input = '<a href="java\tscript:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('javascript')
    })

    it('removes javascript: with newline obfuscation', () => {
      const input = '<a href="java\nscript:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('javascript')
    })

    it('removes javascript: with null byte obfuscation', () => {
      const input = '<a href="java\x00script:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('javascript')
    })

    it('removes vbscript: protocol', () => {
      const input = '<a href="vbscript:msgbox(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('vbscript')
    })

    it('removes data: protocol', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('data:')
    })

    it('allows https: protocol', () => {
      const input = '<a href="https://example.com">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).toContain('href="https://example.com"')
    })

    it('allows mailto: protocol', () => {
      const input = '<a href="mailto:test@example.com">Email</a>'
      const result = sanitizeForEmail(input)
      expect(result).toContain('href="mailto:test@example.com"')
    })

    it('allows tel: protocol', () => {
      const input = '<a href="tel:+1234567890">Call</a>'
      const result = sanitizeForEmail(input)
      expect(result).toContain('href="tel:+1234567890"')
    })
  })

  // ==========================================================================
  // XSS Prevention Tests - Dangerous Tags
  // ==========================================================================
  describe('XSS Prevention - Dangerous Tags', () => {
    const dangerousTags = [
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
      'svg',
      'math',
      'base',
      'meta',
      'link',
      'template',
      'audio',
      'video',
      'canvas',
    ]

    dangerousTags.forEach((tag) => {
      it(`removes <${tag}> tag`, () => {
        const input = `<${tag}>content</${tag}>`
        const result = sanitizeForEmail(input)
        expect(result).not.toContain(`<${tag}`)
      })
    })

    it('removes SVG with embedded script', () => {
      const input = '<svg><script>alert(1)</script></svg>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('<svg')
      expect(result).not.toContain('<script')
    })

    it('removes math with embedded xlink', () => {
      const input = '<math><maction xlink:href="javascript:alert(1)">click</maction></math>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('<math')
      expect(result).not.toContain('xlink')
    })
  })

  // ==========================================================================
  // XSS Prevention Tests - Attribute Injection
  // ==========================================================================
  describe('XSS Prevention - Attribute Injection', () => {
    it('removes formaction attribute', () => {
      const input = '<button formaction="javascript:alert(1)">Submit</button>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('formaction')
    })

    it('removes xlink:href attribute', () => {
      const input = '<a xlink:href="javascript:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('xlink:href')
    })

    it('removes style attribute with expression', () => {
      // Note: Modern browsers don't support expression() but it's still worth blocking
      const input = '<div style="background:url(javascript:alert(1))">Test</div>'
      const result = sanitizeForEmail(input)
      // Style is allowed but the dangerous URL should be blocked
      expect(result).not.toContain('javascript:')
    })
  })

  // ==========================================================================
  // XSS Prevention Tests - Encoding Attacks
  // ==========================================================================
  describe('XSS Prevention - Encoding Attacks', () => {
    it('handles HTML entity encoded javascript:', () => {
      // &#106; = j, &#97; = a, etc.
      const input = '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('alert')
    })

    it('handles hex encoded javascript:', () => {
      // &#x6A; = j
      const input = '<a href="&#x6A;avascript:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('alert')
    })

    it('handles mixed case javascript:', () => {
      const input = '<a href="JaVaScRiPt:alert(1)">Click</a>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('javascript')
      expect(result).not.toContain('JaVaScRiPt')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('handles empty input', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeForEmail('')).toBe('')
      expect(stripHtml('')).toBe('')
    })

    it('handles null-like strings', () => {
      const result = sanitizeForEmail('<p>null</p>')
      expect(result).toContain('null')
    })

    it('handles deeply nested content', () => {
      const input = '<div><div><div><p><strong><em>Deep</em></strong></p></div></div></div>'
      const result = sanitizeForEmail(input)
      expect(result).toContain('Deep')
    })

    it('handles malformed HTML', () => {
      const input = '<p>Unclosed <strong>tags'
      const result = sanitizeForEmail(input)
      expect(result).toContain('Unclosed')
      expect(result).toContain('tags')
    })

    it('handles HTML with comments', () => {
      const input = '<p>Before<!-- comment -->After</p>'
      const result = sanitizeForEmail(input)
      expect(result).not.toContain('<!--')
      expect(result).toContain('Before')
      expect(result).toContain('After')
    })

    it('handles very long content', () => {
      const longText = 'x'.repeat(100000)
      const input = `<p>${longText}</p>`
      const result = sanitizeForEmail(input)
      expect(result).toContain(longText)
    })
  })

  // ==========================================================================
  // Concurrent Call Safety Tests
  // ==========================================================================
  describe('Concurrent Call Safety', () => {
    it('handles concurrent sanitizeForEmail calls safely', async () => {
      const inputs = Array.from({ length: 50 }, (_, i) =>
        `<p>Test ${i}</p><script>alert(${i})</script>`
      )

      const results = await Promise.all(
        inputs.map(input => Promise.resolve(sanitizeForEmail(input)))
      )

      // All results should be properly sanitized
      results.forEach((result, i) => {
        expect(result).toContain(`Test ${i}`)
        expect(result).not.toContain('<script')
        expect(result).not.toContain('alert')
      })
    })

    it('handles mixed sanitizeHtml and sanitizeForEmail calls', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => {
        const input = `<a href="javascript:alert(${i})">Link ${i}</a>`
        return i % 2 === 0
          ? Promise.resolve(sanitizeHtml(input))
          : Promise.resolve(sanitizeForEmail(input))
      })

      const results = await Promise.all(operations)

      // All results should block javascript: URLs
      results.forEach((result) => {
        expect(result).not.toContain('javascript:')
      })
    })
  })
})
