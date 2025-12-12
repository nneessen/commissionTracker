import {useState} from 'react'
import {ImageIcon, Link, ExternalLink} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import type {EmailBlock, ImageBlockContent} from '@/types/email.types'

interface ImageBlockProps {
  block: EmailBlock
  isSelected: boolean
  onChange: (block: EmailBlock) => void
}

export function ImageBlock({ block, isSelected, onChange }: ImageBlockProps) {
  const content = block.content as ImageBlockContent
  const [showLinkOptions, setShowLinkOptions] = useState(!!content.linkUrl)

  const updateContent = (updates: Partial<ImageBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  const alignmentStyle = {
    left: 'flex justify-start',
    center: 'flex justify-center',
    right: 'flex justify-end',
  }[block.styles.alignment || 'center']

  return (
    <div
      className={alignmentStyle}
      style={{
        backgroundColor: block.styles.backgroundColor,
        padding: block.styles.padding || '16px',
      }}
    >
      {content.src ? (
        <img
          src={content.src}
          alt={content.alt || ''}
          style={{
            maxWidth: content.width ? `${content.width}%` : '100%',
            height: 'auto',
            borderRadius: block.styles.borderRadius,
          }}
          className="block"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 bg-muted/30">
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Add image URL</span>
          </div>
        </div>
      )}

      {isSelected && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full border-t bg-card p-2 shadow-lg">
          <div className="space-y-2">
            <div className="space-y-0.5">
              <Label className="text-[10px]">Image URL</Label>
              <Input
                value={content.src}
                onChange={(e) => updateContent({ src: e.target.value })}
                placeholder="https://..."
                className="h-6 text-[10px]"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Alt Text</Label>
              <Input
                value={content.alt}
                onChange={(e) => updateContent({ alt: e.target.value })}
                placeholder="Image description"
                className="h-6 text-[10px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="link-image"
                checked={showLinkOptions}
                onCheckedChange={(checked) => {
                  setShowLinkOptions(checked)
                  if (!checked) updateContent({ linkUrl: undefined })
                }}
              />
              <Label htmlFor="link-image" className="text-[10px]">
                <Link className="mr-1 inline h-3 w-3" />
                Link image
              </Label>
            </div>
            {showLinkOptions && (
              <div className="space-y-0.5">
                <Label className="text-[10px]">Link URL</Label>
                <div className="flex gap-1">
                  <Input
                    value={content.linkUrl || ''}
                    onChange={(e) => updateContent({ linkUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-6 flex-1 text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => updateContent({
                      linkTarget: content.linkTarget === '_blank' ? '_self' : '_blank'
                    })}
                    className={`flex h-6 w-6 items-center justify-center rounded border text-[10px] ${
                      content.linkTarget === '_blank'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border'
                    }`}
                    title={content.linkTarget === '_blank' ? 'Opens in new tab' : 'Opens in same tab'}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function createDefaultImageBlock(id: string): EmailBlock {
  return {
    id,
    type: 'image',
    content: {
      type: 'image',
      src: '',
      alt: '',
      width: 100,
    } as ImageBlockContent,
    styles: {
      padding: '16px',
      alignment: 'center',
    },
  }
}
