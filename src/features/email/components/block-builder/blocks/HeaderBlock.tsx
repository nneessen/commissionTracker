import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { EmailBlock, HeaderBlockContent } from '@/types/email.types'

interface HeaderBlockProps {
  block: EmailBlock
  isEditing: boolean
  onChange: (block: EmailBlock) => void
}

export function HeaderBlock({ block, isEditing, onChange }: HeaderBlockProps) {
  const content = block.content as HeaderBlockContent

  const updateContent = (updates: Partial<HeaderBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input
            value={content.title}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="Email Header Title"
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={content.showLogo ?? false}
            onCheckedChange={(checked) => updateContent({ showLogo: checked })}
          />
          <Label className="text-xs">Show Logo</Label>
        </div>
        {content.showLogo && (
          <div className="space-y-1">
            <Label className="text-xs">Logo URL</Label>
            <Input
              value={content.logoUrl ?? ''}
              onChange={(e) => updateContent({ logoUrl: e.target.value })}
              placeholder="https://..."
              className="h-8"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: block.styles.backgroundColor,
        textAlign: block.styles.alignment ?? 'center',
      }}
    >
      {content.showLogo && content.logoUrl && (
        <img
          src={content.logoUrl}
          alt="Logo"
          className="mx-auto mb-2 h-12 object-contain"
        />
      )}
      <h1
        className="text-xl font-bold"
        style={{
          color: block.styles.textColor,
          fontSize: block.styles.fontSize,
        }}
      >
        {content.title || 'Header Title'}
      </h1>
    </div>
  )
}

export function createDefaultHeaderBlock(id: string): EmailBlock {
  return {
    id,
    type: 'header',
    content: {
      type: 'header',
      title: 'Email Header',
      showLogo: false,
    } as HeaderBlockContent,
    styles: {
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      alignment: 'center',
      padding: '16px',
    },
  }
}
