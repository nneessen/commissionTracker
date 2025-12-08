import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Type,
  MousePointerClick,
  Minus,
  ArrowDownUp,
  FileText,
  Heading,
  Plus,
  Image,
  Quote,
  Share2,
  Columns2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { EmailBlockType } from '@/types/email.types'

interface BlockPaletteProps {
  onAddBlock: (type: EmailBlockType) => void
  disabled?: boolean
}

interface DraggableBlockProps {
  type: EmailBlockType
  label: string
  icon: React.ReactNode
  disabled?: boolean
  onAdd: () => void
}

function DraggableBlock({ type, label, icon, disabled, onAdd }: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, isFromPalette: true },
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1.5 rounded border border-border/50 bg-card px-1.5 py-1 transition-all',
        'hover:border-border hover:bg-muted/50',
        isDragging && 'opacity-50 shadow-lg',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {/* Draggable area */}
      <div
        {...listeners}
        {...attributes}
        className={cn(
          'flex flex-1 cursor-grab items-center gap-1.5 active:cursor-grabbing',
          disabled && 'cursor-not-allowed'
        )}
      >
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      {/* Click to add button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onAdd()
        }}
        disabled={disabled}
      >
        <Plus className="h-2.5 w-2.5" />
      </Button>
    </div>
  )
}

const BLOCK_DEFINITIONS: { type: EmailBlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'header', label: 'Header', icon: <Heading className="h-3 w-3 text-muted-foreground" /> },
  { type: 'text', label: 'Text', icon: <Type className="h-3 w-3 text-muted-foreground" /> },
  { type: 'image', label: 'Image', icon: <Image className="h-3 w-3 text-muted-foreground" /> },
  { type: 'button', label: 'Button', icon: <MousePointerClick className="h-3 w-3 text-muted-foreground" /> },
  { type: 'columns', label: 'Columns', icon: <Columns2 className="h-3 w-3 text-muted-foreground" /> },
  { type: 'quote', label: 'Quote', icon: <Quote className="h-3 w-3 text-muted-foreground" /> },
  { type: 'social', label: 'Social', icon: <Share2 className="h-3 w-3 text-muted-foreground" /> },
  { type: 'divider', label: 'Divider', icon: <Minus className="h-3 w-3 text-muted-foreground" /> },
  { type: 'spacer', label: 'Spacer', icon: <ArrowDownUp className="h-3 w-3 text-muted-foreground" /> },
  { type: 'footer', label: 'Footer', icon: <FileText className="h-3 w-3 text-muted-foreground" /> },
]

export function BlockPalette({ onAddBlock, disabled }: BlockPaletteProps) {
  return (
    <div className="flex w-[140px] shrink-0 flex-col border-r bg-muted/20">
      <div className="border-b px-2 py-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">Blocks</h3>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
        {BLOCK_DEFINITIONS.map((block) => (
          <DraggableBlock
            key={block.type}
            type={block.type}
            label={block.label}
            icon={block.icon}
            disabled={disabled}
            onAdd={() => onAddBlock(block.type)}
          />
        ))}
      </div>
      <div className="border-t px-2 py-1">
        <p className="text-[9px] text-muted-foreground">
          Drag or click +
        </p>
      </div>
    </div>
  )
}
