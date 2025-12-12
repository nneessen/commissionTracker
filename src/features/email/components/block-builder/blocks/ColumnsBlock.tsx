import {Columns2, Columns3} from 'lucide-react'
import {Label} from '@/components/ui/label'
import type {EmailBlock, ColumnsBlockContent} from '@/types/email.types'

interface ColumnsBlockProps {
  block: EmailBlock
  isSelected: boolean
  onChange: (block: EmailBlock) => void
}

export function ColumnsBlock({ block, isSelected, onChange }: ColumnsBlockProps) {
  const content = block.content as ColumnsBlockContent
  const gap = content.gap || 16

  const updateContent = (updates: Partial<ColumnsBlockContent>) => {
    onChange({
      ...block,
      content: { ...content, ...updates },
    })
  }

  const setColumnCount = (count: 2 | 3) => {
    const newColumns = Array.from({ length: count }, (_, i) => ({
      blocks: content.columns[i]?.blocks || [],
    }))
    updateContent({ columnCount: count, columns: newColumns })
  }

  // For now, columns show as placeholders - nested block editing would require
  // a more complex implementation with recursive drag-and-drop
  return (
    <div
      style={{
        backgroundColor: block.styles.backgroundColor,
        padding: block.styles.padding || '16px',
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${content.columnCount}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {content.columns.map((column, index) => (
          <div
            key={index}
            className="min-h-[80px] rounded border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-2"
          >
            {column.blocks.length > 0 ? (
              <div className="space-y-1">
                {column.blocks.map((b, i) => (
                  <div
                    key={i}
                    className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground"
                  >
                    {b.type}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                Column {index + 1}
                <br />
                (drop blocks here)
              </div>
            )}
          </div>
        ))}
      </div>

      {isSelected && (
        <div className="mt-2 flex items-center gap-3 border-t pt-2">
          <Label className="text-[10px]">Columns</Label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setColumnCount(2)}
              className={`flex h-7 items-center gap-1 rounded border px-2 text-[10px] ${
                content.columnCount === 2
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              2
            </button>
            <button
              type="button"
              onClick={() => setColumnCount(3)}
              className={`flex h-7 items-center gap-1 rounded border px-2 text-[10px] ${
                content.columnCount === 3
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              3
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px]">Gap</Label>
            <select
              value={gap}
              onChange={(e) => updateContent({ gap: Number(e.target.value) })}
              className="h-6 rounded border px-1 text-[10px]"
            >
              <option value="8">8px</option>
              <option value="16">16px</option>
              <option value="24">24px</option>
              <option value="32">32px</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export function createDefaultColumnsBlock(id: string): EmailBlock {
  return {
    id,
    type: 'columns',
    content: {
      type: 'columns',
      columnCount: 2,
      columns: [{ blocks: [] }, { blocks: [] }],
      gap: 16,
    } as ColumnsBlockContent,
    styles: {
      padding: '16px',
    },
  }
}
