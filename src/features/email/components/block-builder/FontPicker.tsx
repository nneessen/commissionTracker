import { useState } from 'react'
import { Check, ChevronDown, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { EmailFontFamily, EmailFontWeight } from '@/types/email.types'
import { MODERN_EMAIL_FONTS } from '@/types/email.types'

interface FontPickerProps {
  value: EmailFontFamily | undefined
  onChange: (font: EmailFontFamily) => void
  weight?: EmailFontWeight
  onWeightChange?: (weight: EmailFontWeight) => void
  className?: string
}

export function FontPicker({
  value,
  onChange,
  weight,
  onWeightChange,
  className,
}: FontPickerProps) {
  const [open, setOpen] = useState(false)

  const selectedFont = MODERN_EMAIL_FONTS.find((f) => f.value === value)
  const displayLabel = selectedFont?.label || 'Select font'

  // Load Google Fonts for preview
  const googleFontsUrl = MODERN_EMAIL_FONTS
    .filter((f) => f.googleFont)
    .map((f) => `${f.googleFont}:wght@400;700`)
    .join('&family=')

  return (
    <>
      {/* Google Fonts preload */}
      <link
        href={`https://fonts.googleapis.com/css2?family=${googleFontsUrl}&display=swap`}
        rel="stylesheet"
      />

      <div className={cn('space-y-1.5', className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-8 w-full justify-between text-xs"
            >
              <span
                className="truncate"
                style={{ fontFamily: value || 'inherit' }}
              >
                {displayLabel}
              </span>
              <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <ScrollArea className="h-[280px]">
              <div className="p-1">
                {/* Sans-serif fonts */}
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  Sans-serif
                </div>
                {MODERN_EMAIL_FONTS.filter((f) => f.category === 'sans-serif').map(
                  (font) => (
                    <button
                      key={font.value}
                      onClick={() => {
                        onChange(font.value)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                        value === font.value && 'bg-accent'
                      )}
                    >
                      <div className="flex-1 text-left">
                        <span
                          className="block text-sm"
                          style={{ fontFamily: font.value }}
                        >
                          {font.label}
                        </span>
                        <span
                          className="block text-[10px] text-muted-foreground"
                          style={{ fontFamily: font.value }}
                        >
                          The quick brown fox
                        </span>
                      </div>
                      {value === font.value && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  )
                )}

                {/* Serif fonts */}
                <div className="mt-2 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  Serif
                </div>
                {MODERN_EMAIL_FONTS.filter((f) => f.category === 'serif').map(
                  (font) => (
                    <button
                      key={font.value}
                      onClick={() => {
                        onChange(font.value)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                        value === font.value && 'bg-accent'
                      )}
                    >
                      <div className="flex-1 text-left">
                        <span
                          className="block text-sm"
                          style={{ fontFamily: font.value }}
                        >
                          {font.label}
                        </span>
                        <span
                          className="block text-[10px] text-muted-foreground"
                          style={{ fontFamily: font.value }}
                        >
                          The quick brown fox
                        </span>
                      </div>
                      {value === font.value && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  )
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Font weight selector */}
        {onWeightChange && selectedFont && (
          <div className="flex gap-1">
            {selectedFont.weights.map((w) => (
              <button
                key={w}
                onClick={() => onWeightChange(w)}
                className={cn(
                  'flex-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                  weight === w
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                )}
                style={{
                  fontFamily: selectedFont.value,
                  fontWeight: w,
                }}
              >
                {w === 400 ? 'Regular' : w === 500 ? 'Medium' : w === 600 ? 'Semi' : 'Bold'}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
