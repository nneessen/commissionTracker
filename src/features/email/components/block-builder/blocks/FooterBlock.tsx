import {Textarea} from '@/components/ui/textarea'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import type {EmailBlock, FooterBlockContent} from '@/types/email.types'

interface FooterBlockProps {
  block: EmailBlock
  isEditing: boolean
  onChange: (block: EmailBlock) => void
}

export function FooterBlock({ block, isEditing, onChange }: FooterBlockProps) {
  const content = block.content as FooterBlockContent

  const updateContent = (updates: Partial<FooterBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Footer Text</Label>
          <Textarea
            value={content.text}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Company name, address, etc..."
            className="min-h-[60px] resize-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={content.showUnsubscribe ?? false}
            onCheckedChange={(checked) => updateContent({ showUnsubscribe: checked })}
          />
          <Label className="text-xs">Show Unsubscribe Link</Label>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: block.styles.backgroundColor ?? '#f8fafc',
        textAlign: block.styles.alignment ?? 'center',
      }}
    >
      <p
        className="text-xs whitespace-pre-wrap"
        style={{ color: block.styles.textColor ?? '#64748b' }}
      >
        {content.text || 'Footer text...'}
      </p>
      {content.showUnsubscribe && (
        <a
          href="#"
          className="mt-2 inline-block text-xs underline"
          style={{ color: block.styles.textColor ?? '#64748b' }}
        >
          Unsubscribe
        </a>
      )}
    </div>
  )
}

export function createDefaultFooterBlock(id: string): EmailBlock {
  return {
    id,
    type: 'footer',
    content: {
      type: 'footer',
      text: 'Your Company Name\n123 Main Street, City, State 12345',
      showUnsubscribe: true,
    } as FooterBlockContent,
    styles: {
      backgroundColor: '#f8fafc',
      textColor: '#64748b',
      alignment: 'center',
      padding: '16px',
    },
  }
}
