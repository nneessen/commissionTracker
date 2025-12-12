import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import type {EmailBlock, HeaderBlockContent} from '@/types/email.types'

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
      <div className="space-y-2 p-2">
        <div className="space-y-0.5">
          <Label className="text-[10px]">Title</Label>
          <Input
            value={content.title}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="Email Header Title"
            className="h-6 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            checked={content.showLogo ?? false}
            onCheckedChange={(checked) => updateContent({ showLogo: checked })}
            className="h-4 w-7"
          />
          <Label className="text-[10px]">Show Logo</Label>
        </div>
        {content.showLogo && (
          <div className="space-y-0.5">
            <Label className="text-[10px]">Logo URL</Label>
            <Input
              value={content.logoUrl ?? ''}
              onChange={(e) => updateContent({ logoUrl: e.target.value })}
              placeholder="https://..."
              className="h-6 text-xs"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="p-2"
      style={{
        backgroundColor: block.styles.backgroundColor,
        textAlign: block.styles.alignment ?? 'center',
        padding: block.styles.padding || '12px',
      }}
    >
      {content.showLogo && content.logoUrl && (
        <img
          src={content.logoUrl}
          alt="Logo"
          className="mx-auto mb-1.5 h-8 object-contain"
        />
      )}
      <h1
        className="font-semibold"
        style={{
          color: block.styles.textColor,
          fontSize: block.styles.fontSize || '16px',
          fontFamily: block.styles.fontFamily || 'inherit',
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
      padding: '12px',
      fontSize: '16px',
    },
  }
}
