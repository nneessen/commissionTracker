import { useEffect, useImperativeHandle, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import type { EmailBlock, TextBlockContent } from '@/types/email.types'

interface TextBlockProps {
  block: EmailBlock
  isEditing: boolean
  onChange: (block: EmailBlock) => void
}

export function TextBlock({ block, isEditing, onChange }: TextBlockProps) {
  const content = block.content as TextBlockContent

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings for text blocks
      }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['paragraph'] }),
    ],
    content: content.html,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      onChange({
        ...block,
        content: { type: 'text', html: editor.getHTML() },
      })
    },
  })

  // Sync content when block changes externally or isEditing changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentContent = editor.getHTML()
      if (currentContent !== content.html) {
        editor.commands.setContent(content.html)
      }
      editor.setEditable(isEditing)
    }
  }, [editor, content.html, isEditing])

  // Method to insert text at cursor (for variable insertion)
  const insertText = useCallback((text: string) => {
    if (editor && !editor.isDestroyed) {
      editor.chain().focus().insertContent(text).run()
    }
  }, [editor])

  if (!isEditing) {
    return (
      <div
        className="prose prose-sm max-w-none p-3"
        style={{
          backgroundColor: block.styles.backgroundColor || 'transparent',
          color: block.styles.textColor || '#374151',
          textAlign: block.styles.alignment || 'left',
        }}
        dangerouslySetInnerHTML={{ __html: content.html || '<p>Click to edit text...</p>' }}
      />
    )
  }

  return (
    <div className="p-2">
      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-0.5 border-b pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor?.isActive('bold') && 'bg-muted')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor?.isActive('italic') && 'bg-muted')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor?.isActive('bulletList') && 'bg-muted')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor?.isActive({ textAlign: 'left' }) && 'bg-muted')}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor?.isActive({ textAlign: 'center' }) && 'bg-muted')}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor?.isActive({ textAlign: 'right' }) && 'bg-muted')}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      {/* Editor */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none',
          '[&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:rounded-md [&_.ProseMirror]:border [&_.ProseMirror]:border-input',
          '[&_.ProseMirror]:bg-background [&_.ProseMirror]:p-3',
          '[&_.ProseMirror:focus]:ring-2 [&_.ProseMirror:focus]:ring-ring/20'
        )}
      />
    </div>
  )
}

export function createDefaultTextBlock(id: string): EmailBlock {
  return {
    id,
    type: 'text',
    content: {
      type: 'text',
      html: '<p>Enter your text here...</p>',
    } as TextBlockContent,
    styles: {
      backgroundColor: 'transparent',
      textColor: '#374151',
      alignment: 'left',
      padding: '16px',
    },
  }
}
