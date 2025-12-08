import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EmailBlock, DividerBlockContent } from '@/types/email.types'

interface DividerBlockProps {
  block: EmailBlock
  isEditing: boolean
  onChange: (block: EmailBlock) => void
}

export function DividerBlock({ block, isEditing, onChange }: DividerBlockProps) {
  const content = block.content as DividerBlockContent

  const updateContent = (updates: Partial<DividerBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1">
              <Input
                type="color"
                value={content.color ?? '#e5e7eb'}
                onChange={(e) => updateContent({ color: e.target.value })}
                className="h-8 w-12 p-1"
              />
              <Input
                value={content.color ?? '#e5e7eb'}
                onChange={(e) => updateContent({ color: e.target.value })}
                className="h-8 flex-1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Thickness (px)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={content.thickness ?? 1}
              onChange={(e) => updateContent({ thickness: parseInt(e.target.value) || 1 })}
              className="h-8"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Style</Label>
          <Select
            value={content.style ?? 'solid'}
            onValueChange={(value) => updateContent({ style: value as 'solid' | 'dashed' | 'dotted' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div
      className="py-4"
      style={{ backgroundColor: block.styles.backgroundColor }}
    >
      <hr
        style={{
          borderColor: content.color ?? '#e5e7eb',
          borderWidth: `${content.thickness ?? 1}px 0 0 0`,
          borderStyle: content.style ?? 'solid',
          margin: '0 16px',
        }}
      />
    </div>
  )
}

export function createDefaultDividerBlock(id: string): EmailBlock {
  return {
    id,
    type: 'divider',
    content: {
      type: 'divider',
      color: '#e5e7eb',
      thickness: 1,
      style: 'solid',
    } as DividerBlockContent,
    styles: {
      backgroundColor: 'transparent',
      padding: '8px',
    },
  }
}
