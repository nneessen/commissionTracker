import {useDroppable} from '@dnd-kit/core'
import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {GripVertical, Trash2, Plus} from 'lucide-react'
import {cn} from '@/lib/utils'
import {Button} from '@/components/ui/button'
import type {EmailBlock} from '@/types/email.types'
import {HeaderBlock, TextBlock, ButtonBlock, DividerBlock, SpacerBlock, FooterBlock, ImageBlock, QuoteBlock, SocialBlock, ColumnsBlock} from './blocks'

interface BlockCanvasProps {
  blocks: EmailBlock[]
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onBlockChange: (block: EmailBlock) => void
  onBlockDelete: (id: string) => void
  isOver?: boolean
}

interface SortableBlockProps {
  block: EmailBlock
  isSelected: boolean
  onSelect: () => void
  onChange: (block: EmailBlock) => void
  onDelete: () => void
}

function SortableBlock({ block, isSelected, onSelect, onChange, onDelete }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const renderBlock = () => {
    const props = { block, isSelected, onChange }
    switch (block.type) {
      case 'header':
        return <HeaderBlock block={block} isEditing={isSelected} onChange={onChange} />
      case 'text':
        return <TextBlock block={block} isEditing={isSelected} onChange={onChange} />
      case 'button':
        return <ButtonBlock block={block} isEditing={isSelected} onChange={onChange} />
      case 'divider':
        return <DividerBlock block={block} isEditing={isSelected} onChange={onChange} />
      case 'spacer':
        return <SpacerBlock block={block} isEditing={isSelected} onChange={onChange} />
      case 'footer':
        return <FooterBlock block={block} isEditing={isSelected} onChange={onChange} />
      case 'image':
        return <ImageBlock {...props} />
      case 'quote':
        return <QuoteBlock {...props} />
      case 'social':
        return <SocialBlock {...props} />
      case 'columns':
        return <ColumnsBlock {...props} />
      default:
        return <div className="p-2 text-xs text-muted-foreground">Unknown block type</div>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative mx-6 rounded-md border transition-all',
        isSelected && 'border-primary ring-2 ring-primary/20',
        !isSelected && 'border-transparent hover:border-muted-foreground/30',
        isDragging && 'opacity-50'
      )}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab rounded p-1',
          'opacity-0 transition-opacity hover:bg-muted active:cursor-grabbing',
          'group-hover:opacity-100',
          isSelected && 'opacity-100'
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Delete button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'absolute -right-6 top-1/2 h-6 w-6 -translate-y-1/2',
          'opacity-0 transition-opacity',
          'hover:bg-destructive hover:text-destructive-foreground',
          'group-hover:opacity-100',
          isSelected && 'opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      {renderBlock()}
    </div>
  )
}

export function BlockCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onBlockChange,
  onBlockDelete,
  isOver,
}: BlockCanvasProps) {
  // Droppable zone for empty canvas or appending to end
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: 'canvas-drop-zone',
  })

  const handleCanvasClick = () => {
    onSelectBlock(null)
  }

  const showDropIndicator = isOver || isDroppableOver

  return (
    <div
      className="flex-1 overflow-y-auto bg-muted/20 p-4"
      onClick={handleCanvasClick}
    >
      <div
        ref={setNodeRef}
        className={cn(
          'mx-auto max-w-2xl min-h-[400px] rounded-lg border bg-background shadow-sm transition-colors',
          showDropIndicator && 'border-primary border-dashed bg-primary/5'
        )}
      >
        {blocks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Plus className="h-8 w-8 opacity-50" />
            <p className="text-sm">Drag blocks here or click to add</p>
            <p className="text-xs opacity-70">Start building your email template</p>
          </div>
        ) : (
          <div className="space-y-1 py-3">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onChange={onBlockChange}
                onDelete={() => onBlockDelete(block.id)}
              />
            ))}
            {/* Drop indicator at end */}
            {showDropIndicator && blocks.length > 0 && (
              <div className="mx-6 h-1 rounded bg-primary/50" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
