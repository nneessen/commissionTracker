import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { EmailBlock, ButtonBlockContent, ButtonVariant } from '@/types/email.types'

interface ButtonBlockProps {
  block: EmailBlock
  isEditing: boolean
  onChange: (block: EmailBlock) => void
}

export function ButtonBlock({ block, isEditing, onChange }: ButtonBlockProps) {
  const content = block.content as ButtonBlockContent
  const variant = content.variant || 'solid'

  const updateContent = (updates: Partial<ButtonBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  const getButtonStyles = () => {
    const baseColor = content.buttonColor || '#3b82f6'
    const textColor = content.textColor || '#ffffff'

    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: baseColor,
          border: `2px solid ${baseColor}`,
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: baseColor,
          border: 'none',
        }
      default: // solid
        return {
          backgroundColor: baseColor,
          color: textColor,
          border: 'none',
        }
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2 p-2">
        <div className="space-y-0.5">
          <Label className="text-[10px]">Button Text</Label>
          <Input
            value={content.text}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Click Here"
            className="h-6 text-[10px]"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px]">URL</Label>
          <Input
            value={content.url}
            onChange={(e) => updateContent({ url: e.target.value })}
            placeholder="https://..."
            className="h-6 text-[10px]"
          />
        </div>

        {/* Variant selection */}
        <div className="space-y-0.5">
          <Label className="text-[10px]">Style</Label>
          <div className="flex gap-1">
            {(['solid', 'outline', 'ghost'] as ButtonVariant[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => updateContent({ variant: v })}
                className={`flex-1 rounded border px-2 py-1 text-[10px] capitalize ${
                  variant === v
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Full width toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="full-width"
            checked={content.fullWidth || false}
            onCheckedChange={(checked) => updateContent({ fullWidth: checked })}
          />
          <Label htmlFor="full-width" className="text-[10px]">
            Full Width
          </Label>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Button Color</Label>
            <div className="flex gap-1">
              <Input
                type="color"
                value={content.buttonColor ?? '#3b82f6'}
                onChange={(e) => updateContent({ buttonColor: e.target.value })}
                className="h-6 w-8 p-0.5"
              />
              <Input
                value={content.buttonColor ?? '#3b82f6'}
                onChange={(e) => updateContent({ buttonColor: e.target.value })}
                className="h-6 flex-1 text-[10px]"
              />
            </div>
          </div>
          {variant === 'solid' && (
            <div className="space-y-0.5">
              <Label className="text-[10px]">Text Color</Label>
              <div className="flex gap-1">
                <Input
                  type="color"
                  value={content.textColor ?? '#ffffff'}
                  onChange={(e) => updateContent({ textColor: e.target.value })}
                  className="h-6 w-8 p-0.5"
                />
                <Input
                  value={content.textColor ?? '#ffffff'}
                  onChange={(e) => updateContent({ textColor: e.target.value })}
                  className="h-6 flex-1 text-[10px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const buttonStyles = getButtonStyles()

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: block.styles.backgroundColor,
        textAlign: block.styles.alignment ?? 'center',
      }}
    >
      <a
        href={content.url || '#'}
        className="rounded-md px-6 py-2 font-medium no-underline"
        style={{
          display: content.fullWidth ? 'block' : 'inline-block',
          width: content.fullWidth ? '100%' : 'auto',
          textAlign: 'center',
          boxSizing: 'border-box',
          ...buttonStyles,
          borderRadius: block.styles.borderRadius ?? '6px',
        }}
      >
        {content.text || 'Click Here'}
      </a>
    </div>
  )
}

export function createDefaultButtonBlock(id: string): EmailBlock {
  return {
    id,
    type: 'button',
    content: {
      type: 'button',
      text: 'Click Here',
      url: '',
      buttonColor: '#3b82f6',
      textColor: '#ffffff',
      variant: 'solid',
      fullWidth: false,
    } as ButtonBlockContent,
    styles: {
      backgroundColor: 'transparent',
      alignment: 'center',
      padding: '16px',
      borderRadius: '6px',
    },
  }
}
