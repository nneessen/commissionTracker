import {Quote} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import type {EmailBlock, QuoteBlockContent} from '@/types/email.types'

interface QuoteBlockProps {
  block: EmailBlock
  isSelected: boolean
  onChange: (block: EmailBlock) => void
}

export function QuoteBlock({ block, isSelected, onChange }: QuoteBlockProps) {
  const content = block.content as QuoteBlockContent
  const accentColor = content.accentColor || '#3b82f6'

  const updateContent = (updates: Partial<QuoteBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  return (
    <div
      style={{
        backgroundColor: block.styles.backgroundColor,
        padding: block.styles.padding || '16px',
      }}
    >
      <div
        className="relative"
        style={{
          borderLeft: `4px solid ${accentColor}`,
          backgroundColor: `${accentColor}10`,
          padding: '16px 16px 16px 20px',
          borderRadius: block.styles.borderRadius || '4px',
        }}
      >
        <Quote
          className="absolute -left-2 -top-2 h-6 w-6"
          style={{ color: accentColor }}
        />
        {isSelected ? (
          <div className="space-y-2">
            <Textarea
              value={content.text}
              onChange={(e) => updateContent({ text: e.target.value })}
              placeholder="Enter quote text..."
              className="min-h-[60px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              style={{
                color: block.styles.textColor || '#374151',
                fontStyle: 'italic',
              }}
            />
            <Input
              value={content.author || ''}
              onChange={(e) => updateContent({ author: e.target.value })}
              placeholder="— Author name (optional)"
              className="h-6 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
              style={{ color: block.styles.textColor || '#6b7280' }}
            />
          </div>
        ) : (
          <div>
            <p
              className="text-sm italic"
              style={{ color: block.styles.textColor || '#374151' }}
            >
              {content.text || 'Enter quote text...'}
            </p>
            {content.author && (
              <p
                className="mt-2 text-xs"
                style={{ color: block.styles.textColor || '#6b7280' }}
              >
                — {content.author}
              </p>
            )}
          </div>
        )}
      </div>

      {isSelected && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Accent Color</Label>
            <Input
              type="color"
              value={accentColor}
              onChange={(e) => updateContent({ accentColor: e.target.value })}
              className="h-5 w-8 p-0.5"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function createDefaultQuoteBlock(id: string): EmailBlock {
  return {
    id,
    type: 'quote',
    content: {
      type: 'quote',
      text: '',
      author: '',
      accentColor: '#3b82f6',
    } as QuoteBlockContent,
    styles: {
      padding: '16px',
      textColor: '#374151',
    },
  }
}
