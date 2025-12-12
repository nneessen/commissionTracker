import {Slider} from '@/components/ui/slider'
import {Label} from '@/components/ui/label'
import type {EmailBlock, SpacerBlockContent} from '@/types/email.types'

interface SpacerBlockProps {
  block: EmailBlock
  isEditing: boolean
  onChange: (block: EmailBlock) => void
}

export function SpacerBlock({ block, isEditing, onChange }: SpacerBlockProps) {
  const content = block.content as SpacerBlockContent

  const updateContent = (updates: Partial<SpacerBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Height</Label>
          <span className="text-xs text-muted-foreground">{content.height}px</span>
        </div>
        <Slider
          value={[content.height]}
          onValueChange={([value]) => updateContent({ height: value })}
          min={8}
          max={100}
          step={4}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        height: content.height,
        backgroundColor: block.styles.backgroundColor || 'transparent',
      }}
      className="flex items-center justify-center"
    >
      <span className="text-[10px] text-muted-foreground/50">{content.height}px</span>
    </div>
  )
}

export function createDefaultSpacerBlock(id: string): EmailBlock {
  return {
    id,
    type: 'spacer',
    content: {
      type: 'spacer',
      height: 24,
    } as SpacerBlockContent,
    styles: {
      backgroundColor: 'transparent',
    },
  }
}
