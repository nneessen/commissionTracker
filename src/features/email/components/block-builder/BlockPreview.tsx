import { useMemo } from 'react'
import type {
  EmailBlock,
  EmailBlockStyles,
  ImageBlockContent,
  QuoteBlockContent,
  SocialBlockContent,
  ColumnsBlockContent,
  ButtonBlockContent,
} from '@/types/email.types'

interface BlockPreviewProps {
  blocks: EmailBlock[]
  variables?: Record<string, string>
}

function getInlineStyles(styles: EmailBlockStyles): string {
  const parts: string[] = []
  if (styles.backgroundColor) parts.push(`background-color: ${styles.backgroundColor}`)
  if (styles.textColor) parts.push(`color: ${styles.textColor}`)
  if (styles.padding) parts.push(`padding: ${styles.padding}`)
  if (styles.alignment) parts.push(`text-align: ${styles.alignment}`)
  if (styles.fontSize) parts.push(`font-size: ${styles.fontSize}`)
  return parts.join('; ')
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

function renderBlockToHtml(block: EmailBlock, variables: Record<string, string>): string {
  const styles = getInlineStyles(block.styles)

  switch (block.type) {
    case 'header': {
      const content = block.content as { title: string; logoUrl?: string; showLogo?: boolean }
      const logoHtml = content.showLogo && content.logoUrl
        ? `<img src="${content.logoUrl}" alt="Logo" style="max-height: 48px; margin-bottom: 8px;" />`
        : ''
      return `
        <div style="${styles}">
          ${logoHtml}
          <h1 style="margin: 0; font-weight: bold;">${replaceVariables(content.title, variables)}</h1>
        </div>
      `
    }

    case 'text': {
      const content = block.content as { html: string }
      return `<div style="${styles}">${replaceVariables(content.html, variables)}</div>`
    }

    case 'button': {
      const content = block.content as ButtonBlockContent
      const isOutline = content.variant === 'outline'
      const isGhost = content.variant === 'ghost'
      const bgColor = isOutline || isGhost ? 'transparent' : (content.buttonColor || '#3b82f6')
      const textColor = isOutline ? (content.buttonColor || '#3b82f6') : (content.textColor || '#ffffff')
      const border = isOutline ? `2px solid ${content.buttonColor || '#3b82f6'}` : 'none'
      const buttonStyle = `
        display: ${content.fullWidth ? 'block' : 'inline-block'};
        width: ${content.fullWidth ? '100%' : 'auto'};
        padding: 12px 24px;
        background-color: ${bgColor};
        color: ${textColor};
        text-decoration: none;
        border: ${border};
        border-radius: ${block.styles.borderRadius || '6px'};
        font-weight: 500;
        text-align: center;
        box-sizing: border-box;
      `
      return `
        <div style="${styles}">
          <a href="${content.url || '#'}" style="${buttonStyle}">${replaceVariables(content.text, variables)}</a>
        </div>
      `
    }

    case 'divider': {
      const content = block.content as { color?: string; thickness?: number; style?: string }
      const hrStyle = `
        border: none;
        border-top: ${content.thickness || 1}px ${content.style || 'solid'} ${content.color || '#e5e7eb'};
        margin: 0 16px;
      `
      return `<div style="padding: 8px 0;"><hr style="${hrStyle}" /></div>`
    }

    case 'spacer': {
      const content = block.content as { height: number }
      return `<div style="height: ${content.height}px;"></div>`
    }

    case 'footer': {
      const content = block.content as { text: string; showUnsubscribe?: boolean }
      const unsubscribeHtml = content.showUnsubscribe
        ? `<br /><a href="#" style="color: ${block.styles.textColor || '#64748b'}; font-size: 12px;">Unsubscribe</a>`
        : ''
      return `
        <div style="${styles}; font-size: 12px;">
          <p style="margin: 0; white-space: pre-wrap;">${replaceVariables(content.text, variables)}</p>
          ${unsubscribeHtml}
        </div>
      `
    }

    case 'image': {
      const content = block.content as ImageBlockContent
      if (!content.src) return ''
      const imgStyle = `max-width: ${content.width || 100}%; height: auto; display: block;`
      const imgHtml = `<img src="${content.src}" alt="${content.alt || ''}" style="${imgStyle}" />`
      const wrappedImg = content.linkUrl
        ? `<a href="${content.linkUrl}" target="${content.linkTarget || '_blank'}">${imgHtml}</a>`
        : imgHtml
      return `<div style="${styles}">${wrappedImg}</div>`
    }

    case 'quote': {
      const content = block.content as QuoteBlockContent
      const accentColor = content.accentColor || '#3b82f6'
      const quoteStyle = `
        border-left: 4px solid ${accentColor};
        padding: 16px 16px 16px 20px;
        background-color: ${accentColor}10;
        border-radius: 4px;
        font-style: italic;
      `
      const authorHtml = content.author
        ? `<p style="margin-top: 8px; font-size: 12px; font-style: normal; color: #6b7280;">— ${content.author}</p>`
        : ''
      return `
        <div style="${styles}">
          <div style="${quoteStyle}">
            <p style="margin: 0;">${replaceVariables(content.text, variables)}</p>
            ${authorHtml}
          </div>
        </div>
      `
    }

    case 'social': {
      const content = block.content as SocialBlockContent
      const enabledLinks = content.links.filter(l => l.enabled && l.url)
      if (enabledLinks.length === 0) return ''

      const iconSize = content.iconSize || 24
      const socialColors: Record<string, string> = {
        facebook: '#1877F2',
        twitter: '#1DA1F2',
        linkedin: '#0A66C2',
        instagram: '#E4405F',
        youtube: '#FF0000',
        email: '#6B7280',
      }

      const iconsHtml = enabledLinks.map(link => {
        const color = socialColors[link.platform] || '#6B7280'
        const iconStyle = content.iconStyle === 'filled'
          ? `background-color: ${color}; color: white;`
          : `border: 2px solid ${color}; color: ${color};`
        return `<a href="${link.url}" target="_blank" style="display: inline-block; width: ${iconSize + 12}px; height: ${iconSize + 12}px; line-height: ${iconSize + 12}px; text-align: center; border-radius: 50%; margin: 0 4px; text-decoration: none; ${iconStyle}">${link.platform.charAt(0).toUpperCase()}</a>`
      }).join('')

      return `<div style="${styles}; text-align: ${block.styles.alignment || 'center'};">${iconsHtml}</div>`
    }

    case 'columns': {
      const content = block.content as ColumnsBlockContent
      const gap = content.gap || 16
      const columnWidth = content.columnCount === 2 ? '48%' : '31%'
      const columnsHtml = content.columns.map((col, i) => {
        const colContent = col.blocks.map(b => renderBlockToHtml(b, variables)).join('')
        return `<td style="width: ${columnWidth}; vertical-align: top; padding: 0 ${gap/2}px;">${colContent || '<p style="color: #9ca3af; font-size: 12px;">Column ${i + 1}</p>'}</td>`
      }).join('')
      return `
        <div style="${styles}">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>${columnsHtml}</tr>
          </table>
        </div>
      `
    }

    default:
      return ''
  }
}

export function blocksToHtml(blocks: EmailBlock[], variables: Record<string, string> = {}): string {
  const bodyContent = blocks.map((block) => renderBlockToHtml(block, variables)).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      color: #374151;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    p {
      margin: 0 0 1em 0;
    }
    p:last-child {
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${bodyContent}
  </div>
</body>
</html>
  `.trim()
}

export function BlockPreview({ blocks, variables = {} }: BlockPreviewProps) {
  const html = useMemo(() => blocksToHtml(blocks, variables), [blocks, variables])

  return (
    <div className="h-full overflow-auto bg-muted/30 p-4">
      <div className="mx-auto max-w-[600px] rounded border bg-white shadow-sm">
        <iframe
          title="Email Preview"
          srcDoc={html}
          className="h-[600px] w-full border-0"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}
