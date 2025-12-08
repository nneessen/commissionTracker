import { useState, useCallback, createContext, useContext, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Eye, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { EmailBlock, EmailBlockType } from '@/types/email.types'
import { BlockPalette } from './BlockPalette'
import { BlockCanvas } from './BlockCanvas'
import { BlockStylePanel } from './BlockStylePanel'
import { BlockPreview, blocksToHtml } from './BlockPreview'
import { VariableDropdown } from './VariableDropdown'
import {
  createDefaultHeaderBlock,
  createDefaultTextBlock,
  createDefaultButtonBlock,
  createDefaultDividerBlock,
  createDefaultSpacerBlock,
  createDefaultFooterBlock,
  createDefaultImageBlock,
  createDefaultQuoteBlock,
  createDefaultSocialBlock,
  createDefaultColumnsBlock,
} from './blocks'

// Context for variable insertion
interface BlockBuilderContextType {
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onInsertVariable: (variable: string) => void
  textEditorRef: React.RefObject<{ insertText: (text: string) => void } | null>
}

const BlockBuilderContext = createContext<BlockBuilderContextType | null>(null)

export function useBlockBuilderContext() {
  const context = useContext(BlockBuilderContext)
  if (!context) {
    throw new Error('useBlockBuilderContext must be used within EmailBlockBuilder')
  }
  return context
}

interface EmailBlockBuilderProps {
  blocks: EmailBlock[]
  onChange: (blocks: EmailBlock[]) => void
  previewVariables?: Record<string, string>
}

export function createBlockFromType(type: EmailBlockType): EmailBlock {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header':
      return createDefaultHeaderBlock(id)
    case 'text':
      return createDefaultTextBlock(id)
    case 'button':
      return createDefaultButtonBlock(id)
    case 'divider':
      return createDefaultDividerBlock(id)
    case 'spacer':
      return createDefaultSpacerBlock(id)
    case 'footer':
      return createDefaultFooterBlock(id)
    case 'image':
      return createDefaultImageBlock(id)
    case 'quote':
      return createDefaultQuoteBlock(id)
    case 'social':
      return createDefaultSocialBlock(id)
    case 'columns':
      return createDefaultColumnsBlock(id)
    default:
      throw new Error(`Unknown block type: ${type}`)
  }
}

export function EmailBlockBuilder({ blocks, onChange, previewVariables = {} }: EmailBlockBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const textEditorRef = useRef<{ insertText: (text: string) => void } | null>(null)

  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId) ?? null
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over) return

    const activeData = active.data.current

    // Handle palette drop (new block)
    if (activeData?.isFromPalette) {
      const newBlock = createBlockFromType(activeData.type as EmailBlockType)

      // If dropping on canvas-drop-zone (empty area or end)
      if (over.id === 'canvas-drop-zone') {
        onChange([...blocks, newBlock])
      } else {
        // Dropping on an existing block - insert after it
        const overIndex = blocks.findIndex((b) => b.id === over.id)
        if (overIndex >= 0) {
          const newBlocks = [...blocks]
          newBlocks.splice(overIndex + 1, 0, newBlock)
          onChange(newBlocks)
        } else {
          onChange([...blocks, newBlock])
        }
      }
      setSelectedBlockId(newBlock.id)
      return
    }

    // Handle reorder (existing block)
    if (active.id !== over.id && over.id !== 'canvas-drop-zone') {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(blocks, oldIndex, newIndex))
      }
    }
  }, [blocks, onChange])

  const handleBlockChange = useCallback((updatedBlock: EmailBlock) => {
    onChange(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)))
  }, [blocks, onChange])

  const handleBlockDelete = useCallback((id: string) => {
    onChange(blocks.filter((b) => b.id !== id))
    if (selectedBlockId === id) {
      setSelectedBlockId(null)
    }
  }, [blocks, onChange, selectedBlockId])

  const handleAddBlock = useCallback((type: EmailBlockType) => {
    const newBlock = createBlockFromType(type)
    onChange([...blocks, newBlock])
    setSelectedBlockId(newBlock.id)
  }, [blocks, onChange])

  const handleInsertVariable = useCallback((variable: string) => {
    // If we have a text editor ref, insert directly
    if (textEditorRef.current) {
      textEditorRef.current.insertText(variable)
    } else if (selectedBlock && selectedBlock.type === 'text') {
      // Fallback: append to content
      const content = selectedBlock.content as { type: 'text'; html: string }
      handleBlockChange({
        ...selectedBlock,
        content: {
          ...content,
          html: content.html.replace(/<\/p>$/, ` ${variable}</p>`),
        },
      })
    } else {
      // No block selected - copy to clipboard as last resort
      navigator.clipboard.writeText(variable)
    }
  }, [selectedBlock, handleBlockChange])

  // Get active block for drag overlay
  const activeBlock = activeId?.startsWith('palette-')
    ? null
    : blocks.find((b) => b.id === activeId)

  const activePaletteType = activeId?.startsWith('palette-')
    ? activeId.replace('palette-', '') as EmailBlockType
    : null

  return (
    <BlockBuilderContext.Provider
      value={{
        selectedBlockId,
        onSelectBlock: setSelectedBlockId,
        onInsertVariable: handleInsertVariable,
        textEditorRef,
      }}
    >
      <div className="flex h-full flex-col bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
            <Button
              variant={activeTab === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('edit')}
              className="h-7 gap-1.5 px-2.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs">Edit</span>
            </Button>
            <Button
              variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('preview')}
              className="h-7 gap-1.5 px-2.5"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">Preview</span>
            </Button>
          </div>
          <VariableDropdown
            onInsert={handleInsertVariable}
            disabled={activeTab === 'preview'}
          />
        </div>

        {/* Main content */}
        {activeTab === 'edit' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-1 overflow-hidden">
              <BlockPalette onAddBlock={handleAddBlock} />
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <BlockCanvas
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onBlockChange={handleBlockChange}
                  onBlockDelete={handleBlockDelete}
                  isOver={overId === 'canvas-drop-zone'}
                />
              </SortableContext>
              <BlockStylePanel
                block={selectedBlock}
                onChange={handleBlockChange}
              />
            </div>
            <DragOverlay>
              {(activeBlock || activePaletteType) && (
                <div className="rounded-md border bg-background px-3 py-2 shadow-lg">
                  <span className="text-xs font-medium capitalize">
                    {activeBlock?.type || activePaletteType} block
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <BlockPreview blocks={blocks} variables={previewVariables} />
        )}
      </div>
    </BlockBuilderContext.Provider>
  )
}

export { blocksToHtml }
