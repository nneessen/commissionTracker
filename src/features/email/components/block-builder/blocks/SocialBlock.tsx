import {Facebook, Twitter, Instagram, Youtube, Mail} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import type {EmailBlock, SocialBlockContent, SocialLink, SocialPlatform} from '@/types/email.types'

interface SocialBlockProps {
  block: EmailBlock
  isSelected: boolean
  onChange: (block: EmailBlock) => void
}

const PLATFORM_ICONS: Record<SocialPlatform, React.ElementType> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  email: Mail,
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  email: '#6B7280',
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  email: 'Email',
}

export function SocialBlock({ block, isSelected, onChange }: SocialBlockProps) {
  const content = block.content as SocialBlockContent
  const iconSize = content.iconSize || 24
  const iconColor = content.iconColor || 'brand' // 'brand' uses platform colors

  const updateContent = (updates: Partial<SocialBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  const updateLink = (platform: SocialPlatform, updates: Partial<SocialLink>) => {
    const updatedLinks = content.links.map((link) =>
      link.platform === platform ? { ...link, ...updates } : link
    )
    updateContent({ links: updatedLinks })
  }

  const alignmentStyle = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[block.styles.alignment || 'center']

  const enabledLinks = content.links.filter((link) => link.enabled && link.url)

  return (
    <div
      style={{
        backgroundColor: block.styles.backgroundColor,
        padding: block.styles.padding || '16px',
      }}
    >
      <div className={`flex items-center gap-3 ${alignmentStyle}`}>
        {enabledLinks.length > 0 ? (
          enabledLinks.map((link) => {
            const Icon = PLATFORM_ICONS[link.platform]
            const color = iconColor === 'brand' ? PLATFORM_COLORS[link.platform] : iconColor
            return (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                style={{
                  width: iconSize + 12,
                  height: iconSize + 12,
                  backgroundColor: content.iconStyle === 'filled' ? color : 'transparent',
                  border: content.iconStyle === 'outline' ? `2px solid ${color}` : 'none',
                }}
              >
                <Icon
                  style={{
                    width: iconSize,
                    height: iconSize,
                    color: content.iconStyle === 'filled' ? '#fff' : color,
                  }}
                />
              </a>
            )
          })
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Facebook className="h-5 w-5" />
            <Twitter className="h-5 w-5" />
            <span className="ml-2">Enable social links below</span>
          </div>
        )}
      </div>

      {isSelected && (
        <div className="mt-3 space-y-2 border-t pt-2">
          <Label className="text-[10px] font-medium">Social Links</Label>
          <div className="space-y-1.5">
            {content.links.map((link) => {
              const Icon = PLATFORM_ICONS[link.platform]
              return (
                <div key={link.platform} className="flex items-center gap-2">
                  <Switch
                    checked={link.enabled}
                    onCheckedChange={(enabled) => updateLink(link.platform, { enabled })}
                    className="h-4 w-7"
                  />
                  <Icon className="h-3.5 w-3.5" style={{ color: PLATFORM_COLORS[link.platform] }} />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(link.platform, { url: e.target.value })}
                    placeholder={`${PLATFORM_LABELS[link.platform]} URL`}
                    className="h-6 flex-1 text-[10px]"
                    disabled={!link.enabled}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Label className="text-[10px]">Style</Label>
            <select
              value={content.iconStyle || 'filled'}
              onChange={(e) => updateContent({ iconStyle: e.target.value as 'filled' | 'outline' })}
              className="h-6 rounded border px-1 text-[10px]"
            >
              <option value="filled">Filled</option>
              <option value="outline">Outline</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'facebook', url: '', enabled: false },
  { platform: 'twitter', url: '', enabled: false },
  { platform: 'instagram', url: '', enabled: false },
  { platform: 'youtube', url: '', enabled: false },
  { platform: 'email', url: '', enabled: false },
]

export function createDefaultSocialBlock(id: string): EmailBlock {
  return {
    id,
    type: 'social',
    content: {
      type: 'social',
      links: [...DEFAULT_SOCIAL_LINKS],
      iconSize: 24,
      iconColor: 'brand',
      iconStyle: 'filled',
    } as SocialBlockContent,
    styles: {
      padding: '16px',
      alignment: 'center',
    },
  }
}
